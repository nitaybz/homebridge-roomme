const internalIp = require('internal-ip')
const http = require('http')
const https = require('https')
var fs = require('fs')


class Server {
	constructor(platform) {
    this.log = platform.log
    this.host = platform.host
    this.port = platform.port
    this.storage = platform.storage
    this.secured = platform.secured
    this.sslKeyFile = platform.sslKeyFile
    this.sslCertFile = platform.sslCertFile
    this.dbUpdate = platform.dbUpdate
    this.eventUpdate = platform.eventUpdate
  }

  start = async () => {
    let hostIP = this.host
    let protocol = 'http'
    if (this.host === '0.0.0.0' || this.host === 'localhost')
      hostIP = internalIp.v4.sync()

    try {
      if (this.secured && this.sslKeyFile && this.sslCertFile) {
        protocol = 'https'
        const sslOptions = {
          key: fs.readFileSync(this.httpsKeyFile),
          cert: fs.readFileSync(this.sslCertFile)
        }
        https.createServer(sslOptions, this.serverCallback).listen(this.port, this.host)
      } else {
        http.createServer(this.serverCallback).listen(this.port, this.host)
      }
      this.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
      this.log(`RoomMe Server is Running on:`)
      this.log(`${protocol}://${hostIP}:${this.port}`)
      this.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
    } catch (err) {
      this.log(err)
      this.log('Could not start the server!! Please restart HomeBridge or contact the developer of this plugin...')
    }
  }

  serverCallback = (request, response) => {
    let data, body = []
    request.on('error', ((err) => {
      this.log.easyDebug("[ERROR Http WebHook Server] Reason: %s.", err)
    })).on('data', (chunk) => {
      body.push(chunk)
    }).on('end', () => {
      body = Buffer.concat(body).toString()
  
      response.on('error', (err) => {
        this.log.easyDebug("[ERROR Http WebHook Server] Reason: %s.", err)
      })
      //   this.log(request)
      try {
        data = JSON.parse(body)
        // this.log(data)
      } catch (err) {
        this.log.easyDebug('Can\'t parse body!')
        this.log.easyDebug(err)
        this.log.easyDebug('body:')
        this.log.easyDebug(body)
        response.statusCode = 500
        response.end()
        return
      }
      if (data && data.type) {
        response.statusCode = 200
        response.end()
        if (data.type === "Database") {
          this.log.easyDebug('~~~~ DATABASE CHANGE ~~~~')
          this.log.easyDebug(data)
          this.dbUpdate(data)
        } else if (data.type === "Event") {
          this.log.easyDebug('~~~~ EVENT CHANGE ~~~~')
          this.log.easyDebug(data)
          this.eventUpdate(data)
        }
  
      } else {
        this.log.easyDebug('Can\'t find data "type"')
        this.log.easyDebug('data:')
        this.log.easyDebug(data)
        response.statusCode = 500
        response.end()
      }
    })
  }
}


module.exports = Server