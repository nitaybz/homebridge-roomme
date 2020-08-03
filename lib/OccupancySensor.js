class OccupancySensor {
	constructor(log, config, api) {
		this.log = log;
		this.api = api;
		this.uuid = config.uuid
		this.name = config.name
		this.sensorId = config.sensorId
		this.userId = config.userId
		this.roomName = config.roomName
		this.Service = api.hap.Service;
		this.Characteristic = api.hap.Characteristic;

		this.accessory = new api.platformAccessory(this.name, this.uuid);
		this.accessory.context.sensorId = room.sensorId;

		this.log(`Creating New Occupancy Sensor for ${this.userName} in the ${this.roomName}`)
		
		const informationService = this.accessory.addService(this.Service.AccessoryInformation)
		
		informationService
			.setCharacteristic(this.Characteristic.Manufacturer, 'Intellithings')
			.setCharacteristic(this.Characteristic.Model, 'RoomMe Sensor')
			.setCharacteristic(this.Characteristic.SerialNumber, this.sensorId);

		config.users.forEach(this.addService)
	}

	addService(user) {

		const nameId = 'user' + user.userId
		const OccupancyService = accessory.addService(this.Service.OccupancySensor, nameId, nameId)
		
		OccupancyService.setCharacteristic(this.Characteristic.Name)
			.updateValue(this.roomName + ' ' + user.name)

		OccupancyService.setCharacteristic(this.Characteristic.OccupancyDetected)
			.updateValue(0)

		OccupancyService.setCharacteristic(this.Characteristic.	StatusLowBattery)
			.updateValue(0)
	}
}

module.exports = OccupancySensor