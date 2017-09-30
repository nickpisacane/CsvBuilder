# Csvbuilder
![travis](https://travis-ci.org/nickpisacane/CsvBuilder.svg?branch=master)

Easily encode complex JSON objects to CSV with CsvBuilder's schema-like API.

# Table Of Contents
* [Usage](#usage)
* [New Features](#new-features)
* [Installation](#installation)
* [API](#api)
* [Migration To 1.0.0](#migration-to-100)

# Usage
```js

const CsvBuilder = require('csv-builder')

const data = [
  {
    name: 'Foo Bar',
    meta: {
      active: true,
      roles: [
        'user',
        'admin'
      ]
    }
  }
]

const builder = new CsvBuilder({
  headers: ['Firstname', 'Lastname', 'Role 1', 'Role 2', 'Active'],
  alias: {
    'Role 1': 'meta.roles[0]',
    'Role 2': 'meta.roles[1]',
    'Active': 'meta.active'
  }
})
  .virtual('Firstname', user => user.name.split(' ')[0])
  .virtual('Lastname', user => user.name.split(' ')[1])

/* Each of the following produces the following CSV contents:

"Firstname","Lastname","Role 1","Role 2","Active"
"Foo","Bar","user","admin","true"

*/


// (1) Create from a Stream of objects (like a database)
getObjectStream()
  .pipe(builder.createTransformStream())
  .pipe(fs.createWriteStream('output.csv'))

// (2) Create from an existing payload (`data` is an array of objects)
builder.createReadStream(data)
  .pipe(fs.createWriteStream('output.csv'))

// (3) Roll your own
let csv = ''
csv += builder.getHeaders()
data.forEach(item => {
  csv += builder.getRow(item)
})
fs.writeFileSync('output.csv', csv)
```

# Installation
```bash
$ npm i -s csv-builder
# or
$ yarn add csv-builder
```

# New Features
* More cohesive API
* Expanded API to support non-stream outputs, i.e. building a CSV string row-by-row with the `getHeaders()` and `getRow(object)` methods respectively.
* Better CSV encoding (proper quoting by default)

# API
##### CsvBuilder([options])
* `headers` *String|Array<String>* Space separated headers, or array of headers **(required)**
* `delimiter` *String* The column delimiter. Default `','`
* `terminator` *String* The row terminator. Default `'\n'`
* `quoted` *Boolean* Quote columns? Default `true`
* `alias` *Object* An object in the format of { "csv header": "object prop" }, `object prop` will be aliased to `csv header`. Default `{}`

## Methods

##### CsvBuilder#`createReadStream`(payload): *Stream.Readable*
Creates a readable stream and consumes the payload.
* `payload` *Array\<Object\>* Incoming data.

##### CsvBuilder#`createTransformStream`(): *Stream.Transform*
Creates a transform stream. The stream expects either Objects or JSON.

##### CsvBuilder#`headers`(headers): *this*
* `headers` *String|Array* Space separated headers, or array of headers

##### CsvBuilder#`alias`(header, prop): *this*
Set single or multiple contraints. If `header` is an object, it will extend any existing constraints, not replace.
* `header` *String|Object* Either object {"header": "property"} Or a string "Header"
* `prop` *String|undefined* Property to correspond to header, omit if using object.

##### CsvBuilder#`virtual`(prop, fn): *this*
Create a virtual property. Virtual properties are treated the same as normal
properties. If there is no corresponding header or alias, the virtual will not be present in resulting CSV.
* `prop` *String* Virtual property name
* `fn` *(item: any) => any* Where `item` is an element from the incoming data, and the return value is the corresponding value for the virtualized property.

##### CsvBuilder#`getHeaders`(): *String*
The headers in CSV format

##### CsvBuilder#`getRow`(item): *String*
Returns the CSV formated row for a given `item`.
*  `item` *Object* A n item matching the "schema".

# Migration to 1.0.0
* `constraints` attribute in options (for constructor) is deprecated, use `alias` instead.
* `set(prop, value)` method is deprecated, use `alias(prop, value)` instead.