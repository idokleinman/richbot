'use strict';

const mongoose = require('mongoose');

var positionSchema = mongoose.Schema({
	uuid: String,
	signalPrice : Number,
	signalVolume: Number,
	price : Number,
	exchange : {type: String, default: 'bittrex'},
	executePrice : Number, // average?
 	quantity : Number,
	quantityExecuted : Number,

	executedAt : Date,
	orderType : {
		type: String,
		enum: ['buy', 'sell'],
		default: 'buy'
	},
	orderStatus : {
		type: String,
		enum: ['open', 'partial', 'fulfilled', 'closed', 'cancelled'],
		default: 'open'
	},
	simulated : Boolean,
	coin : String,
	baseAsset : {type: String, default: 'BTC'}
	// ...
}, { timestamps: {createdAt: 'createdAt', updatedAt: 'updatedAt' } });


module.exports = mongoose.model('positions', positionSchema);