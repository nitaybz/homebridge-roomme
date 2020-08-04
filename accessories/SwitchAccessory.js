class SwitchAccessory {
	constructor(log, config, api) {
		this.log = log
		this.api = api
		this.name = config.user.name + ' Left Home'
		this.userName = config.user.name
		this.userId = config.user.userId
		this.anyoneSensor = config.anyoneSensor
		this.Service = api.hap.Service
		this.Characteristic = api.hap.Characteristic
		this.cachedAccessories = config.cachedAccessories



		this.uuid = api.hap.uuid.generate(config.room.sensorId)

		this.accessory = this.cachedAccessories.find(accessory => accessory.UUID === this.uuid)
		if (!this.accessory) {
			this.log(`Creating New "Left Home" Switch for ${this.userName}`)
			this.accessory = new api.platformAccessory(this.name, this.uuid)
			this.accessory.context.userId = this.userId
			this.accessory.context.userName = this.userName

			this.cachedAccessories.push(this.accessory)
			// register the accessory
			api.registerPlatformAccessories('homebridge-roomme', 'RoomMe', [this.accessory])
		}



		
		let informationService = this.accessory.getService(this.Service.AccessoryInformation)

		if (!informationService) {
			informationService = this.accessory.addService(this.Service.AccessoryInformation)
				.setCharacteristic(this.Characteristic.Manufacturer, 'Intellithings')
				.setCharacteristic(this.Characteristic.Model, 'Left Home Switch')
				.setCharacteristic(this.Characteristic.SerialNumber, `user${this.userId}LeftHome`)
		}

		this.addService()
	}

	addService() {
		this.SwitchService = this.accessory.getService(this.Service.Switch)

		if (!this.SwitchService) {
			this.SwitchService = this.accessory.addService(this.Service.Switch)
		}

		this.SwitchService.getCharacteristic(this.Characteristic.On)
			.on('get', 0)
			.on('set', this.leftHome.bind(this));
	}

	leftHome(on, callback) {
		if (on) {
			const nameId = 'user' + this.userId
			this.log(this.name, ' - Turning Off All User Sensors')
			this.cachedAccessories.forEach(accessory => {
				if (accessory.context.sensorId) {
					const service = accessory.getService(nameId)
					if (service) {
						service.getCharacteristic(this.Characteristic.OccupancyDetected)
							.updateValue(0)

						// update anyone sensor if exists
						if (this.anyoneSensor) {
							const anyoneSensorService = accessory.getService('anyone')
							if (anyoneSensorService)
								anyoneSensorService.getCharacteristic(this.Characteristic.OccupancyDetected).getValue()
						}
					}
				}
			})
			setTimeout(() => {
				this.SwitchService.getCharacteristic(this.Characteristic.On)
					.updateValue(0)
			}, 2000);

			callback(null)
		}
	}
}

module.exports = SwitchAccessory