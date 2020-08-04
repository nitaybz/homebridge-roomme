const  _ = require('lodash/array')
const OccupancySensor = require('./../accessories/OccupancySensor')

let platform

const dbUpdate = async function (newData, cachedData) {
	platform = this

	if (!cachedData) {
		cachedData = await platform.storage.getItem('DataBaseCache')
		if (!cachedData)
			cachedData = {
				users: [],
				rooms: []
			}
	}

	this.log.debug('cachedData:')
	this.log.debug(JSON.stringify(cachedData, null, 2))

	this.log.debug('newData:')
	this.log.debug(JSON.stringify(newData, null, 2))

	//find new rooms in DB
	const newRooms = _.differenceBy(newData.rooms, cachedData.rooms, (room) => room.sensorId)
	//find cached rooms that was removed from DB
	const removedRooms = _.differenceBy(cachedData.rooms, newData.rooms, (room) => room.sensorId)
	//find new users in DB
	const newUsers = _.differenceBy(newData.users, cachedData.users, (user) => user.userId)
	//find cached users that was removed from DB
	const removedUsers = _.differenceBy(cachedData.users, newData.users, (user) => user.userId)

	await platform.storage.setItem('DataBaseCache', newData)

	if (newRooms.length || newUsers.length)
		addNewAccessories.bind(this)(newRooms, newUsers, newData)

	if (removedRooms.length || removedUsers.length)
		removeCachedAccessories.bind(this)(removedRooms, removedUsers)

	// store recent data in storage
	await platform.storage.setItem('DataBaseCache', newData)

	// store recent state in storage
	await this.storage.setItem('CachedState', platform.cachedState)
}

module.exports = dbUpdate


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
			addUserService(room, user)
		})
	})
}

const addRoomAccessory = (room, users) => {
		// add new room to cachedState
		if (!platform.cachedState[room.sensorId])
			platform.cachedState[room.sensorId] = []

		// create a new accessory
		const config = {
			platform: platform,
			room: room,
			users: users
		}
		
		new OccupancySensor(platform.log, config, platform.api)

}


const addUserService = (room, user) => {

	// update accessory
	const config = {
		platform: platform,
		room: room,
		users: [user]
	}
	new OccupancySensor(platform.log, config, platform.api)
}



const removeCachedAccessories = (removedRooms, removedUsers) => {

	const accessoriesToRemove = []
	
	// remove cached rooms
	removedRooms.forEach(room => {
		const removedAccessory = platform.cachedAccessories.find(accessory => accessory.context.sensorId === room.sensorId)
		if (removedAccessory) {
			platform.log.debug(`Removing Cached Room Sensors --> ${room.name}(${room.sensorId})`)
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
			platform.log.debug(`Removing Cached Users Sensors --> ${user.name}(${user.userId})`)
			removeUserService(user)

			// delete user from cachedState
			Object.keys(platform.cachedState).forEach(sensor => {
				const userIndex = this.cachedState[sensor].indexOf(service.subtype)
				if (userIndex !== -1)
					this.cachedState[sensor].splice(userIndex, 1)
			})
	})
}


const removeUserService = (user) => {
	const nameId = 'user' + user.userId
	
	platform.cachedAccessories.forEach(accessory => {
		accessory.removeService(nameId)
	})
}