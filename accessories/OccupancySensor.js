class OccupancySensor {
	constructor(log, config, api) {
		this.log = log
		this.api = api
		this.name = config.room.name + ' RoomMe'
		this.sensorId = config.room.sensorId
		this.roomName = config.room.name
		this.anyoneSensor = config.platform.anyoneSensor
		this.stateArray = config.platform.cachedState[config.room.sensorId]
		this.Service = api.hap.Service
		this.Characteristic = api.hap.Characteristic
		this.cachedAccessories = config.platform.cachedAccessories

		this.uuid = api.hap.uuid.generate(config.room.sensorId)

		this.accessory = this.cachedAccessories.find(accessory => accessory.UUID === this.uuid)
		if (!this.accessory) {
			this.log(`Creating New RoomMe Occupancy Sensor the ${this.roomName}`)
			this.accessory = new api.platformAccessory(this.name, this.uuid)
			this.accessory.context.sensorId = this.sensorId
			this.accessory.context.roomName = this.roomName

			this.cachedAccessories.push(this.accessory)
			// register the accessory
			api.registerPlatformAccessories('homebridge-roomme', 'RoomMe', [this.accessory])
		}

		let informationService = this.accessory.getService(this.Service.AccessoryInformation)

		if (!informationService) {
			informationService = this.accessory.addService(this.Service.AccessoryInformation)
				.setCharacteristic(this.Characteristic.Manufacturer, 'Intellithings')
				.setCharacteristic(this.Characteristic.Model, 'RoomMe Sensor')
				.setCharacteristic(this.Characteristic.SerialNumber, this.sensorId)
		}
		

		config.users.forEach(this.addService.bind(this))

		if (this.anyoneSensor)
			this.addAnyoneService()
	}

	addService(user) {

		const nameId = 'user' + user.userId


		let OccupancyService = this.accessory.getService(nameId)

		if (!OccupancyService) {
			OccupancyService = this.accessory.addService(this.Service.OccupancySensor, nameId, nameId)
				.setCharacteristic(this.Characteristic.Name, this.roomName + ' ' + user.name)
				.setCharacteristic(this.Characteristic.	StatusLowBattery, 0)
				.setCharacteristic(this.Characteristic.OccupancyDetected, 0)
		}
		

	}

	addAnyoneService() {
		const nameId = 'anyone'
		let OccupancyService = this.accessory.getService(nameId)

		if (!OccupancyService) {
			OccupancyService = this.accessory.addService(this.Service.OccupancySensor, nameId, nameId)
				.setCharacteristic(this.Characteristic.Name, this.roomName + ' Anyone')
				.setCharacteristic(this.Characteristic.	StatusLowBattery, 0)
	
		}
			
		OccupancyService.getCharacteristic(this.Characteristic.OccupancyDetected)
			.on('get', this.getAnyoneOccupancy.bind(this))

	}

	getAnyoneOccupancy(callback) {
		console.log('this.stateArray')
		console.log(this.stateArray)

		if (this.stateArray.length)
			callback(null, 1)
		else
			callback(null, 0)
	}
}

module.exports = OccupancySensor