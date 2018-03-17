'use strict';
// require db
const BittrexController = require('./BittrexController');
const settings = require('../settings');
const uuidLib = require('uuid/v1');
const DatabaseManager = require('./DatabaseManager');

const PositionStatus = Object.freeze({
	OPEN:   Symbol('open'),
	PARTIAL:  Symbol('partial'),
	FULFILLED: Symbol('fulfilled'),
	CLOSED: Symbol('closed')
});

const positionCloseReason = Object.freeze({
	GAIN:   Symbol('gain'),
	STOPLOSS:  Symbol('stoploss'),
	TRAILING_STOPLOSS: Symbol('trailing_stoploss'),
	EXPIRED: Symbol('expired')
});

class PositionsManager {

	constructor() {
		// load open positions from db

		this.bittrexController = new BittrexController();
		this.db = new DatabaseManager();

		this.openPositionsCount = 0; // get from DB

	}




	async enter(signal) { // pair, exchange='bittrex', buyprice) {
		/*
			market	"BTC-INCNT"
			lastprice	"0.00004818"
			signalmode	"RISE"
			exchange	"bittrex"
			basevolume	68.24788553
			time	"2017-12-31 11:52:01"
		 */
		console.log('Enter position --- ');
		console.log(signal);
		if (await this.db.positionBySignalExists(signal)) {
			let errMsg = `Not executed: Position for this signal already exists`; // might need to silence this one
			return Promise.reject(new Error(errMsg));
		}

		// only bittrex is supported currently
		let exchange = signal.exchange;
		if (!settings.trade.active_exchanges.includes(exchange)) {
			let errMsg = 'Not executed: Signal is on non-traded exchange';
			return Promise.reject(new Error(errMsg));
		}

		let baseAsset = signal.market.split('-')[0];
		let coin = signal.market.split('-')[1];
		if (!settings.trade.base_assets.includes(baseAsset)) {
			let errMsg = `Not executed: Signal is on non-traded base asset (${baseAsset})`;
			return Promise.reject(new Error(errMsg));
		}


		if (settings.trade.coin_blacklist.includes(coin)) {
			let errMsg = `Not executed: Signal is on blacklisted coin (${coin})`;
			return Promise.reject(new Error(errMsg));
		}

		if (this.openPositionsCount > settings.trade.max_open_positions) {
			let errMsg = `Not executed: Maximum open positions exceeded`;
			return Promise.reject(new Error(errMsg));
		}

		let buyAbovePriceCoef= 1+(settings.trade.buy_signal_above_max_percentage/100);
		let quantity;
		let buyLimitPrice;

		if (baseAsset === 'BTC') {

			let requiredTradeAmount = settings.trade.total_btc_to_trade * (settings.trade.percentage_of_budget_per_position / 100);

			let availableBalance = await this.bittrexController.getBalance(baseAsset).catch((err) => {
				console.log('Error retrieving available balance from Bittrex:');
				console.log(err);
				return Promise.reject(err);
			});

			let tradeAmount = Math.min(availableBalance, requiredTradeAmount);

			if (tradeAmount < settings.trade.min_btc_per_position) {
				let errMsg = `Not executed: Position to open is below minimum of ${settings.trade.min_btc_per_position}${baseAsset}`;
				console.log(errMsg);
				return Promise.reject(new Error(errMsg));			}

			buyLimitPrice = (parseFloat(signal.lastprice) * buyAbovePriceCoef).toFixed(10);
			quantity = (tradeAmount / buyLimitPrice).toFixed(4);
		}

		console.log(`-> Going to buy limit ${quantity}${coin} at price ${buyLimitPrice}${baseAsset}`);

		let uuid;

		let positionDoc = await this.db.addPosition({
			// uuid,
			signalPrice : signal.lastprice,
			signalVolume: signal.basevolume,
			exchange,
			signalRawTimeString : signal.time,
			price: buyLimitPrice,
			quantity,
			simulated : settings.trade.simulated_trading,
			coin
		}).catch((error) => {
			console.log('ERROR: could not add position to database:');
			console.log(error); // check
			return Promise.reject(error);
		});

		// console.log('position document:');
		// console.log(positionDoc);

		if (!settings.trade.simulated_trading) {
			uuid = await this.bittrexController.buyLimit(signal.market, quantity, buyLimitPrice);

			if (!uuid) {
				console.log(`Could not place buy limit order in ${exchange}:`);
				await this.db.deletePositionById(positionDoc._id); // rollback if placing order failed
				return Promise.reject(error);
			}
		} else {
			uuid = uuidLib();
		}

		await this.db.updatePositionById(positionDoc._id, {uuid});
		return Promise.resolve(uuid);

	}

	_monitor() {
		// TODO: use bull with cron timing?

		// check on open/pending positions and make sure they're handled by strategy

	}
}

module.exports = PositionsManager;
