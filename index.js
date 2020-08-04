

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
		this.host = config['host'] || '0.0.0.0'
		this.port = config['port'] || '1234'
		this.secured = config['secured'] || false
		this.anyoneSensor = config['anyoneSensor'] || false
		this.leftHomeSwitch = config['leftHomeSwitch'] || false
		this.log = log
		this.api = api
		this.storage = require('node-persist')

		this.Service = api.hap.Service
		this.Characteristic = api.hap.Characteristic
		this.UUIDGen = api.hap.uuid
		this.dbUpdate = require('homebridge-roomme/utils/dbUpdate').bind(this)
		this.eventUpdate = require('homebridge-roomme/utils/eventUpdate').bind(this)

		const server = new Server(this)
		/**
		 * Platforms should wait until the "didFinishLaunching" event has fired before
		 * registering any new accessories.
		 */
		api.on('didFinishLaunching', async () => {

			await this.storage.init({
				dir: path.join(api.user.storagePath(), '/roomme-persist'),
				forgiveParseErrors: true
			})
	
			this.cachedData = await this.storage.getItem('DataBaseCache')
			this.cachedState = await this.storage.getItem('CachedState') || {}

			if (this.cachedData) 
				await this.verifyStorageMatchCache(this.cachedData)
			
			server.start()

			this.syncExtraServices(this.anyoneSensor, this.leftHomeSwitch)
		})
	}

	/**
	 * REQUIRED - Homebridge will call the "configureAccessory" method once for every cached
	 * accessory restored
	 */
	configureAccessory(accessory) {
		this.cachedAccessories.push(accessory)
	}

	async verifyStorageMatchCache(cachedData) {

		const cachedAccessoriesAsData = { rooms: [], users: [] }

		this.cachedAccessories.forEach((accessory, i) => {
			if (accessory.context.sensorId) {
				// check if cached sensor accessory is in database
				const isSensorExist = cachedData.rooms.find(room => room.sensorId === accessory.context.sensorId)
				if (isSensorExist) {
					cachedAccessoriesAsData.rooms.push({
						name: accessory.displayName.replace(' RoomMe', ''),
						sensorId: accessory.context.sensorId
					})
	
					accessory.services.forEach((service, j) => {
						// check if cached user service is in database
						const isUserExist = cachedData.users.find(user => service.subtype === 'user' + user.userId)
						if (isUserExist) {
							cachedAccessoriesAsData.users.push({
								name: service.getCharacteristic(this.Characteristic.Name).value,
								userId: parseInt(service.subtype.replace('user', ''))
							})
						} else if (service.subtype && service.subtype.includes('user')){
							this.log.debug(`Removing User Service ${service.getCharacteristic(this.Characteristic.Name).value} (NOT IN DB)!`)
							accessory.removeService(service.subtype)
							accessory.services.splice(j, 1)
	
							// delete user from cachedState
							Object.keys(this.cachedState).forEach(sensor => {
								const userIndex = this.cachedState[sensor].indexOf(service.subtype)
								if (userIndex !== -1)
									this.cachedState[sensor].splice(userIndex, 1)
							})
						} 
					})
	
				} else {
					this.log.debug(`Removing Sensor Accessory ${accessory.context.sensorId} (NOT IN DB)!`)
					this.api.unregisterPlatformAccessories('homebridge-roomme', 'RoomMe', [accessory])
					this.cachedAccessories.splice(i, 1) 
					// delete room from cachedState
					delete this.cachedState[accessory.context.sensorId]
				}


				if (!this.cachedState[accessory.context.sensorId])
					this.cachedState[accessory.context.sensorId] = []
			}
		})

		await this.dbUpdate(cachedData, cachedAccessoriesAsData)
	}



	async syncExtraServices(anyoneSensor, leftHomeSwitch) {
		let leftHomeSwitchExists

		// check if anyone sensor is needed and add/remove accordingly
		this.cachedAccessories.forEach(accessory => {
			if (accessory.context.sensorId) {
					const anyoneService = accessory.services.find(service => service.subtype && service.subtype === 'anyone')
					if (!anyoneService && anyoneSensor) {
						// update accessory with anyone sensor
						this.log(`Adding New "Anyone" Occupancy Service to ${accessory.displayName}`)
						const config = {
							platform: this,
							room: {
								sensorId: accessory.context.sensorId,
								name: accessory.context.sensorName
							},
							users: []
						}
						new OccupancySensor(this.log, config, this.api)
					} else if (anyoneService && !anyoneSensor) {
						this.log.debug(`Removing "Anyone" Occupancy Service from ${accessory.context.sensorName}`)
						accessory.removeService('anyone')
					}
			}

			this.cachedData.users.forEach(user => {
				const foundSwitch = this.cachedAccessories.find(accessory => accessory.context.userId === user.userId)
				if (leftHomeSwitch && !foundSwitch) {
					this.log.debug(`Adding New "Left Home" Switch for ${user.name}`)
					const config = {
						cachedAccessories: this.cachedAccessories,
						user: user,
						anyoneSensor: this.anyoneSensor
					}
					new SwitchAccessory(this.log, config, this.api)
				} else if (!leftHomeSwitch && foundSwitch) {
					this.log.debug(`Unregistered "Left Home" Switch of ${user.name}`)
					this.api.unregisterPlatformAccessories('homebridge-roomme', 'RoomMe', [foundSwitch])
				}
			})
		})


		// check if "Left Home" switch is needed and add/remove accordingly to each user


	}
}