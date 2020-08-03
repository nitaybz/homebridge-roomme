const  _ = require('lodash/array');
const OccupancySensor = require('./OccupancySensor');

const dbUpdate = async function (data) {
	this.Service = this.api.hap.Service;
	this.Characteristic = this.api.hap.Characteristic;

		let cachedData = await this.storage.getItem('DataBaseCache')
		if (!cachedData)
			cachedData = {
				users: [],
				rooms: []
			}

		//find new rooms in DB
		const newRooms = _.differenceBy(data.rooms, cachedData.rooms, (room) => room.sensorId)
		//find cached rooms that was removed from DB
		const removedRooms = _.differenceBy(cachedData.rooms, data.rooms, (room) => room.sensorId)
		//find new users in DB
		const newUsers = _.differenceBy(data.users, cachedData.users, (user) => user.userId)
		//find cached users that was removed from DB
		const removedUsers = _.differenceBy(cachedData.users, data.users, (user) => user.userId)

		await this.storage.setItem('DataBaseCache', data)

		if (newRooms.length || newUsers.length)
			addNewAccessories(newRooms, newUsers, data)

		if (removedRooms.length || removedUsers.length)
			removeCachedAccessories(removedRooms, removedUsers)

		// store recent data in storage
		await this.storage.setItem('DataBaseCache', data)

}

module.exports = dbUpdate


const addNewAccessories = (newRooms, newUsers, data) => {

	// add new rooms to all users
	newRooms.forEach(room => {
		this.log(`Found New Room  --> ${room.name}`)
		addRoomAccessory(room, data.users)
	})

	// remove the handled new rooms and leave only old rooms
	const oldRooms = _.differenceBy(data.rooms, newRooms, (room) => room.sensorId)

	// add new users to old rooms
	newUsers.forEach(user => {
		this.log(`Found New User  --> ${user.name}`)
		oldRooms.forEach(room => {
			addUserService(room, user)
		})
	})
}

const addRoomAccessory = (room, users) => {
	const uuid = this.UUIDGen.generate(room.sensorId)
	if (!this.cachedAccessories.find(accessory => accessory.UUID === uuid)) {

		// create a new accessory
		const config = {
			name: room.name + ' ' + user.name,
			sensorId: room.sensorId ,
			roomName: room.name ,
			users: users,
			uuid: uuid
		}
		
		const newSensor = new OccupancySensor(this.log, config, this.api)
		this.cachedAccessories.push(newSensor.accessory)
		// register the accessory
		this.api.registerPlatformAccessories('homebridge-roomme', 'RoomMe', [newSensor.accessory]);
	}
}


const addUserService = (room, user) => {
	const nameId = 'user' + user.userId

	const roomAccessory = this.cachedAccessories.find(accessory => accessory.context.sensorId === room.sensorId)
	const OccupancyService = roomAccessory.addService(this.Service.OccupancySensor, nameId, nameId)


	OccupancyService.setCharacteristic(this.Characteristic.Name)
		.updateValue(room.name + ' ' + user.name)

	OccupancyService.setCharacteristic(this.Characteristic.OccupancyDetected)
		.updateValue(0)
		// .on('get', this.state)

	OccupancyService.setCharacteristic(this.Characteristic.	StatusLowBattery)
		.updateValue(0)
}



const removeCachedAccessories = (removedRooms, removedUsers) => {

	const accessoriesToRemove = []
	
	// remove cached rooms
	removedRooms.forEach(room => {
		const removedAccessory = this.cachedAccessories.find(accessory => accessory.context.sensorId === room.sensorId)
		if (removedAccessory) {
			this.log(`Removing Cached Room Sensors --> ${room.name}(${room.sensorId})`)
			accessoriesToRemove.push(removedAccessory)
		}
	})

	// remove "Removed" rooms from cache
	this.cachedAccessories = _.pullAllBy(this.cachedAccessories, accessoriesToRemove, (accessory) => accessory.UUID)
	// unregister the accessories
	this.api.unregisterPlatformAccessories('homebridge-roomme', 'RoomMe', accessoriesToRemove);

	// remove cached users
	removedUsers.forEach(user => {
			this.log(`Removing Cached Users Sensors --> ${room.name}(${room.sensorId})`)
			removeUserService(user)
	})
}


const removeUserService = (user) => {
	const nameId = 'user' + user.userId
	
	this.cachedAccessories.forEach(accessory => {
		accessory.removeService(nameId)
	})
}