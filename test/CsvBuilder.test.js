const { Readable } = require('stream')
const { expect } = require('chai')
const CsvBuilder = require('../lib/CsvBuilder')

class ArrayReadStream extends Readable {
  constructor (options, data) {
    super(options)
    this._index = 0
    this._data = data
  }

  _read () {
    const item = this._index < this._data.length
      ? this._data[this._index++]
      : null
    this.push(item)
  }
}

const collect = stream => new Promise((resolve, reject) => {
  let buf = ''
  stream
    .on('data', chunk => { buf += chunk })
    .on('error', reject)
    .on('end', () => resolve(buf))
})

describe('CsvBuilder', () => {
  describe('Encoding', () => {
    const builder = new CsvBuilder({
      headers: 'foo bar bang'
    })

    const data = {
      foo: 'foo "bar" bang',
      bar: 'bang,baz',
      bang: 42
    }

    it('quotes by default', () => {
      const row = builder.getRow(data)
      expect(row).to.equal(`"foo ""bar"" bang","bang,baz","42"\n`)
    })

    it('does not quote, when "quoted" = false', () => {
      const _builder = new CsvBuilder({
        headers: 'foo bar bang',
        quoted: false
      })
      const row = _builder.getRow(data)
      expect(row).to.equal(`foo "bar" bang,bang,baz,42\n`)
    })

    it('delimter/terminator options', () => {
      const _builder = new CsvBuilder({
        headers: 'foo bar bang',
        delimiter: '\t',
        terminator: '\r\n'
      })
      const row = _builder.getRow(data)
      expect(row).to.equal(`"foo ""bar"" bang"\t"bang,baz"\t"42"\r\n`)
    })

    it('virtuals', () => {
      const _builder = new CsvBuilder({
        headers: 'foo bar bang baz',
        virtuals: {
          baz: () => 'bazz'
        }
      })
        .virtual('foo', data => `${data.foo}|${data.bang}`)

      const row = _builder.getRow(data)
      expect(row).to.equal(`"foo ""bar"" bang|42","bang,baz","42","bazz"\n`)
    })

    it('manual encoding', () => {
      const builder = new CsvBuilder({
        headers: 'foo bar'
      })
      const data = [
        {
          foo: '42',
          bar: 'bang'
        },
        {
          foo: '43',
          bar: 'baz'
        }
      ]

      let csv = builder.getHeaders()
      data.forEach(item => {
        csv += builder.getRow(item)
      })
      expect(csv).to.equal(`"foo","bar"\n"42","bang"\n"43","baz"\n`)
    })
  })

  describe('Streaming', () => {
    const builder = new CsvBuilder({
      headers: 'foo bar bang'
    })

    const data = [
      {
        foo: '"bar"',
        bar: 'bang,baz',
        bang: 42
      },
      {
        foo: 'bang',
        bar: 'bang,"baz"',
        bang: 21
      },
      {
        foo: 0,
        bar: void 0,
        bang: null
      }
    ]
    const dataJSON = data.map(item => JSON.stringify(item))
    const expected = [
      `"foo","bar","bang"\n`,
      `"""bar""","bang,baz","42"\n`,
      `"bang","bang,""baz""","21"\n`,
      `"0","",""\n`
    ].join('')

    it('transform stream (Object Mode)', () => {
      const stream = new ArrayReadStream({ objectMode: true }, data)
      return collect(stream.pipe(builder.createTransformStream()))
        .then(results => {
          expect(results).to.equal(expected)
        })
    })

    it('transform stream (JSON)', () => {
      const stream = new ArrayReadStream({}, dataJSON)
      return collect(stream.pipe(builder.createTransformStream()))
        .then(results => {
          expect(results).to.equal(expected)
        })
    })

    it('creates read streams from data', () => {
      return collect(builder.createReadStream(data))
        .then(results => {
          expect(results).to.equal(expected)
        })
    })
  })

  describe('Complex', () => {
    const builder = new CsvBuilder({
      headers: [
        'First Name',
        'Last Name',
        'Age',
        'Bio',
        'Tags',
        'Likes',
        'Primary Role',
        'Is "active"?'
      ],
      alias: {
        'First Name': 'firstname',
        'Last Name': 'lastname',
        'Age': 'age',
        'Bio': 'bio',
        'Tags': 'tags',
        'Likes': 'likes',
        'Primary Role': 'meta.roles[0]',
        'Is "active"?': 'meta.active'
      }
    })
      .virtual('First Name', user => user.name.split(' ')[0])
      .virtual('Last Name', user => user.name.split(' ')[1])
      .virtual('Tags', user => user.tags.join(','))

    const data = [
      {
        'name': 'User One',
        'age': 42,
        'bio': 'Pellentesque "dapibus" hendrerit tortor.',
        'likes': 'js,go,python',
        'meta': {
          'active': true,
          'roles': [
            'user'
          ]
        },
        'tags': [
          'foo',
          'bar',
          '"bang "'
        ]
      },
      {
        'name': 'User Two',
        'age': 21,
        'bio': 'Nam "eget dui".',
        'likes': 'graphql,number theory',
        'meta': {
          'active': false,
          'roles': [
            'admin',
            'user'
          ]
        },
        'tags': [
          'foo',
          'bar',
          'baz'
        ]
      }
    ]

    const expected = [
      `"First Name","Last Name","Age","Bio","Tags","Likes","Primary Role","Is ""active""?"\n`,
      `"User","One","42","Pellentesque ""dapibus"" hendrerit tortor.","foo,bar,""bang ""","js,go,python","user","true"\n`,
      `"User","Two","21","Nam ""eget dui"".","foo,bar,baz","graphql,number theory","admin","false"\n`
    ].join('')

    it('handles complex schemas', () => {
      return collect(builder.createReadStream(data))
        .then(results => {
          expect(results).to.equal(expected)
        })
    })
  })
})
