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
		this.dbManager = new DatabaseManager();

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
		console.log('Enter position: ');
		console.log(signal);

		// only bittrex is supported currently
		let exchange = signal.exchange;
		if (!settings.trade.active_exchanges.includes(exchange)) {
			console.log('Not executed: Signal is on non-traded exchange');
			return 0; // reject? return error object?
		}

		let baseAsset = signal.market.split('-')[0];
		let coin = signal.market.split('-')[1];
		if (!settings.trade.base_assets.includes(baseAsset)) {
			console.log(`Not executed: Signal is on non-traded base asset (${baseAsset})`);
			return 0;
		}


		if (!settings.trade.coin_blacklist.includes(coin)) {
			console.log(`Not executed: Signal is on blacklisted coin (${coin})`);
			return 0;
		}

		if (this.openPositionsCount > settings.trade.max_open_positions) {
			console.log('Not executed: Maximum open positions exceeded');
			return 0;
		}

		let buyAbovePriceCoef= 1+(settings.trade.buy_signal_above_max_percentage/100);
		let quantity;
		let buyLimitPrice;

		if (baseAsset === 'BTC') {

			let requiredTradeAmount = settings.trade.total_btc_to_trade * (percentage_of_budget_per_position / 100);

			let availableBalance = await this.bittrexController.getBalance(baseAsset);
			// this.bittrexController.getBalance(baseAsset).then((result) => {
			// 	console.log(`BitTrex BTC balance: ${result}`);
			// })

			let tradeAmount = math.min(availableBalance, requiredTradeAmount);

			if (tradeAmount < settings.trade.min_btc_per_position) {
				console.log(`Not executed: Position to open is below minimum of ${settings.trade.min_btc_per_position}${baseAsset}`);
				return 0;
			}

			buyLimitPrice = (signal.lastPrice * buyAbovePriceCoef);
			quantity = tradeAmount / buyLimitPrice;
		}


		let uuid;

		let positionDoc = await this.dbManager.addPosition({
			// uuid,
			signalPrice : signal.lastprice,
			signalVolume: signal.basevolume,
			exchange,
			price: buyLimitPrice,
			quantity,
			simulated : settings.trade.simulated_trading,
			coin
		}).catch((error) => {
			console.log('ERROR: could not add position to database');
			return Promise.reject(error);
		});

		if (!settings.trade.simulated_trading) {
			uuid = await this.bittrexController.buyLimit(signal.market, quantity, buyLimitPrice).catch((error) => {
				console.log(`Could not place buy limit order in ${exchange}`);

			})
		} else {
			uuid = uuidLib();
			// newPositionPromise = Promise.resolve(uuid()); // new ?
		}

		await this.dbManager.updatePositionById(positionDoc._id, {uuid});

	}

	_monitor() {
		// TODO: use bull with cron timing?

		// check on open/pending positions and make sure they're handled by strategy

	}
}

module.exports = PositionsManager;
