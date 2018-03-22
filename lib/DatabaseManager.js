'use strict';

const settings = require('../settings');
const mongoose = require('mongoose');
const Position = require('./models/Position');


class DatabaseManager {
	constructor() {
		this.db = mongoose.connection;
		this.db.on('error', console.error.bind(console, 'DB connection error:'));
		this.db.once('open', function() {
			console.log(`DB Connected!`);
		});

		mongoose.connect(settings.mongodb.connection_string);
	}

	async addPosition(positionData) {
		var position = new Position(positionData);
		return position.save();
	}

	async updatePositionById(id, data) {
		return Position.update({_id : id }, data).exec();
	}

	async deletePositionById(id) {
		return Position.findOneAndRemove({_id : id}).exec();
	}

	async updatePositionByUuid(uuid, data) {
		return Position.update({uuid : uuid }, data).exec();
	}

	async getAllPositions() {
		return Position.find({}).exec();
	}

	async getAllActivePostions() {
		return Position.find({$or:[{orderStatus: 'open'},{orderStatus:'partial'},{orderStatus:'fulfilled'}]}).exec();
	}

	async positionBySignalExists(signal) {
		return Position.findOne({
			signalRawTimeString : signal.time,
			signalPrice : signal.lastprice,
			coin : signal.market.split('-')[1]
		}).exec().then((doc) => {
			if (doc) {
				return Promise.resolve(true);
			} else {
				return Promise.resolve(false);
			}
		});
	}


	terminate() {
		if (mongoose.connection.readyState === 1) {
			console.log(`\nTerminating DB connection.`);
			mongoose.connection.close();
		}
	}




}

module.exports = DatabaseManager;



