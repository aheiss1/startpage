
class StartPage {
  constructor () {
    this.creator = new htmlCreator()
  }

  render (doc = document) {
    doc.write(this.creator.renderHTML())
  }
}

module.exports = StartPage
