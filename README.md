# Fuusor API Client

Third party Fuusor API client. Fuusor website: https://www.fuusor.fi/

:warning: This tool is in early stages and is subject to change.

## Installation

Install from npm:

```
npm install @rantalainen/fuusor-api-client
```

## Setup

### Import to NodeJS project

```javascript
const { FuusorApiClient } = require('@rantalainen/fuusor-api-client');
```

### Import to TypeScript project

```javascript
import { FuusorApiClient } from '@rantalainen/fuusor-api-client';
```

### Setup client with options

Please consult Fuusor Oy to get your `clientId`, `clientSecret`, `username` and `password` for API usage.

```javascript
const fuusorApiClient = new FuusorApiClient({
  clientId: 'api-client-id-from-fuusor',
  clientSecret: 'api-client-secret-from-fuusor',
  username: 'environment-username-from-fuusor',
  password: 'environment-password-from-fuusor',

  // Optional: change timeout
  timeout: 60000
}
```

### Changing timeout on the fly

Default timeout implemented in 1.0.0 is 120 seconds for Fuusor API requests. You can change it in initialization or before saving dataset:

```javascript
// Change timeout on the fly:
fuusorApiClient.options.timeout = 60000;
```

## Datasets

### fuusorApiClient.createDataSet: Create dataset instance

```javascript
const dataSet = fuusorApiClient.createDataSet(dataSetOptions);
```

Used to create new dataset instance for updating data in Fuusor database.

**required**:

- `groupId` Company specific identifier from Company Management
- `datasetName` Dataset name shown in Company Management
- `datasetId` Dataset identifier shown in Company Management (use same id to update old dataset)
- `datasetType` Short type identifier, for example: invoices or offers

**optional**:

- `begin` and `end` With large datasets you can only update data on certain timeframe between begin and end
- `primarydate` When updating dataset based on date, use primarydate to define which property contains primary date in data
- `periods` Array of periods (financial year term selections, defaults to calendar year)
- `updateById` If only certain rows should be updated, define the field name that contains unique id

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
  ],

  updateById: 'customer'
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

- `dimension` Dataset dimensions used to filter data
- `date` Dataset date fields
- `value` Numeric value fields (for example hours, euros etc.)
- `description` Textual description fields for data row

Definition properties are as listed below:

- `id` Field property name in row objects
- `name` Field display name in Fuusor

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

### dataSet.pushDimensionFieldDimension: Add dimension item to dimension field

```javascript
dataSet.pushDimensionFieldDimension(dimensionId, item, options?);
```

Add dimension items to earlier defined dimension field by dimension id.

**Examples**

```javascript
dataSet.pushDimensionFieldDimension('costcenter', {
  id: 'SK125',
  name: 'Accounting'
});

// Option to allow empty dimensions when programmatically adding new dimensions to dataset
dataSet.pushDimensionFieldDimension(
  'customer',
  {
    id: null, // unknown in dataset row
    name: null // unknown in dataset row
  },
  { allowEmptyDimension: true }
);
```

### dataSet.defineDimensionHierarchy: Define dataset dimension hierarchies

```javascript
dataSet.defineDimensionHierarchy(id, name, dimensionId, items?);
```

This method is used to define dataset dimension hierarchies. When defining dimension hierarchy, the referenced dimension id must exist in dataset.

Definition properties are as listed below:

- `id` Dimension hierarchy id
- `name` Dimension hierarchy name
- `dimensionId` Referenced dimension id

**Examples**

```javascript
// Define dimension hierarchy, 'customer' must be defined as dimension
dataSet.defineDimensionHierarchy('customer_category', 'Customer category', 'customer');
```

### dataSet.pushDimensionHierarchyItem: Add items to defined hierarchy

```javascript
dataSet.pushDimensionHierarchyItem(hierarchyId, hierarchyItem);
```

This method is used to define dataset dimension hierarchy items. When defining hierarchy items, the referenced dimension hierarchy id must exist in dataset.

Definition properties are as listed below:

- `hierarchyId` Hierarchy item id
- `hierarchyItem` Hierarchy item (see examples)

**Examples**

```javascript
// Defined customer_category hierarchy in previous example
dataSet.defineDimensionHierarchy('customer_category', 'Customer category', 'customer');

// Add items to hierarchy

dataSet.pushDimensionHierarchyItem('customer_category', {
  id: 333, // actual category id
  name: 'Production customers', // actual category name
  items: [111, 222, 333] // actual customer ids in this category
});

dataSet.pushDimensionHierarchyItem('customer_category', {
  id: 444,
  name: 'Prospects',
  items: [777, 888]
});
```

### dataSet.addRow(s): Add data rows to dataset

```javascript
// Add one row
dataSet.addRow(data);

// Add multiple rows
dataSet.addRows(data[]);
```

Add rows to dataset. Each row property field must be defined with _dataSet.defineField_

**Examples**

```javascript
dataSet.addRow({
  project_date: '2020-12-01',
  work_description: 'My great project',
  hours: 10,
  costcenter: 'SK123'
});
```

### dataSet.save: Save dataset to Fuusor via API

```javascript
await dataSet.save();
```

