const internalIp = require('internal-ip')
const http = require('http')
const https = require('https')
const selfsigned = require('selfsigned')


class Server {
	constructor(platform) {
    this.log = platform.log
    this.host = platform.host
    this.port = platform.port
    this.secured = platform.secured
    this.storage = platform.storage
    this.dbUpdate = platform.dbUpdate
    this.eventUpdate = platform.eventUpdate
  }

  start() {
    let hostIP = this.host
    let protocol = 'http'
    if (this.host === '0.0.0.0' || this.host === 'localhost')
      hostIP = internalIp.v4.sync()

    try {
      if (this.secured) {
        protocol = 'https'
        const sslOptions = this.getSSLOptions()
        https.createServer(sslOptions, this.serverCallback.bind(this)).listen(this.port, this.host)
      } else {
        http.createServer(this.serverCallback.bind(this)).listen(this.port, this.host)
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

  serverCallback(request, response) {
    let data, body = []
    request.on('error', ((err) => {
      this.log.debug("[ERROR Http WebHook Server] Reason: %s.", err)
    })).on('data', (chunk) => {
      body.push(chunk)
    }).on('end', () => {
      body = Buffer.concat(body).toString()
  
      response.on('error', (err) => {
        this.log.debug("[ERROR Http WebHook Server] Reason: %s.", err)
      })
      //   this.log(request)
      try {
        data = JSON.parse(body)
        // this.log(data)
      } catch (err) {
        this.log.debug('Can\'t parse body!')
        this.log.debug(err)
        this.log.debug('body:')
        this.log.debug(body)
        // this.log('response')
        // this.log(response)
        response.statusCode = 500
        response.end()
        return
      }
      if (data && data.type) {
        response.statusCode = 200
        response.end()
        if (data.type === "Database") {
          this.log.debug('~~~~ DATABASE CHANGE ~~~~')
          this.log.debug(data)
          this.dbUpdate(data)
        } else if (data.type === "Event") {
          this.log.debug('~~~~ EVENT CHANGE ~~~~')
          this.log.debug(data)
          this.eventUpdate(data)
        }
  
      } else {
        this.log.debug('Can\'t find data "type"')
        this.log.debug('data:')
        this.log.debug(data)
        response.statusCode = 500
        response.end()
      }
    })
  }

  async getSSLOptions() {
    let sslServerOptions = {}
    if (secured) {
      this.log.debug("Using automatic created ssl certificate.")
      let cachedSSLCert = await this.storage.getItem("roomme-ssl-cert")
      if (cachedSSLCert) {
        const timestamp = Date.now() - cachedSSLCert.timestamp
        const diffInDays = timestamp / 1000 / 60 / 60 / 24
        if (diffInDays > 364) {
          cachedSSLCert = null
        }
      }
      if (!cachedSSLCert) {
        cachedSSLCert = this.createSSLCertificate()
        await this.storage.setItem("roomme-ssl-cert", cachedSSLCert)
      }
  
      sslServerOptions = {
        key: cachedSSLCert.private,
        cert: cachedSSLCert.cert
      }
    }
    return sslServerOptions
  }

  createSSLCertificate() {
    this.log.debug("Generating new ssl certificate.")
    const certAttrs = [{ name: 'homebridgeroomme', value: 'homebridgeroomme.com', type: 'homebridgeRoomMe' }]
    const cachedSSLCert = {
      ...selfsigned.generate(certAttrs, { days: 365 }),
      timestamp: Date.now()
    }
    return cachedSSLCert
  }
}


module.exports = Server