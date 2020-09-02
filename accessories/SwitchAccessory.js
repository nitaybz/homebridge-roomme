class SwitchAccessory {
	constructor(user, platform) {
		this.log = platform.log
		this.api = platform.api
		this.storage = platform.storage
		this.name = user.name + ' Left Home'
		this.anyoneSensor = platform.anyoneSensor
		this.userName = user.name
		this.userId = user.userId
		this.Service = platform.api.hap.Service
		this.Characteristic = platform.api.hap.Characteristic
		this.cachedAccessories = platform.cachedAccessories
		this.cachedState = platform.cachedState


		this.UUID = this.api.hap.uuid.generate(user.userId + ' Left Home')

		this.accessory = this.cachedAccessories.find(accessory => accessory.UUID === this.UUID)
		if (!this.accessory) {
			this.log(`Creating New "Left Home" Switch for ${this.userName}`)
			this.accessory = new this.api.platformAccessory(this.name, this.UUID)
			this.accessory.context.userId = this.userId
			this.accessory.context.userName = this.userName

			this.cachedAccessories.push(this.accessory)
			// register the accessory
			this.api.registerPlatformAccessories('homebridge-roomme', 'RoomMe', [this.accessory])
		}



		
		let informationService = this.accessory.getService(this.Service.AccessoryInformation)

		if (!informationService) {
			informationService = this.accessory.addService(this.Service.AccessoryInformation)
		}
		informationService
			.setCharacteristic(this.Characteristic.Manufacturer, 'Intellithings')
			.setCharacteristic(this.Characteristic.Model, 'Left Home Switch')
			.setCharacteristic(this.Characteristic.SerialNumber, `user${this.userId}LeftHome`)
			.setCharacteristic(Characteristic.AppMatchingIdentifier, 'net.intellithings.roomme')

		this.SwitchService = this.accessory.getService(this.Service.Switch)

		if (!this.SwitchService) {
			this.SwitchService = this.accessory.addService(this.Service.Switch)
		}

		this.SwitchService.getCharacteristic(this.Characteristic.On)
			.on('get', callback => {callback(null, 0)})
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

						// update cachedState
						const sensorState = this.cachedState[accessory.context.sensorId]
						const userIndex = sensorState.indexOf(nameId)
						if (userIndex !== -1) {
							sensorState.splice(userIndex, 1)
							// store recent state in storage
							this.storage.setItem('CachedState', this.cachedState)
						}

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