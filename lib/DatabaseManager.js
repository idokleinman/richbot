'use strict';

const settings = require('../settings');
const mongoose = require('mongoose');
const Position = require('./models/Position');


class DatabaseManager {
	constructor() {
		let options = {server:{auto_reconnect:true}};
		this.db = mongoose.connection;

		this.db.on('error', function(error) {
			console.error('DB connection error: ' + error);
			mongoose.disconnect();
		});

		this.db.once('open', function() {
			console.log(`DB Connected!`);
		});

		this.db.on('reconnected', function () {
			console.log('DB reconnected!');
		});

		this.db.on('disconnected', function() {
			console.log('DB disconnected!');
			mongoose.connect(settings.mongodb.connection_string, options);
		});

		mongoose.connect(settings.mongodb.connection_string, options);
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

	async getAllPositions() {
		return Position.find({}).exec();
	}

	async getAllActivePostions() {
		return Position.find({$or:[{status: 'open'},{status:'partial'},{status:'active'}]}).exec();
	}

	async positionBySignalExists(signal) {
		return Position.findOne({
			signalTime : signal.time, // must be converted to ISO date
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



