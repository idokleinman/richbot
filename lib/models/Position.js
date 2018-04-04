'use strict';

const mongoose = require('mongoose');

var positionSchema = mongoose.Schema({

	coin : {type: String, required: true},
	baseAsset : {type: String, default: 'BTC'},

	// UUID of exchange orders (bittrex)
	buyOrderId: String,
	sellOrderId: String,
	StopLossOrderId: String,

	// Data from MH signal
	signalVolume: Number,
	signalRawTimeString : String,
	signalPrice : {type: Number, required: true},

	buyPrice : Number, // Actual buy price (average if more than one chunk)
	sellPrice : Number, // Actual sell price (average if more than one chunk)
	exchange : {type: String, default: 'bittrex', required: true},
 	quantity : {type: Number, required: true}, // calculated amount to be bought
	quantityBought : {type: Number, default: 0}, // actual amount bought
	quantitySold : {type: Number, default: 0}, // amount sold if sold=bought position is closed

	boughtAt : Date,
	soldAt : Date,
	positionStatus : {
		type: String,
		enum: ['open', 'partial', 'active', 'closed', 'cancelled'],
		default: 'open',
	},
	positionCloseReason : {
		type: String,
		enum: ['gain', 'stoploss', 'trailing_stoploss', 'cancelled', 'expired'],
	},
	simulated : Boolean,
	// performance - calculated gain/loss (helper field)

}, { timestamps: {createdAt: 'createdAt', updatedAt: 'updatedAt' } });


module.exports = mongoose.model('positions', positionSchema);