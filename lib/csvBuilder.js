/**
 * Module Dependencies
 */

var _ = require('lodash');
var through = require('through');
var Readable = require('stream').Readable;

/**
 * Expose
 */

module.exports = CsvBuilder;


/**
 * Build Csv Formatted data from arrays
 * @param {Object} [options] Set the default delimiters and line terminator
 * @param {Object} [options.delimiter = ','] Set the value delimiter.
 * @param {String} [options.terminator = '\n'] Set the line terminator for each row.
 * @param {String|Array} options.headers Define csv Headers, either a string of space separated values, or array of values,
 *                                         in the desired order.
 * @param {Object} [options.constraints] A correspondance between Headers and Object property names, in the format of {"Header": "property"}
 * @param {Boolean} [options.mutate = true] If true CsvBuilder will mutate object recieved directly when setting vitual properties, if false
 *                                          the instance will clone every incoming object before setting virtuals.
 */

function CsvBuilder(options) {
  if (!(this instanceof CsvBuilder)) return new CsvBuilder(options);
  options = options || {};

  this.format = _.assign({
    delimiter: ',',
    terminator: '\n'
  }, _.pick(options, ['delimiter', 'terminator']));
  this._constraints = options.constraints || {};
  this._virtuals = {};
  this._mutate = options.mutate || true;
  if (options.headers) this.headers(options.headers);
}

/**
 * Explicitly define the csv headers
 * @param {String|Array} headers Space separated words that correspond to the final headers
 * @return {CsvBuilder} this
 */

CsvBuilder.prototype.headers = function(headers) {
  if (_.isString(headers)) headers = headers.split(' ');
  if (!_.isArray(headers)) throw new TypeError('Bad Arguments, expected String or Array');
  this._headers = headers;
  return this;
};

/**
 * Set a correspondence between object properties and headers
 * @param {String|Object} prop If prop is of String type you must include the
 *                             header parameter, where `prop` is a property of the 
 *                             consumed data, and header is a corresponding csv header
 *                             If `prop` is an object its the same format for all properties
 *                             { "header": "property"}
 * @param {String} [header]    Corresponding header value.
 * @return {CsvBuilder} this
 */

CsvBuilder.prototype.set = function(header, prop) {
  if (_.isPlainObject(header)) {
    this._constraints = _.assign(this._constraints, header);
  } else if (_.isString(header) && _.isString(prop)) {
    this._constraints[header] = prop;
  } else {
    throw new TypeError('Bad Arguments: `header` must be String or Object, `prop` must be String');
  }
  return this;
};

/**
 * Set a virtual property. Virtual properties are treated like normal properties if there is no correspondance set 
 * or the property name does not match a `header` it will not be used.
 * @param {String} prop Property name for the virtual value
 * @param {Function} fn Function to take the current object as an argument and return virtual value
 * @return {CsvBuilder} this
 */

CsvBuilder.prototype.virtual = function(prop, fn) {
  if (!_.isString(prop) || !_.isFunction(fn)) throw new TypeError('Bad Arguments: `prop` must be String, `fn` must be Function');
  this._virtuals[prop] = fn;
  return this;
};

/**
 * Create a transforming stream. Transforms either JSON payload or Object payload
 * to a csv row.
 * @return {Stream} Readable/Writeable transform stream
 */

CsvBuilder.prototype.createTransformStream = function() {
  var self = this;
  var started = false;
  var stream = through(write, end);
  return stream;

  // write handler
  function write(data) {
    if (!started) {
      this.queue(self._makeRow(self._headers));
      started = true;
    }

    if (data instanceof Buffer) {
      data = data.toString();
    }

    if (_.isString(data)) {
      try {
        data = JSON.parse(data);
      } catch (e) {
        this.emit('error', error());
        return;
      }
    }

    if (!_.isObject(data)) {
      this.emit('error', error());
      return
    }
    this.queue(self._makeRow(data));
  }

  // end handler
  function end() {
    this.queue(null);
  }

  function error() {
    return new Error('Transform stream expects JSON object or Plain Object')
  }
};

/**
 * Create a readable stream from an Array payload. The readable stream
 * consumes the array and pushes each new csv row to the stream.
 * @param {Array<Object>} data Array of objects to be consumed
 * @return {Stream} Readable
 */

CsvBuilder.prototype.createReadStream = function(data) {
  if (!_.isArray(data)) throw new TypeError('readable expects data of type Array<Object>');
  var self = this;
  var i = 0;
  var dlen = data.length;
  var ref;
  var stream = new Readable;

  stream._read = function() {
    ref = data[i];
    if (i >= dlen) {
      stream.push(null);
      return;
    }
    // push headers first
    if (i === 0) stream.push(self._makeRow(self._headers));
    if (!_.isPlainObject(ref)) {
      stream.emit('error', new Error('Readable stream expected Object recieved ' + typeof ref));
      return;
    }
    stream.push(self._makeRow(data[i]));
    i++;
  };
  return stream;
};

/**
 * Build an array from Object
 * @param {Object} obj 
 * @return {Array}
 */

CsvBuilder.prototype._buildRowArray = function(obj) {
  var _constraints = this._constraints;
  var _headers = this._headers;
  var _virtuals = this._virtuals;
  var hlen = _headers.length;
  var row = new Array(hlen);
  if (!this._mutate && _.keys(obj).length) {
    obj = _.clone(obj);
  }
  for (var prop in _virtuals) {
    obj[prop] = _virtuals[prop](obj);
  }
  for (var i = 0; i < hlen; i++) {
    row[i] = _.get(obj, (_constraints[_headers[i]] || _headers[i]), '');
  }
  return row;
};

/**
 * Turns an array into a csv row with the correct delimiter and line terminator
 * @param {Array|Object} arr Array of values, if Object calls `_buildRowArray` on the object
 * @return {String} Csv row
 * @api private
 */

CsvBuilder.prototype._makeRow = function(arr) {
  if (!_.isArray(arr)) arr = this._buildRowArray(arr);
  return arr.join(this.format.delimiter) + this.format.terminator;
};
