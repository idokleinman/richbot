'use strict';

const mongoose = require('mongoose');

var positionSchema = mongoose.Schema({
	buyOrderId: String,
	sellOrderId: String,
	StopLossOrderId: String,
	signalPrice : {type: Number, required: true},
	signalVolume: Number,
	signalRawTimeString : String,
	price : {type: Number, required: true},
	exchange : {type: String, default: 'bittrex', required: true},
	executePrice : Number, // average?
 	quantity : {type: Number, required: true},
	quantityExecuted : Number,

	executedAt : Date,
	// orderType : {
	// 	type: String,
	// 	enum: ['buy', 'sell'],
	// 	default: 'buy'
	// },
	positionStatus : {
		type: String,
		enum: ['open', 'partial', 'fulfilled', 'closed', 'cancelled'],
		default: 'open',
	},
	positionCloseType : {
		type: String,
		enum: ['gain', 'stoploss', 'trailing_stoploss', 'cancelled', 'expired'],
	},
	simulated : Boolean,
	coin : String,
	baseAsset : {type: String, default: 'BTC'}
	// ...
}, { timestamps: {createdAt: 'createdAt', updatedAt: 'updatedAt' } });


module.exports = mongoose.model('positions', positionSchema);