Saves dataset to Fuusor. Returns promise.

### Full dataset example (JS)

```javascript
import { FuusorApiClient } from 'fuusor-api-client';

const fuusorApiClient = new FuusorApiClient({
  clientId: 'api-client-id-from-fuusor',
  clientSecret: 'api-client-secret-from-fuusor',
  username: 'environment-username-from-fuusor',
  password: 'environment-password-from-fuusor',
}

const dataSet = fuusorApiClient.createDataSet({
  groupId: 'abc1234-1234-abcd-abcd-abcdabcdabcd',
  datasetName: 'Invoices',
  datasetId: 'invoices',
  datasetType: 'invoices',

  // define begin, end and primarydate or updatebyid field
  begin: '2020-01-01',
  end: '2020-01-31',
  primarydate: 'invoice_date',

  // if we want to update only certain rows, we must define updateById field
  updateById: 'customer'
});

dataSet.defineDateField('invoice_date', 'Invoice date');
dataSet.defineValueField('total', 'Invoice total');

dataSet.defineDimensionField('customer', 'Customer name');
dataSet.pushDimensionFieldDimension('customer', { id: 1, name: 'Customer 1 Oy' });
dataSet.pushDimensionFieldDimension('customer', { id: 2, name: 'Customer 2 Oy' });

dataSet.defineDimensionField('costcenter', 'Branch', [
  { id: 'branch1', name: 'Branch 1' },
  { id: 'branch2', name: 'Branch 2' }
]);

dataSet.defineDimensionHierarchy('customer_category', 'Customer category', 'customer');

dataSet.pushDimensionHierarchyItem('customer_category', {
  id: 5,
  name: 'Category 5',
  items: [1]
});

dataSet.pushDimensionHierarchyItem('customer_category', {
  id: 6,
  name: 'Category 6',
  items: [2]
});

dataSet.pushDimensionFieldDimension('costcenter', {
  id: 'branch3', name: 'Branch 3'
});

dataSet.addRows([
  { invoice_date: '2020-01-05', total: 150.00, customer: 1, costcenter: 'branch1', category_id: 5 },
  { invoice_date: '2020-01-06', total: 120.24, customer: 2, costcenter: 'branch2', category_id: 6 }
]);

await dataSet.save();
```

## Users

### fuusorApiClient.users.getAll()

Gets all user accounts.

```javascript
const users = await fuusorApiClient.users.getAll();
```

Example response

```
[
  {
    userName: 'user@example.com',
    authenticationType: null,
    language: 'fi-FI',
    validUntil: '2022-02-28'
  }
]
```

### fuusorApiClient.users.create(user)

Creates a new user account.

**required**:

- `user.userName` Email used for login

**optional**:

- `user.authenticationType` Authentication type. Valid values: `microsoft`, `google`, `activationlink`. Default is `microsoft`.
- `user.language` Default UI language for user. Valid values: `fi-FI`, `en-US`. Default is `fi-FI`.
- `user.validUntil` Optional expiration date for account.

```javascript
await fuusorApiClient.users.create({
  userName: 'user@example.com',
  authenticationType: 'microsoft',
  language: 'fi-FI',
  validUntil: '2022-02-28'
});
```

If `activationlink` is used as an authentication type, the request will respond with the activation code (as a string) that is used to activate the account.

```js
const activationCode = await fuusorApiClient.users.create({
  userName: 'user@example.com',
  authenticationType: 'activationlink',
  language: 'fi-FI'
});
```

### fuusorApiClient.users.delete(userName)

Deletes user account.

**required**:

- `userName` Email used for login

```javascript
await fuusorApiClient.users.delete('user@example.com');
```

## User groups

### fuusorApiClient.userGroups.getAll()

Gets all user groups.

```javascript
const groups = await fuusorApiClient.userGroups.getAll();
```

Example response

```
[
  {
    id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    name: 'Example group',
    description: 'Example description',
    users: ['user@example.com']
  }
]
```

### fuusorApiClient.userGroups.addUsers(id, users)

Adds users to the user group.

**required**:

- `id` User group id
- `users` Array of user emails

```javascript
await fuusorApiClient.userGroups.addUsers('3fa85f64-5717-4562-b3fc-2c963f66afa6', ['user@example.com']);
```

### fuusorApiClient.userGroups.removeUsers(id, users)

Removes users from the user group.

**required**:

- `id` User group id
- `users` Array of user emails

```javascript
await fuusorApiClient.userGroups.removeUsers('3fa85f64-5717-4562-b3fc-2c963f66afa6', ['user@example.com']);
```

## Changelog

- 0.1.0 Add support for dimension hierarchies
- 0.1.1 Add backwards compatible support for dataset endpoint (instead of fileupload)
- 1.0.0 Add timeout option
- 1.0.1 Scope @rantalainen/fuusor-api-client
- 1.1.0 Add support for User and User Group API endpoints
- 1.1.1 Add support for new authentication type when creating new users
- 1.1.2 Add support for user expiration date
- 1.1.3 Better logging in case of invalid hierarchy items or dimension items
- 1.2.0 pushDimensionFieldDimension option to allow empty dimensions
