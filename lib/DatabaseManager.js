'use strict';

const settings = require('../settings');
const mongoose = require('mongoose');
const Position = require('./models/Position');
const logger = require('./utils/logger');

class DatabaseManager {
	constructor() {

		this.options = { auto_reconnect : true, reconnectTries : 100000 };
		this.db = mongoose.connection;

		this.db.on('error', function(error) {
			logger.error(`DB connection error: ${error}`);
			mongoose.disconnect();
		});

		this.db.once('open', function() {
			logger.info(`DB Connected`);
		});

		this.db.on('reconnected', function () {
			logger.info(`DB reconnected`);
		});

		this.db.on('disconnected', function() {
			logger.warn(`DB disconnected`);
			mongoose.connect(settings.mongodb.connection_string, this.options);
		});

		mongoose.connect(settings.mongodb.connection_string, this.options);
	}

	reconnect() {
		mongoose.connection.close(true, function() {
			mongoose.connect(settings.mongodb.connection_string, this.options);
		});

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
			logger.info(`\nTerminating DB connection.`);
			mongoose.connection.close();
		}
	}
}

module.exports = DatabaseManager;



