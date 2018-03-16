'use strict';

const settings = require('../settings');
const mongoose = require('mongoose');
const Position = require('./models/Position');


class DatabaseManager {
	constructor() {
		this.db = mongoose.connection;
		this.db.on('error', console.error.bind(console, 'connection error:'));
		this.db.once('open', function() {
			console.log(`we're connected!`);
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
		Position.findOne({
			signalRawTimeString : signal.time,
			signalPrice : signal.lastprice,
			coin : signal.market.split('-')[1]
		}).exec().then((doc) => {
			console.log('positionBySignalExists');
			console.log(doc);
			if (doc) {
				return true;
			} else {
				return false;
			}
		})
	}





}

module.exports = DatabaseManager;



