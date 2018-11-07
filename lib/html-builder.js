const html = require('html-escaper')
const { TextWriter } = require('text-scribe')

class Node {
  render (writer) {
    this.renderContent(writer)
    return writer
  }
}

class TextNode extends Node {
  constructor (text) {
    super()
    this._text = text
  }

  renderContent (writer) {
    writer.write(html.escape(this._text))
  }
}

class RawNode extends Node {
  constructor (content) {
    super()
    this._content = content
  }

  renderContent (writer) {
    writer.write(this._content)
  }
}

class Entity extends RawNode {
  constructor (code) {
    super(`&${code};`)
  }
}

class Element extends Node {
  constructor (tag, ...args) {
    super()
    this._tag = tag
    this._children = []
    this._attributes = {}
    this.apply(...args)
  }

  apply (...args) {
    const fillers = []
    args.forEach((arg, idx) => {
      if (typeof arg === 'string') {
        this._add(TextNode, arg)
      } else if (typeof arg === 'function') {
        fillers.push(arg)
      } else if (Array.isArray(arg)) {
        this._add(this._getDefaultChildConstructor(), ...arg)
      } else if (arg instanceof Node) {
        this._children.push(arg)
      } else if (typeof arg === 'object') {
        Object.assign(this._attributes, arg)
      } else if (arg !== null && typeof arg !== 'undefined') {
        throw new Error(`Unexpected argment at index ${idx}: ${arg}`)
      }
    })
    fillers.forEach(filler => filler(this))
  }

  _getDefaultChildConstructor () {
    return this.constructor
  }

  _addNode (node) {
    this._children.push(node)
    return this
  }

  _add (Constructor, ...args) {
    return this._addNode(new Constructor(...args))
  }

  _e (tag, ...args) {
    return this._add(this._getDefaultChildConstructor(), tag, ...args)
  }

  text (text) {
    return this._add(TextNode, text)
  }

  raw (content) {
    return this._add(RawNode, content)
  }

  renderContent (writer) {
    writer
      .write('<').write(html.escape(this._tag))
    if (Object.keys(this._attributes).length) {
      const attributeString = Object.entries(this._attributes).map(([name, value]) => html.escape(name) + "='" + html.escape(value) + "'").join(' ')
      writer.write(' ').write(attributeString)
    }
    if (this._children.length === 0) {
      writer.writeline(' />')
    } else {
      writer.writeline('>')
      writer.indent()
      this._children.forEach(child => child.render(writer))
      writer.outdent()
      writer.write('</').write(html.escape(this._tag)).writeline('>')
    }
  }
}

class Head extends Element {
  title (...args) {
    return this._e('title', ...args)
  }

  _getDefaultChildConstructor () {
    return Head
  }
}

class Body extends Element {
  _getDefaultChildConstructor () {
    return Body
  }
}

class List extends Body {
  mapToItems (values, mapper) {
    values.forEach(v => this.item(item => item.apply(mapper(v, item))))
    return this
  }
}

class Table extends Body {
  mapToRows (values, mapper) {
    values.forEach(v => this.row(row => row.apply(mapper(v, row))))
    return this
  }
}

class TableRow extends Body {
  _addCellElements (tag, ...args) {
    args.forEach(a => this[tag](a))
    return this
  }

  mapToCells (values, mapper) {
    values.forEach(v => this.td(td => td.apply(mapper(v, td))))
    return this
  }

  mapToHeadings (values, mapper) {
    values.forEach(v => this.th(th => th.apply(mapper(v, th))))
    return this
  }

  addCells (...args) {
    return this._addCellElements('td', ...args)
  }

  addHeadings (...args) {
    return this._addCellElements('th', ...args)
  }
}

class HtmlBuilder extends Element {
  constructor (attributes, filler) {
    super('html', { lang: 'en-US', ...attributes }, filler)
  }

  render (writer = new TextWriter({ tab: '', linesep: '' })) {
    writer.writeline('<!doctype html>')
    return super.render(writer)
  }
}

function addNodeFunctionToPrototype (Cls, name, func) {
  Cls.prototype[name] = function (...args) {
    return this._addNode(func(...args))
  }
}

function addNodeFunc (toClass, f, name = f.name) {
  module.exports.nodes[name] = f
  addNodeFunctionToPrototype(toClass, name, f)
}

function addEntity (code) {
  const ent = new Entity(code)
  addNodeFunc(Node, () => ent, code)
}

function addElementFuncFromConstructor (toClass, Constructor, name = Constructor.name.toLowerCase(), tag = name) {
  const f = {
    [name]: (...args) => new Constructor(tag, ...args)
  }[name]
  addNodeFunc(toClass, f, name)
}

function addTopLevelElementFromConstructor (Constructor, name = Constructor.name.toLowerCase(), tag = name) {
  addElementFuncFromConstructor(HtmlBuilder, Constructor, name, tag)
}

function addBodyElement (f, name = f.name) {
  addNodeFunc(Body, f, name)
}

function addBodyElementFromConstructor (Constructor, name = Constructor.name.toLowerCase(), tag = name) {
  addElementFuncFromConstructor(Body, Constructor, name, tag)
}

function addSimpleBodyElement (name, tag = name) {
  addBodyElementFromConstructor(Body, name, tag)
}

function addSimpleListElement (name, tag = name) {
  addElementFuncFromConstructor(List, Body, name, tag)
}

function addTableCellElement (name, tag) {
  addSimpleBodyElement(tag, tag)
  const f = module.exports.nodes[tag]
  TableRow.prototype[name] = TableRow.prototype[tag]

  const empty = () => f(module.exports.nodes.nbsp())
  f.empty = empty
  Body.prototype[tag].empty = empty
  TableRow.prototype[name].empty = empty
}

module.exports = HtmlBuilder
module.exports.Node = Node
module.exports.TextNode = TextNode
module.exports.Element = Element
module.exports.Body = Body
module.exports.Head = Head
module.exports.List = List
module.exports.Table = Table
module.exports.TableRow = TableRow
module.exports.nodes = {}

;[
  'nbsp', 'amp', 'lt', 'gt'
].forEach(addEntity)

addTopLevelElementFromConstructor(Head, 'head')
addTopLevelElementFromConstructor(Body, 'body')

;[
  'strong', 'em', 'i', 'b', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'code', 'del', 'dfn',
  'ins', 'kbd', 'mark', 'q', 's', 'samp', 'small', 'sub', 'sup', 'u', 'var', 'dev', 'section',
  'a', 'img'
].forEach(tag => addSimpleBodyElement(tag, tag))

addBodyElement(function link (href, ...args) {
  return new Body('a', ...args, { href })
})

addBodyElementFromConstructor(List, 'ul', 'ul')
addBodyElementFromConstructor(List, 'ol', 'ol')
addBodyElementFromConstructor(Table, 'table', 'table')

addSimpleListElement('li', 'li')
List.prototype.item = List.prototype.li

addBodyElementFromConstructor(TableRow, 'tr', 'tr')
Table.prototype.row = Table.prototype.tr

addTableCellElement('cell', 'td')
addTableCellElement('header', 'th')

addTableCellElement('cell', 'td')
addTableCellElement('heading', 'th')
