'use strict';

const mongoose = require('mongoose');

var positionSchema = mongoose.Schema({
	uuid: String,
	signalPrice : Number,
	price : Number,
	issueTime : Date,
	orderStatus : {
		type: String,
		enum: ['open', 'partial', 'fulfilled', 'closed'],
		default: 'open'
	},
	simulated : Boolean,
	coin : String,
	baseAsset : String,
	// ...
});

module.exports = mongoose.model('positions', positionSchema);