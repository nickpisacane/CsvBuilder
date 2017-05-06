const { Readable, Transform } = require('stream')
const pick = require('lodash.pick')
const get = require('lodash.get')

const deprecate = msg => console.warn(`CsvBuilder: ${msg}`)
const hasQuotes = str => /\"/.test(str)

class CsvBuilderObjectReadStream extends Readable {
  constructor (data) {
    super({ objectMode: true })
    this._data = data
    this._len = data.length
    this._index = 0
  }

  _read () {
    if (this._index >= this._len) return this.push(null)
    this.push(this._data[this._index++])
  }
}

class CsvBuilderTransformStream extends Transform {
  constructor (builder, options = {}) {
    super(options)
    this._builder = builder
    this._pushedHeaders = false
  }

  _makeError (msg) {
    return new Error(`CsvBuilderTransformStream: ${msg}`)
  }

  _transform (chunk, encoding, callback) {
    if (Buffer.isBuffer(chunk)) {
      chunk = chunk.toString()
    }

    let data
    if (typeof chunk === 'string') {
      try {
        data = JSON.parse(chunk)
      } catch (err) {
        return callback(this._makeError('Failed to parse JSON.'))
      }
    } else {
      data = chunk
    }

    if (typeof data !== 'object') {
      return callback(this._makeError(
        `Received "${typeof data}" from stream. Expected Object.`
      ))
    }

    if (!this._pushedHeaders)  {
      this.push(this._builder.row(this._builder._headers))
      this._pushedHeaders = true
    }

    this.push(this._builder.row(chunk))
    callback()
  }
}

class CsvBuilder {
  constructor (options) {
    this.format = Object.assign({
      delimiter: ',',
      terminator: '\n',
      quoted: true
    }, pick(options, ['delimiter', 'terminator']))

    if (options.hasOwnProperty('constraints')) {
      deprecate(`"constraints" is deprecated, please use "alias"`)
    }

    this._alias = options.alias || options.contraints || {}
    this._virtuals = {}
    this._headers = []
    if (options.headers) this.headers(options.headers)
  }

  headers (headers) {
    this._headers = typeof headers === 'string' ? headers.split(' ') : headers
    return this
  }

  set (header, prop) {
    deprecate(`"set()" is deprecated. Please use "alias()".`)
    return this.alias(header, prop)
  }

  alias (header, prop) {
    if (typeof header === 'object') {
      return Object.assign(this._alias, header)
    }
    this._alias[header] = prop
    return this
  }

  virtual (prop, fn) {
    this._virtuals[prop] = fn
    return this
  }

  row (arr) {
    const parts = !Array.isArray(arr) ? this._buildRowArray(arr) : arr
    return `${parts.join(this.format.delimiter)}${this.format.terminator}`
  }

  createReadStream (data) {
    return new CsvBuilderObjectReadStream(data)
      .pipe(this.createTransformStream())
  }

  createTransformStream (streamOptions = { objectMode: true }) {
    return new CsvBuilderTransformStream(this, streamOptions)
  }

  _buildRowArray (obj) {
    return this._headers.map(header => {
      let col = get(obj, this._alias[header] || header, '')

      if (this._virtuals.hasOwnProperty(header)) {
        col = this._virtuals[header](obj)
      }
      if (this.format.quoted && hasQuotes(col)) {
        col = col.replace(/\"/g, '""')
      }
      if (this.format.quoted) {
        col = `"${col}"`
      }

      return col
    })
  }
}

module.exports = CsvBuilder
