const  _ = require('lodash/array');

const eventUpdate = (data) => {
	this.Service = api.hap.Service;
	this.Characteristic = api.hap.Characteristic;

	switch (data.event.name) {
		case 'RoomEntry':
			roomEntry(data.sensorId, roomName, data.userId, userName)
			break;
		case 'LowBattery':
			lowBattery(data.sensorId, roomName)
			break;
		case 'PowerUp':
			powerUp(data.sensorId, roomName)
			break;
	}
}

module.exports = eventUpdate

const roomEntry = (sensorId, roomName, userId) => {
	const nameId = 'user' + userId
	const foundAccessory = this.cachedAccessories.find(accessory => accessory.context.sensorId === sensorId)

	if (foundAccessory) {
		this.log(`${roomName} RoomMe Detected ${userName} Entry`)
		foundAccessory.getService(nameId)
			.getCharacteristic(this.Characteristic.OccupancyDetected)
			.updateValue(1)
		
		this.cachedAccessories.forEach(accessory => {
			if (accessory.UUID !== foundAccessory.UUID) {
				accessory.getService(nameId)
					.getCharacteristic(this.Characteristic.OccupancyDetected)
					.updateValue(0)
			}
		});
	}
}

const lowBattery = (sensorId, roomName) => {
	const foundAccessory = this.cachedAccessories.find(accessory => accessory.context.sensorId === sensorId)

	let cachedData = await this.storage.getItem('DataBaseCache')
	if (cachedData && foundAccessory) {

		const users = cachedData.users
		this.log(`!! ${roomName} RoomMe Battery is LOW !!`)
	
		users.forEach(user => {
			const nameId = 'user' + user.userId
			foundAccessory.getService(nameId)
				.getCharacteristic(this.Characteristic.StatusLowBattery)
				.updateValue(1)
		});
	}
}


const powerUp = (sensorId, roomName) => {
	const foundAccessory = this.cachedAccessories.find(accessory => accessory.context.sensorId === sensorId)

	let cachedData = await this.storage.getItem('DataBaseCache')
	if (cachedData && foundAccessory) {

		const users = cachedData.users
		this.log(`!! ${roomName} RoomMe is Powered UP again!!`)
	
		users.forEach(user => {
			const nameId = 'user' + user.userId
			foundAccessory.getService(nameId)
				.getCharacteristic(this.Characteristic.StatusLowBattery)
				.updateValue(0)
		});
	}
}