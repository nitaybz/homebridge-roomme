const  _ = require('lodash/array')

const eventUpdate = function(platform){
	const roomEntry = async (sensorId, roomName, userId, userName) => {
		
		const nameId = 'user' + userId
		const foundAccessory = platform.cachedAccessories.find(accessory => 
			accessory.context.sensorId && accessory.context.sensorId === sensorId)
			
		if (foundAccessory) {
			platform.log(`${roomName} RoomMe Detected Entry by ${userName}`)
			
			const DetectedUserService = foundAccessory.getService(nameId)
			if (DetectedUserService)
				DetectedUserService.getCharacteristic(platform.Characteristic.OccupancyDetected)
					.updateValue(1)

			// add user to room in cachedState
			platform.cachedState[sensorId].push('user' + userId)
			
			platform.cachedAccessories.forEach(accessory => {
				if (accessory.UUID !== foundAccessory.UUID && accessory.context.sensorId) {
					const service = accessory.getService(nameId)
					if (service)
						service.getCharacteristic(platform.Characteristic.OccupancyDetected)
							.updateValue(0)

					// remove users from cachedState in other rooms
					const sensorPresentUsers = platform.cachedState[accessory.context.sensorId]
					platform.cachedState[accessory.context.sensorId] = _.pull(sensorPresentUsers, 'user' + userId)
				}
			})

			// update anyone sensor if exists
			if (platform.anyoneSensor) {
				platform.cachedAccessories.forEach(accessory => {
					const anyoneSensorService = accessory.getService('anyone')
						if (anyoneSensorService)
							anyoneSensorService.getCharacteristic(platform.Characteristic.OccupancyDetected).getValue()
				})
			}
			// store recent state in storage
			await platform.storage.setItem('CachedState', platform.cachedState)
		}
	}

	const lowBattery = async (sensorId, roomName) => {
		const foundAccessory = platform.cachedAccessories.find(accessory => 
			accessory.context.sensorId && accessory.context.sensorId === sensorId)

		let cachedData = await platform.storage.getItem('DataBaseCache')
		if (cachedData && foundAccessory) {

			const users = cachedData.users
			platform.log(`!! ${roomName} RoomMe Battery is LOW !!`)
		
			users.forEach(user => {
				const nameId = 'user' + user.userId
				const service = foundAccessory.getService(nameId)

				if (service)
					service.getCharacteristic(platform.Characteristic.StatusLowBattery)
						.updateValue(1)
			})

			const anyoneService = foundAccessory.getService('anyone')
			if (anyoneService)
				anyoneService.getCharacteristic(platform.Characteristic.StatusLowBattery)
					.updateValue(1)

		}
	}


	const powerUp = async (sensorId, roomName) => {
		const foundAccessory = platform.cachedAccessories.find(accessory => 
			accessory.context.sensorId && accessory.context.sensorId === sensorId)

		let cachedData = await platform.storage.getItem('DataBaseCache')
		if (cachedData && foundAccessory) {

			const users = cachedData.users
			platform.log(`!! ${roomName} RoomMe is Powered UP again!!`)
		
			users.forEach(user => {
				const nameId = 'user' + user.userId
				const service = foundAccessory.getService(nameId)

				if (service)
					service.getCharacteristic(platform.Characteristic.StatusLowBattery)
						.updateValue(0)
			})

			const anyoneService = foundAccessory.getService('anyone')
			if (anyoneService)
				anyoneService.getCharacteristic(platform.Characteristic.StatusLowBattery)
					.updateValue(0)
		}
	}



	return (data) => {
		switch (data.event.name) {
			case 'RoomEntry':
				roomEntry(data.sensorId, data.roomName, data.userId, data.userName)
				break
			case 'LowBattery':
				lowBattery(data.sensorId, data.roomName)
				break
			case 'PowerUp':
				powerUp(data.sensorId, data.roomName)
				break
		}
	}
}

module.exports = eventUpdate