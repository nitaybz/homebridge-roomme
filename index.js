const  _ = require('lodash/array')
const path = require('path')
const Server = require('./utils/Server')
const OccupancySensor = require('./accessories/OccupancySensor')
const SwitchAccessory = require('./accessories/SwitchAccessory')

module.exports = (api) => {
	api.registerPlatform('RoomMe', roomMePlatform)
}

class roomMePlatform {
	constructor(log, config, api) {

		// store restored cached accessories here
		this.cachedAccessories = []
		this.cachedSensors = []
		this.host = config['host'] || '0.0.0.0'
		this.port = config['port'] || '13579'
		this.secured = config['secured'] || false
    this.sslKeyFile = config['sslKeyFile'] || false
    this.sslCertFile = config['sslCertFile'] || false
		this.debug = config['debug'] || false
		this.anyoneSensor = config['anyoneSensor'] || false
		this.leftHomeSwitch = config['leftHomeSwitch'] || false
		this.log = log
		this.api = api
		this.storage = require('node-persist')
	
		this.dbUpdate = require('./utils/dbUpdate')(this)
		this.eventUpdate = require('./utils/eventUpdate')(this)
		const server = new Server(this)

		this.Service = api.hap.Service
		this.Characteristic = api.hap.Characteristic
		this.UUIDGen = api.hap.uuid

		/**
		 * Platforms should wait until the "didFinishLaunching" event has fired before
		 * registering any new accessories.
		 */

		this.log.easyDebug = (...content) => {
			if (this.debug) {
				this.log(content.reduce((previous, current) => {
					return previous + ' ' + current;
				}));
			} else
				this.log.debug(content.reduce((previous, current) => {
					return previous + ' ' + current;
				}))
		}


		api.on('didFinishLaunching', async () => {

			await this.storage.init({
				dir: path.join(api.user.storagePath(), '/roomme-persist'),
				forgiveParseErrors: true
			})
	
			this.cachedData = await this.storage.getItem('DataBaseCache')
			this.cachedState = await this.storage.getItem('CachedState') || {}

			if (this.cachedData) 
				this.syncHomeKitCache()
			
			server.start()
		})
	}

	/**
	 * REQUIRED - Homebridge will call the "configureAccessory" method once for every cached
	 * accessory restored
	 */
	configureAccessory(accessory) {
		this.cachedAccessories.push(accessory)
	}

	syncHomeKitCache() {

		this.cachedData.rooms.forEach(room => {

			// add Sensor or verify cached sensor
			const Sensor = new OccupancySensor(room, this)
			
			// add/remove anyone sensor
			if (this.anyoneSensor)
				Sensor.addAnyoneService()
			else
				Sensor.removeAnyoneService()

			// add users services
			this.cachedData.users.forEach(user => {Sensor.addUserService(user)})

			// remove unused users services
			const userServices = Sensor.accessory.services.filter(service => service.subtype && service.subtype.includes('user'))
			userServices.forEach(userService => {
				const isUserExist = this.cachedData.users.find(user => userService.subtype === 'user' + user.userId)
				if (!isUserExist)
					Sensor.removeUserService(userService)
			})

			if (!this.cachedState[room.sensorId]) {
				this.cachedState[room.sensorId] = []
				// store recent state in storage
				this.storage.setItem('CachedState', this.cachedState)
			}

			this.cachedSensors.push(Sensor)
		})

		// get all accessories from cache that are not in DB
		const accessoriesToRemove = _.differenceWith(this.cachedAccessories, this.cachedSensors, (accessory, sensor) => {
			return (accessory.context.userName || accessory.UUID === sensor.UUID)
		})

		if (accessoriesToRemove.length) {

			this.log.easyDebug(`Removing Sensors (NOT IN DB):`)
			this.log.easyDebug(accessoriesToRemove)
	
			this.api.unregisterPlatformAccessories('homebridge-roomme', 'RoomMe', [accessoriesToRemove])
			this.cachedAccessories = _.pullAllBy(this.cachedAccessories, accessoriesToRemove, (accessory) => accessory.UUID) 
			
			// delete room from cachedState
			accessoriesToRemove.forEach(accessory => {
				delete this.cachedState[accessory.context.sensorId]
				// store recent state in storage
				this.storage.setItem('CachedState', this.cachedState)
			})
		}


		// sync "Left Home" Switches
		this.cachedData.users.forEach(user => {
			const foundSwitch = this.cachedAccessories.find(accessory => accessory.context.userId && accessory.context.userId === user.userId)
			if (this.leftHomeSwitch) {
				new SwitchAccessory(user, this)
			} else if (!this.leftHomeSwitch && foundSwitch) {
				this.log.easyDebug(`Unregistered "Left Home" Switch of ${user.name}`)
				this.api.unregisterPlatformAccessories('homebridge-roomme', 'RoomMe', [foundSwitch])
			}
		})

	}
}