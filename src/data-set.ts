import { FuusorApiClient } from ".";

export interface IFuusorDataSetOptions {
  groupId: string;
  datasetId: string;
  datasetName: string;
  datasetType: string;
  
  begin?: string;
  end?: string;
  primaryDate?: string;
  periods?: IFuusorDataSetPeriod[];
}

export interface IFuusorDimensionFieldItem {
  id: string;
  name: string;
}

export interface IFuusorDimensionField {
  id: string;
  name: string;
  items: IFuusorDimensionFieldItem[];
}

export interface IFuusorDateField {
  id: string;
  name: string;
}

export interface IFuusorValueField {
  id: string;
  name: string;
}

export interface IFuusorDescriptionField {
  id: string;
  name: string;
}

export interface IFuusorDataSetRow {
  [propertyName: string]: string | number | null;
}

export interface IFuusorDataSetData {
  dimensionFields: IFuusorDimensionField[];
  dateFields: IFuusorDateField[];
  valueFields: IFuusorValueField[];
  descriptionFields: IFuusorDescriptionField[];
  rows: IFuusorDataSetRow[];

  // Allow optional fields for future functionality
  [propName: string]: any;
}

export interface IFuusorDataSetPeriod {
  begin: string;
  end: string;
}

export type IFuusorFieldType = 'dimension' | 'date' | 'value' | 'description';

export class FuusorDataSet {
  fuusorApiClient: FuusorApiClient;
  datasetOptions: IFuusorDataSetOptions;
  datasetData: IFuusorDataSetData = {
    dimensionFields: [],
    dateFields: [],
    descriptionFields: [],
    valueFields: [],
    rows: []
  };

  constructor(fuusorApiClient: FuusorApiClient, datasetOptions: IFuusorDataSetOptions) {
    if ( ! fuusorApiClient) {
      throw new Error('Missing fuusorApiClient');
    }

    if ( ! datasetOptions.groupId) {
      throw new Error('Missing datasetOptions.groupId');
    }

    if ( ! datasetOptions.datasetId) {
      throw new Error('Missing datasetOptions.datasetId');
    }

    if ( ! datasetOptions.datasetName) {
      throw new Error('Missing datasetOptions.datasetName');
    }

    if ( ! datasetOptions.datasetType) {
      throw new Error('Missing datasetOptions.datasetType');
    }

    if ( ! datasetOptions.end && datasetOptions.begin) {
      throw new Error('Missing datasetOptions.end although datasetOptions.begin is set');
    }

    if ( ! datasetOptions.begin && datasetOptions.end) {
      throw new Error('Missing datasetOptions.begin although datasetOptions.end is set');
    }

    if (datasetOptions.begin && datasetOptions.end) {
      if ( ! datasetOptions.begin?.match(/^\d{4}-\d{2}-\d{2}$/)) {
        throw new Error('Incorrect datasetOptions.begin format, use YYYY-MM-DD');
      }
  
      if ( ! datasetOptions.end?.match(/^\d{4}-\d{2}-\d{2}$/)) {
        throw new Error('Incorrect datasetOptions.end format, use YYYY-MM-DD');
      }  
    }

    if ( ! datasetOptions.primaryDate && datasetOptions.begin) {
      throw new Error('Missing datasetOptions.primaryDate (required when begin and end is set)');
    }

    this.datasetOptions = datasetOptions;
    this.fuusorApiClient = fuusorApiClient;

    // Set (optional) periods if defined in options
    if ( datasetOptions.periods) {
      this.setPeriods(datasetOptions.periods);
    }
  }

  _validateDate(date: string) {
    return date.match(/^\d{4}-\d{2}-\d{2}$/);
  }

  /**
   * Optional: Define financial year periods. If not defined, periods from January to December is used.
   * @param periods Array of `begin` and `end` dates in YYYY-MM-DD format
   */

