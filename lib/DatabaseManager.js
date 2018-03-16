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
		return Position.update({_id : id }, data);
	}

	async deletePositionById(id) {
		return Position.findOneAndRemove({_id : id});
	}

	async updatePositionByUuid(uuid, data) {
		return Position.update({uuid : uuid }, data);
	}

	async getAllPositions() {
		return Position.find({});
	}

	async getAllActivePostions() {
		return Position.find({$or:[{orderStatus: 'open'},{orderStatus:'partial'},{orderStatus:'fulfilled'}]});
	}





}

module.exports = DatabaseManager;



