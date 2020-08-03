const internalIp = require('internal-ip');
const http = require('http');
const https = require('https');
const selfsigned = require('selfsigned');

const Server  = {
  init: async () => {
    return new Promise((resolve, reject) => {
      let hostIP = this.host
      let protocol = 'http'
      if (this.host === '0.0.0.0' || this.host === 'localhost')
        hostIP = await internalIp.v4()

      try {
        if (this.secured) {
          protocol = 'https'
          const sslOptions = getSSLOptions()
          https.createServer(sslOptions, serverCallback).listen(this.port, this.host);
        } else {
          http.createServer(serverCallback).listen(this.port, this.host);
        }
        this.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
        this.log(`RoomMe Server is Running on:`)
        this.log(`${protocol}://${hostIP}:${this.port}`)
        this.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
        resolve()
      } catch (err) {
        this.log(err)
        this.log('Could not start the server!! exiting...')
        reject(err)
      }

    })
  }
}

module.exports = Server


const serverCallback = (request, response) => {
  let data, body = [];
  request.on('error', (function (err) {
    this.log("[ERROR Http WebHook Server] Reason: %s.", err);
  })).on('data', function (chunk) {
    body.push(chunk);
  }).on('end', function () {
    body = Buffer.concat(body).toString();

    response.on('error', function (err) {
      this.log("[ERROR Http WebHook Server] Reason: %s.", err);
    });
    //   this.log(request)
    try {
      data = JSON.parse(body)
      // this.log(data)
    } catch (err) {
      this.log('Can\'t parse body!')
      this.log(err)
      this.log('body')
      this.log(body)
      response.statusCode = 500;
      response.end();
      return
    }
    if (data && data.type) {
      response.statusCode = 200;
      response.end();
      if (data.type === "Database") {
        this.log('~~~~ DATABASE CHANGE ~~~~')
        this.log(data)
        this.dbUpdate(data).bind(this)
      } else if (data.type === "Event") {
        this.log('~~~~ EVENT CHANGE ~~~~')
        this.log(data)
        this.eventUpdate(data).bind(this)
      }

    } else {
      this.log('Can\'t find data "type"')
      this.log('data:')
      this.log(data)
      response.statusCode = 500;
      response.end();
    }
  })
}


const getSSLOptions = () => {
  var sslServerOptions = {};
  if (secured) {
    log("Using automatic created ssl certificate.");
    var cachedSSLCert = storage.getItemSync("roomme-ssl-cert");
    if (cachedSSLCert) {
      var timestamp = Date.now() - cachedSSLCert.timestamp;
      var diffInDays = timestamp / 1000 / 60 / 60 / 24;
      if (diffInDays > 364) {
        cachedSSLCert = null;
      }
    }
    if (!cachedSSLCert) {
      cachedSSLCert = createSSLCertificate();
      storage.setItemSync("roomme-ssl-cert", cachedSSLCert);
    }

    sslServerOptions = {
      key: cachedSSLCert.private,
      cert: cachedSSLCert.cert
    };
  }
  return sslServerOptions;
};

const createSSLCertificate = () => {
  log("Generating new ssl certificate.");
  var certAttrs = [{ name: 'homebridgeroomme', value: 'homebridgeroomme.com', type: 'homebridgeRoomMe' }];
  // var certOpts = { days: 365};
  // certOpts.extensions = [{
  //   name: 'subjectAltName',
  //   altNames: [{
  //           type: 2,
  //           value: 'homebridgeroomme.com'
  //   }, {
  //           type: 2,
  //           value: 'localhost'
  //   }]
  // }];
  // var pems = selfsigned.generate(certAttrs, certOpts);
  // const pems = selfsigned.generate(certAttrs, { days: 365 });

  const cachedSSLCert = {
    ...selfsigned.generate(certAttrs, { days: 365 }),
    timestamp: Date.now()
  }
  return cachedSSLCert;
};