  setPeriods(periods: Array<IFuusorDataSetPeriod>) : FuusorDataSet {
    this.datasetOptions.periods = periods.map((period: IFuusorDataSetPeriod) => {
      if ( ! this._validateDate(period.begin || '')) {
        throw new Error(`Incorrect period.begin format: "${period.begin}", use YYYY-MM-DD`);
      }

      if ( ! this._validateDate(period.end || '')) {
        throw new Error(`Incorrect period.end format: "${period.end}", use YYYY-MM-DD`);
      }

      return {
        begin : period.begin,
        end : period.end
      }
    });
    
    return this;
  }

  /**
   * Defines each field of data rows for reporting.
   * @param fieldType Must be one of `dimension`, `date`, `value`, `description`
   * @param id Field name in data set row object
   * @param name Field display name
   * @param items Define items for `dimension` fields (array of `id` and `name` pairs), used as automatic filters in reports
   */

  defineField(fieldType: IFuusorFieldType, id: string, name: string, items?: IFuusorDimensionFieldItem[]) : FuusorDataSet {
    switch (fieldType) {
      case 'dimension':
        this.defineDimensionField(id, name, items || []);
        break;
      case 'date':
        this.defineDateField(id, name);
        break;
      case 'value':
        this.defineValueField(id, name);
        break;
      case 'description':
        this.defineDescriptionField(id, name);
        break;
      default:
        throw new Error(`Unknown fieldType for defineField: ${fieldType}`);
    }

    return this;
  }

  /**
   * Defines dimension field
   */

  defineDimensionField(id: string, name: string, items: IFuusorDimensionFieldItem[]) {
    this.datasetData.dimensionFields.push({ id, name, items });
  }

  /**
   * Defines date field 
   */

  defineDateField(id: string, name: string) {
    this.datasetData.dateFields.push({ id, name });
  }

  /**
   * Defines value field 
   */

  defineValueField(id: string, name: string) {
    this.datasetData.valueFields.push({ id, name });
  }

  /**
   * Defines description field 
   */

  defineDescriptionField(id: string, name: string) {
    this.datasetData.descriptionFields.push({ id, name });
  }

  /**
   * Add data set row
   */

  addRow(row: IFuusorDataSetRow) {
    const newRow : any = {};

    for (const property in row) {
      if (row.hasOwnProperty(property)) {
        const value = row[property];
       
        if (typeof value !== 'string' && typeof value !== 'number' && value !== null) {
          throw new Error(`Incorrect row value for ${property}: ${value}`);
        }

        newRow[property] = value;
      }
    }

    this.datasetData.rows.push(newRow);
  }

  /**
   * Add multiple data set rows
   */

  addRows(rows: IFuusorDataSetRow[]) {
    for (const row of rows) {
      this.addRow(row);
    }
  }

  validate() : void {
    const valueFields = this.datasetData.valueFields.map((field: IFuusorValueField) => field.id);
    const dateFields = this.datasetData.dateFields.map((field: IFuusorDateField) => field.id);

    for (const row of this.datasetData.rows) {
      for (const property in row) {
        if (row.hasOwnProperty(property)) {
          const value = row[property];

          if (valueFields.includes(property)) {
            if (typeof value !== 'number' && value !== null) {
              throw new Error(`Value field expecting number value. Incorrect row value for ${property}: ${value}`);
            }
          } else if (dateFields.includes(property)) {
            if (!value?.toString().match(/^\d{4}-\d{2}-\d{2}$/)) {
              throw new Error(`Date field expecting YYYY-MM-DD formatted value. Incorrect row value for ${property}: ${value}`);
            }
          } else if (typeof value !== 'string' && value !== null) {
            throw new Error(`Expecting string value. Incorrect row value for ${property}: ${value}`);
          }
        }
      }
    }
  }

  /**
   * Save data set to Fuusor
   */

  async save() : Promise<void> {
    this.validate();

    const accessToken = await this.fuusorApiClient.fetchAccessTokenForDataSetUpload();  

    await this.fuusorApiClient.saveDataSet(accessToken, { ...this.datasetOptions, ...this.datasetData });
  }
}