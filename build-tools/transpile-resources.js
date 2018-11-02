const fs = require('fs')
const Promise = require('bluebird')
const mkdirp = Promise.promisify(require('mkdirp'))
const generateStartPageFromFile = require('./generate-start-pages')
const walk = require('walk')
const path = require('path')
const less = require('less')

const rules = [
  {
    name: 'start-page-generation',
    test: /(?:\/|^)start-page.*\.js$/,
    transpile: generateStartPageFromFile
  },
  {
    name: 'less',
    test: /\.less$/,
    transpile: (inputPath, outputDir, root) => {
      return fs.promises.readFile(path.join(root, inputPath))
        .then(contents => less.render(contents.toString('utf-8')))
        .then(output => {
          const outputFile = path.join(outputDir, inputPath.replace(/\.less$/, '.css'))
          return mkdirp(path.dirname(outputFile))
            .then(() => fs.promises.writeFile(outputFile, output.css, 'utf-8'))
            .then(() => outputFile)
        })
    }
  }
]

const inputDir = './src/'
const outputDir = './output/'

function main () {
  return mkdirp(outputDir)
    .then(() => new Promise((resolve, reject) => {
      const walker = walk.walk(inputDir)
      const filePromises = []
      walker.on('file', (root, stats, next) => {
        filePromises.push(processInputFile(root, stats))
        next()
      })

      walker.on('error', (root, stats, next) => {
        reject(stats.error)
      })

      walker.on('end', () => {
        Promise.all(filePromises)
          .then(results => {
            const outputFiles = results.reduce((acc, r) => acc.concat(r), [])
            console.log(`Processed ${results.length} inputs to ${outputFiles.length} outputs under ${outputDir}`)
          })
          .then(resolve)
      })
    }))
}

function processInputFile (root, stats) {
  if (stats.type !== 'file') {
    return []
  }
  const dir = path.relative(inputDir, root)
  const relPath = path.join(dir, stats.name)
  return Promise.map(
    rules.filter(rule => rule.test.test(relPath, stats)),
    rule => Promise.method(rule.transpile)(relPath, outputDir, inputDir)
      .then(outputFile => [rule, outputFile])
  )
    .tap(results => {
      results.forEach(([rule, o]) => console.log(`${relPath} ==> [${rule.name}] ${o}`))
    })
    .then(results => results.map(([rule, o]) => o))
}

main()
