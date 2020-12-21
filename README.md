# Fuusor API Client
Third party Fuusor API client. Fuusor website: https://www.fuusor.fi/

## Installation

Install from npm:

```
npm install fuusor-api-client
```

## Setup

### Import to NodeJS project

```javascript
const FuusorApiClient = require('fuusor-api-client').FuusorApiClient;
```

### Import to TypeScript project

```javascript
import { FuusorApiClient } from 'fuusor-api-client';
```

### Setup client with options

Please consult Fuusor Oy to get your `clientId`, `clientSecret`, `username` and `password` for API usage.

```javascript
const fuusorApiClient = new FuusorApiClient({
  clientId: 'api-client-id-from-fuusor',
  clientSecret: 'api-client-secret-from-fuusor',
  username: 'environment-username-from-fuusor',
  password: 'environment-password-from-fuusor',
}
```

## Datasets

### fuusorApiClient.createDataSet: Create dataset instance

```javascript
const dataSet = await fuusorApiClient.createDataSet(dataSetOptions);
```

Used to create new dataset instance for updating data in Fuusor database.

**required**:

* `groupId` Company specific identifier from Company Management
* `datasetName` Dataset name shown in Company Management
* `datasetId` Dataset identifier shown in Company Management (use same id to update old dataset)
* `datasetType` Short type identifier, for example: invoices or offers

**optional**:

* `begin` and `end` With large datasets you can only update data on certain timeframe between begin and end
* `primarydate` When updating dataset based on date, use primarydate to define which property contains primary date in data
* `periods` Array of periods (financial year term selections, defaults to calendar year)

```javascript
const dataSet = await fuusorApiClient.createDataSet({
  groupId: 'abc1234-1234-abcd-abcd-abcdabcdabcd',
  datasetName: 'Invoices',
  datasetId: 'invoices',
  datasetType: 'invoices',

  begin: '2020-01-01',
  end: '2020-12-31',
  primarydate: 'invoice_date',
  periods: [
    { 
      begin: '2019-01-01',
      end: '2019-12-31'
    },
    {
      begin: '2020-01-01',
      end: '2020-12-31'
    }
  ]
});
```

### dataSet.defineField: Define dataset fields

```javascript
dataSet.defineField(type, id, name, items?);
```

Shorthands:

```javascript
dataSet.defineDimensionField(id, name, items);
dataSet.defineDateField(id, name);
dataSet.defineValueField(id, name);
dataSet.defineDescriptionField(id, name);
```

Each dataset is dynamically constructed, so you have to define data type for each field (property in object).

At the moment of writing, Fuusor has 4 different data types that are listed below:

* `dimension` Dataset dimensions used to filter data
* `date` Dataset date fields
* `value` Numeric value fields (for example hours, euros etc.)
* `description` Textual description fields for data row

Definition properties are as listed below:

* `id` Field property name in row objects
* `name` Field display name in Fuusor

For dimension field you will also define `items` (that are shown in filtering). Please see example.

**Examples**

```javascript
// Define dimension field
dataSet.defineDimensionField('costcenter', 'Cost center', [
  { id: 'SK123', name: 'Production' },
  { id: 'SK124', name: 'Sales' }
]);

// Define date field
dataSet.defineDateField('project_date', 'Project date');

// Define value field
dataSet.defineValueField('hours', 'Project hours');

// Define description field
dataSet.defineDescriptionField('work_description', 'Project work description');
```

### dataSet.defineField: Define dataset fields
