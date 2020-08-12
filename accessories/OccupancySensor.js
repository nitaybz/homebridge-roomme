const  _ = require('lodash/collection')

class OccupancySensor {
	constructor(room, platform) {
		this.log = platform.log
		this.api = platform.api
		this.storage = platform.storage
		this.name = room.name + ' RoomMe'
		this.sensorId = room.sensorId
		this.roomName = room.name
		this.cachedState = platform.cachedState
		this.stateArray = platform.cachedState[room.sensorId]
		this.Service = this.api.hap.Service
		this.Characteristic = this.api.hap.Characteristic
		this.cachedAccessories = platform.cachedAccessories

		this.UUID = this.api.hap.uuid.generate(room.sensorId)

		this.accessory = this.cachedAccessories.find(accessory => accessory.UUID === this.UUID)

		if (!this.accessory) {
			this.log(`Creating New RoomMe Occupancy Sensor the ${this.roomName}`)
			this.accessory = new this.api.platformAccessory(this.name, this.UUID)
			this.accessory.context.sensorId = this.sensorId
			this.accessory.context.roomName = this.roomName

			this.cachedAccessories.push(this.accessory)
			// register the accessory
			this.api.registerPlatformAccessories('homebridge-roomme', 'RoomMe', [this.accessory])
		}

		let informationService = this.accessory.getService(this.Service.AccessoryInformation)

		if (!informationService) {
			informationService = this.accessory.addService(this.Service.AccessoryInformation)
				.setCharacteristic(this.Characteristic.Manufacturer, 'Intellithings')
				.setCharacteristic(this.Characteristic.Model, 'RoomMe Sensor')
				.setCharacteristic(this.Characteristic.SerialNumber, this.sensorId)
		}
	}

	addUserService(user) {

		const nameId = 'user' + user.userId
		let OccupancyService = this.accessory.getService(nameId)

		if (!OccupancyService) {
			OccupancyService = this.accessory.addService(this.Service.OccupancySensor, nameId, nameId)
				.setCharacteristic(this.Characteristic.Name, this.roomName + ' ' + user.name)
				.setCharacteristic(this.Characteristic.	StatusLowBattery, 0)
		}

		OccupancyService.getCharacteristic(this.Characteristic.OccupancyDetected)
			.updateValue(this.stateArray.includes(nameId) ? 1 : 0)
	}

	removeUserService(service, user) {

		const nameId = service ? service.subtype : 'user' + user.userId 
		const userName = service ? service.getCharacteristic(this.Characteristic.Name).value : user.name

		this.log.easyDebug(`Removing User Service ${userName} (NOT IN DB)!`)

		let OccupancyService = this.accessory.getService(nameId)

		if (OccupancyService) {
			// remove service
			this.accessory.removeService(OccupancyService)

			// delete user from cachedState
			const userIndex = this.stateArray.indexOf(nameId)
			if (userIndex !== -1) {
				this.stateArray.splice(userIndex, 1)
				// store recent state in storage
				this.storage.setItem('CachedState', this.cachedState)
			}

		}

	}

	addAnyoneService() {
		const nameId = 'anyone'
		let AnyoneService = this.accessory.getService(nameId)

		if (!AnyoneService) {
			AnyoneService = this.accessory.addService(this.Service.OccupancySensor, nameId, nameId)
				.setCharacteristic(this.Characteristic.Name, this.roomName + ' Anyone')
				.setCharacteristic(this.Characteristic.	StatusLowBattery, 0)
			
		}

		this.accessory.services = _.sortBy(this.accessory.services, function(service) {
			return service.subtype === 'anyone' ? 0 : 1;
		});

		AnyoneService.setPrimaryService()
		
		AnyoneService.getCharacteristic(this.Characteristic.OccupancyDetected)
			.on('get', callback => {this.getAnyoneOccupancy(callback)})

	}


	removeAnyoneService() {

		this.log.easyDebug(`Removing ANYONE Service (removed from config)!`)
		const nameId = 'anyone'
		let AnyoneService = this.accessory.getService(nameId)
		if (AnyoneService)
			this.accessory.removeService(AnyoneService)

	}

	getAnyoneOccupancy(callback)  {
		if (this.stateArray.length)
			callback(null, 1)
		else
			callback(null, 0)
	}
}

module.exports = OccupancySensor