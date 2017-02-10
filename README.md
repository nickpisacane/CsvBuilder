# Csvbuilder
![travis](https://travis-ci.org/nickpisacane/CsvBuilder.svg?branch=master)

Create csv formated streams from Arrays of Objects. CsvBuilder is one of many Csv stream/generator implementations
on npm. The goal of CsvBuilder is to create Schema's for csv output and let the consumer spawn as many streams
as needed from a single instance to maintain a specific format. This means the user gets control of the headers, the
order of the headers, how the headers correspond to consumed objects, virtual properties, value delimiters, and line
terminators.

## Getting Started
```js

var CsvBuilder = require('csv-builder');

// Assuming data takes the following form
var data = [
	name: 'Example User',
	email: 'example@gmail.com',
	meta: {
		active: true
	}
]

var usersBuilder = new CsvBuilder({
	// define headers and order of headers
	headers: 'Firstname Lastname Email Active',
	// define object to header correspondance
	constraints: {
		// Header: property
		'Email': 'email'
		// correspond with a virtual property
		'Lastname': 'lastname',
		// Access a nested property
		'Active': 'meta.active'
	}
})
	// create virtual 'Firstname'
	.virtual('Firstname', function(obj) {
		return obj.name.split(' ')[0];
	})
	// virtual properties are treated like any propery,
	// if it is not defined in the headers, it still needs a constraint
	.virtual('lastname', function(obj) {
		return obj.name.split(' ')[1];
	});

// From the `usersBuilder` instance we can now spawn readable or tranform streams.

// pipe into a newly created duplex
Model.find().stream()
	.pipe(usersBuilder.createTransformStream())
	.pipe(fs.createWriteStream('output.csv'));

// Create a readable stream from an Array<Object> payload
usersBuilder.createReadStream(payload)
	.pipe(fs.createWriteStream('output.csv'));
```

## Installation
```bash
$ npm install csv-builder
```

## Usage
##### CsvBuilder([options])
* headers String|Array Space separated headers, or array of headers **(required)**
* delimiter String The value delimiter. Default ','
* terminator String The line terminator. Default '\n'
* mutate Boolean Mutate incoming objects when creating virtuals. Default true
* constraints Object {"header": "prop"}

## Methods
##### CsvBuilder#headers(headers)
* headers String|Array Space separated headers, or array of headers

##### CsvBuilder#set(header, prop)
Set single or multiple contraints. If `header` is an object, it will extend any existing constraints, not replace.
* header String|Object Either object {"header": "property"} Or a string "Header"
* prop String Property to correspond to header, omit if using object.

##### CsvBuilder#virtual(prop, fn)
Create a virtual property. Virtual properties are treated the same as normal
properties, so if no header matches the virtual property name, or no constraint is
set the virtual property will be omitted.
* prop String Virtual property name
* fn Function Returns virtual value, takes the object to be created/mutated as the only argument.

##### CsvBuilder#createReadStream(payload)
Create's a readable stream and consumes the payload.
* payload Array<Object>

##### CsvBuilder#createTransformStream()
Create's a transform stream. The stream expects either Objects or JSON.
