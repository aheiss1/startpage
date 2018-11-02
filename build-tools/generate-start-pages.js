const fs = require('fs')
const path = require('path')
const Promise = require('bluebird')
const mkdirp = Promise.promisify(require('mkdirp'))
const { fork } = require('child_process')

function generateStartPageFromFile (fileName, outputDir, rootDir) {
  const filePath = path.resolve(rootDir, fileName)
  const startPageName = fileName.replace(/\.js$/i, '.html')
  const outputPath = path.resolve(outputDir, startPageName)
  return mkdirp(path.dirname(outputPath))
    .then(() => new Promise((resolve, reject) => {
      const outputStream = fs.createWriteStream(outputPath)

      outputStream.on('open', () => {
        const proc = fork(filePath, [], {
          stdio: ['ignore', outputStream, 'inherit', 'ipc']
        })

        proc.on('exit', code => {
          outputStream.close()
          if (code === 0) {
            resolve(outputPath)
          } else {
            reject(new Error(`Start page ${fileName} exited with error code ${code}`))
          }
        })

        proc.on('error', error => {
          outputStream.close()
          reject(error)
        })
      })
    }))
}

module.exports = generateStartPageFromFile
