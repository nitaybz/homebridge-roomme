
const Server = require('./lib/Server')
const path = require('path')


module.exports = (api) => {
	api.registerPlatform('RoomMe', roomMePlatform);
}

class roomMePlatform {
	constructor(log, config, api) {

		// store restored cached accessories here
		this.cachedAccessories = [];
		this.host = config['host'] || '0.0.0.0'
		this.port = config['port'] || '1234'
		this.secured = config['secured'] || false
		this.log = log;
		this.api = api;
		this.storage = require('node-persist');
		this.storage.init({
			dir: path.join(api.user.configPath(), '/roomme-persist'),
			forgiveParseErrors: true
		})

		this.UUIDGen = api.hap.uuid
		this.dbUpdate = require('./lib/dbUpdate')
		this.eventUpdate = require('./lib/eventUpdate')


		/**
		 * Platforms should wait until the "didFinishLaunching" event has fired before
		 * registering any new accessories.
		 */
		api.on('didFinishLaunching', () => {
			Server.init(host, port)
				.then(eventsHandler)
				.catch(err => {
					// console.log('ERROR')
				})
		})
	}

	/**
	 * REQUIRED - Homebridge will call the "configureAccessory" method once for every cached
	 * accessory restored
	 */
	configureAccessory(accessory) {
		this.cachedAccessories.push(accessory);
	}
}