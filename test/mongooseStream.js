var mongoose = require('mongoose');
var CsvBuilder = require('../lib/csvBuilder');
var fs = require('fs');
var db = mongoose.connect('mongodb://localhost/csvtest');

var TestModel = new mongoose.Schema({
  name: {
    type: String
  },
  age: {
    type: Number
  }
});

mongoose.model('users', TestModel);
var Test = mongoose.model('users');

var TestCsv = new CsvBuilder({
  headers: 'Name Age',
  constraints: {
    'Name': 'name',
    'Age': 'age'
  }
});


function main() {
  var i = 0;
  Test.find().stream().pipe(TestCsv.createTransformStream()).pipe(fs.createWriteStream('__test.csv'));
}
main();
