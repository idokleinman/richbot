'use strict';
// require db
const BittrexController = require('./BittrexController');
const settings = require('../settings');
const uuidLib = require('uuid/v1');
const DatabaseManager = require('./DatabaseManager');
const Queue = require('bull');



const PositionStatus = Object.freeze({
	OPEN: Symbol('open'),
	PARTIAL: Symbol('partial'),
	ACTIVE: Symbol('active'),
	CLOSED: Symbol('closed'),
	CANCELLED: Symbol('cancelled')
});

const positionCloseReason = Object.freeze({
	GAIN: Symbol('gain'),
	STOPLOSS: Symbol('stoploss'),
	TRAILING_STOPLOSS: Symbol('trailing_stoploss'),
	CANCELLED: Symbol('cancelled'),
	EXPIRED: Symbol('expired')
});





class PositionsManager {


	constructor() {
		this.bittrex = new BittrexController();
		this.db = new DatabaseManager();
		// setTimeout(this._startMonitoringPositionsBittrex.bind(this), settings.bittrex.polling_interval*1000);
		this.timer = setInterval(this.monitorPositionsBittrex.bind(this), settings.bittrex.polling_interval*1000);
	}


	monitorPositionsBittrex() {
		console.log(`- positionsManagerBittrex iteration (timestamp: ${new Date()})`);

		this.db.getAllActivePostions().then((positions) => {
			positions.forEach(async function(position) {
				// ...
				console.log(position); // do shit

				if (position.exchange === 'bittrex') {
					if (position.simulated) {

					}

				}


				// check position status -
				// if simulated, and open orders scan all coins and if tick is lower than buy price mark fulfilled
				// if non simulated - scan all the open orders in the exchange and see if any executed from the last time,
				// update positions accordingly (and report)
				// if partial/fulfilled - check strategy - get tick of position - arm trailing stoploss if needed,
				// check stoploss, check gain, modify position and open orders accordingly
				// if non simulated and sell needed, cancel stoploss order, generate sell order in exchange, monitor tied sell
				// order
				// mark closed + reason + report
			});

		});

	}

	_startMonitoringPositionsBittrex() {
		this.timer = setInterval(this.monitorPositionsBittrex.bind(this), settings.bittrex.polling_interval*1000);
	}

	terminate() {
		clearInterval(this.timer);
		this.db.terminate();
	}

	async _getOpenPositionsNum() {
		return this.db.getAllActivePostions().then((docs) => {
			// console.log('_getOpenPositionsNum');
			// console.log(docs);
			// console.log(docs.length);

			return docs.length;
		});
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
		console.log('- Enter position');

		if (await this.db.positionBySignalExists(signal)) {
			let errMsg = `~ Not executed: Position for this signal already exists`; // might need to silence this one
			return Promise.reject(new Error(errMsg));
		}

		// only bittrex is supported currently
		let exchange = signal.exchange;
		if (!settings.trade.active_exchanges.includes(exchange)) {
			let errMsg = '~ Not executed: Signal is on non-traded exchange';
			return Promise.reject(new Error(errMsg));
		}

		let baseAsset = signal.market.split('-')[0];
		let coin = signal.market.split('-')[1];
		if (!settings.trade.base_assets.includes(baseAsset)) {
			let errMsg = `~ Not executed: Signal is on non-traded base asset (${baseAsset})`;
			return Promise.reject(new Error(errMsg));
		}

		if (settings.trade.coin_blacklist.includes(coin)) {
			let errMsg = `~ Not executed: Signal is on a blacklisted coin (${coin})`;
			return Promise.reject(new Error(errMsg));
		}

		let openPositionsCount = await this._getOpenPositionsNum();
		if (openPositionsCount >= settings.trade.max_open_positions) {
			let errMsg = `~ Not executed: Maximum open positions exceeded`;
			return Promise.reject(new Error(errMsg));
		}

		console.log(signal);

		let buyAbovePriceCoef = 1+(settings.trade.buy_signal_above_max_percentage/100);
		let quantity;
		let buyLimitPrice;

		if (baseAsset === 'BTC') {

			let requiredTradeAmount = settings.trade.total_btc_to_trade * (settings.trade.percentage_of_budget_per_position / 100);

			let availableBalance = await this.bittrexController.getBalance(baseAsset).catch((err) => {
				console.log('! Not executed: Error retrieving available balance from Bittrex:');
				console.log(err);
				return Promise.reject(err);
			});

			let tradeAmount = Math.min(availableBalance, requiredTradeAmount);

			if (tradeAmount < settings.trade.min_btc_per_position) {
				let errMsg = `~ Not executed: Position to open is below minimum of ${settings.trade.min_btc_per_position}${baseAsset}`;
				console.log(errMsg);
				return Promise.reject(new Error(errMsg));
			}

			buyLimitPrice = (parseFloat(signal.lastprice) * buyAbovePriceCoef).toFixed(10);
			quantity = (tradeAmount / buyLimitPrice).toFixed(4);
		}

		console.log(`- Going to buy limit ${quantity}${coin} at price ${buyLimitPrice}${baseAsset}`);

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
			console.log(`! Error adding position to database ${error}`);
			return Promise.reject(error);
		});

		// console.log('position document:');
		// console.log(positionDoc);

		if (!settings.trade.simulated_trading) {
			uuid = await this.bittrexController.buyLimit(signal.market, quantity, buyLimitPrice);

			if (!uuid) {
				console.log(`! Error placing buy limit order in ${exchange}, reverting position`);
				await this.db.deletePositionById(positionDoc._id); // rollback if placing order failed
				return Promise.reject(error);
			}
		} else {
			uuid = uuidLib(); // simulate it
		}

		await this.db.updatePositionById(positionDoc._id, {buyOrderId: uuid});
		return Promise.resolve(uuid);

	}




	_monitor() {
		// TODO: use bull with cron timing?

		// check on open/pending positions and make sure they're handled by strategy

	}
}

module.exports = PositionsManager;
