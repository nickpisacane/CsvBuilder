/**
 * Module Dependencies
 */

var CsvBuilder = require('../lib/csvBuilder');
var fs = require('fs');
var assert = require('assert');
var Stream = require('stream');

// test data
var testData = require('./data.json');
// expected csv value
var expected = fs.readFileSync('./expected.csv');

// test instance
var Test = new CsvBuilder({
  headers: 'Firstname Lastname Age Email',
  constraints: {
    'Age': 'age',
    'Email': 'email'
  }
}).virtual('Firstname', function(obj) {
  return obj.name.split(' ')[0];
}).virtual('Lastname', function(obj) {
  return obj.name.split(' ')[1];
});

describe('CsvBuilder', function() {

  // readable stream
  it('should create a readable stream from an array of objects', function(done) {
    var all = [];
    Test.createReadStream(testData)
      .on('data', function(data) {
        all.push(data.toString());
      })
      .on('end', function() {
        assert.equal(all.join(''), expected);
        done();
      });
  });

  // object transform stream
  it('should create a transform stream and transform incoming objects to rows', function(done) {
    var all = [];
    var stream = new Stream.Readable({
      objectMode: true
    });
    stream._read = function() {};
    testData.forEach(function(obj) {
      stream.push(obj);
    });
    stream.push(null);
    stream.pipe(Test.createTransformStream())
      .on('data', function(data) {
        all.push(data.toString());
      })
      .on('end', function() {
        assert.equal(all.join(''), expected);
        done();
      });
  });

  // json stream
  it('should transform stream of JSON objects', function(done) {
    var all = [];
    var stream = new Stream.Readable;
    stream._read = function() {};
    testData.forEach(function(obj) {
      stream.push(JSON.stringify(obj));
    });
    stream.push(null);
    stream.pipe(Test.createTransformStream())
      .on('data', function(data) {
        all.push(data.toString());
      })
      .on('end', function() {
        assert.equal(all.join(''), expected);
        done();
      });
  });

});
