const  _ = require('lodash/array')
const OccupancySensor = require('./../accessories/OccupancySensor')

// let platform

const dbUpdate = function (platform) {
	// platform = that

	const addNewAccessories = (newRooms, newUsers, data) => {

		// add new rooms to all users
		newRooms.forEach(room => {
			platform.log(`Found New Room  --> ${room.name}`)
			addRoomAccessory(room, data.users)
		})

		// remove the handled new rooms and leave only old rooms
		const oldRooms = _.differenceBy(data.rooms, newRooms, (room) => room.sensorId)

		// add new users to old rooms
		newUsers.forEach(user => {
			platform.log(`Found New User  --> ${user.name}`)
			oldRooms.forEach(room => {
				const Sensor = platform.cachedSensors.find(sensor => sensor.sensorId === room.sensorId)
				if (Sensor)
					Sensor.addUserService(user)
			})
		})
	}

	const addRoomAccessory = (room, users) => {

				// add Sensor or verify cached sensor
				const Sensor = new OccupancySensor(room, platform)
				
				// add anyone sensor
				if (platform.anyoneSensor)
					Sensor.addAnyoneService()

				// add users services
				users.forEach(() => {Sensor.addUserService()})

				if (!platform.cachedState[room.sensorId])
					platform.cachedState[room.sensorId] = []

				platform.cachedSensors.push(Sensor)
				platform.cachedAccessories.push(Sensor.accessory)

	}


	const removeCachedAccessories = (removedRooms, removedUsers) => {

		const accessoriesToRemove = []
		
		// remove cached rooms
		removedRooms.forEach(room => {
			const removedAccessory = platform.cachedAccessories.find(accessory => accessory.context.sensorId === room.sensorId)
			if (removedAccessory) {
				platform.log.easyDebug(`Removing Cached Room Sensors --> ${room.name}(${room.sensorId})`)
				accessoriesToRemove.push(removedAccessory)

				// delete room from cachedState
				delete platform.cachedState[room.sensorId]
			}
		})

		// remove "Removed" rooms from cache
		platform.cachedAccessories = _.pullAllBy(platform.cachedAccessories, accessoriesToRemove, (accessory) => accessory.UUID)
		// unregister the accessories
		platform.api.unregisterPlatformAccessories('homebridge-roomme', 'RoomMe', accessoriesToRemove)

		// remove cached users
		removedUsers.forEach(user => {
			platform.cachedSensors.forEach(sensor => {
				sensor.removeUserService(null, user)
			})

			// delete user from cachedState
			Object.keys(platform.cachedState).forEach(sensor => {
				const userIndex = platform.cachedState[sensor].indexOf(service.subtype)
				if (userIndex !== -1)
					platform.cachedState[sensor].splice(userIndex, 1)
			})
		})
	}

	return async (newData) => {

		let cachedData = await platform.storage.getItem('DataBaseCache')
		if (!cachedData)
			cachedData = {
				users: [],
				rooms: []
			}
	
		//find new rooms in DB
		const newRooms = _.differenceBy(newData.rooms, cachedData.rooms, (room) => room.sensorId)
		//find cached rooms that was removed from DB
		const removedRooms = _.differenceBy(cachedData.rooms, newData.rooms, (room) => room.sensorId)
		//find new users in DB
		const newUsers = _.differenceBy(newData.users, cachedData.users, (user) => user.userId)
		//find cached users that was removed from DB
		const removedUsers = _.differenceBy(cachedData.users, newData.users, (user) => user.userId)
	
		if (newRooms.length || newUsers.length)
			addNewAccessories.bind(this)(newRooms, newUsers, newData)
	
		if (removedRooms.length || removedUsers.length)
			removeCachedAccessories.bind(this)(removedRooms, removedUsers)
	
		// store recent data in storage
		platform.storage.setItem('DataBaseCache', newData)
	
		// store recent state in storage
		platform.storage.setItem('CachedState', platform.cachedState)
	}
}

module.exports = dbUpdate

