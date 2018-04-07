'use strict';
// require db
const BittrexController = require('./BittrexController');
const settings = require('../settings');
const uuidLib = require('uuid/v1');
const DatabaseManager = require('./DatabaseManager');
const Queue = require('bull');


/*
const PositionStatus = Object.freeze({
	OPEN: Symbol('open'),
	PARTIAL: Symbol('partial'),
	ACTIVE: Symbol('active'),
	CLOSED: Symbol('closed'),
	CANCELLED: Symbol('cancelled')
});

const PositionCloseReason = Object.freeze({
	GAIN: Symbol('gain'),
	STOPLOSS: Symbol('stoploss'),
	TRAILING_STOPLOSS: Symbol('trailing_stoploss'),
	CANCELLED: Symbol('cancelled'),
	EXPIRED: Symbol('expired')
});
*/



class PositionsManager {

	constructor() {
		this.bittrex = new BittrexController();
		this.db = new DatabaseManager();
		// setTimeout(this._startMonitoringPositionsBittrex.bind(this), settings.bittrex.polling_interval*1000);
		this.timer = setInterval(this.monitorPositionsBittrex.bind(this), settings.bittrex.polling_interval*1000);
	}


	monitorPositionsBittrex() {
		this.db.getAllActivePostions().then((positions) => {
			let self = this;
			positions.forEach(async function(position) {
				// console.log(`- forEach Analyzing position: ${position}`);

				if (position.exchange === 'bittrex') {
					let marketName = `${position.baseAsset}-${position.coin}`;
					if (position.simulated) {
						let tick = await self.bittrex.getLatestTick(marketName).catch(error => {
							console.log('! monitorPositionsBittrex -> getLatestTick failed: '+error);
							return;
						});
						tick = tick[0];

						if (!tick) {
							console.log('! monitorPositionsBittrex -> getLatestTick did not retrieve valid tick data');
							return;
						}
						// console.log(`- Analyzing pending position: ${position} with tick:`);
						// console.log(tick);
						if (position.status === 'open') {
							// todo: expiry check should happen regardless of simulated mode
							let nowTime = new Date();
							let diff = (nowTime - position.createdAt) / 1000;
							if (diff > settings.trade.max_time_open_orders) {
								await self.db.updatePositionById(position._id, {
									status: 'closed',
									closeReason: 'expired'
								}).catch(error => {
									console.log('! monitorPositionsBittrex -> updatePositionById failed: ' + error);
								});
								console.log(`* ${new Date()}: Open position on ${marketName} expired.`);
								return; // next position
							}

							// console.log('position is open');
							if (tick.L <= position.signalPrice) { // && (tick.H > position.signalPrice)) {
								// if lowest value of last candle > needed buy price, assume it was purchased whole
								await self.db.updatePositionById(position._id, {
									status: 'active',
									quantityBought: position.quantity,
									buyPrice: tick.L,
									boughtAt: new Date(), //todo: like this?
									buyOrderId: 'simulated'
								}).catch(error => {
									console.log('! monitorPositionsBittrex->updatePositionById: '+error);
								});
								console.log(`* ${new Date()}: Bought simulated position on ${marketName}, qty: ${position.quantity}, price: ${tick.L}${position.baseAsset}.`);

							}
						} else if (position.status === 'active') {
							// console.log(`- Analyzing active position: ${position} with tick:`);
							// console.log(tick);
							// check expiry time and sell/cancel (not bought = cancelled, if bought check max time to keep open)
							// ...

							let stopLossPrice = position.buyPrice * (1 - settings.trade.stop_loss_percentage / 100);

							if ((tick.L <= stopLossPrice) && (setting.trade.stop_loss_enabled)) {
								// if lowest value of last candle > needed buy price, assume it was purchased whole
								await self.db.updatePositionById(position._id, {
									status: 'closed',
									closeReason: 'stoploss',
									quantitySold: position.quantityBought,
									sellPrice: stopLossPrice,
									sellOrderId: 'simulated',
								}).catch(error => {
									console.log('! monitorPositionsBittrex->updatePositionById: ' + error);
								});
								let lossBaseAsset = position.quantityBought*(stopLossPrice-position.buyPrice);
								let lossPercentage = parseFloat(lossBaseAsset/(position.quantityBought * position.buyPrice)*100).toFixed(2);

								console.log(`* ${new Date()}: Sold simulated position on ${marketName}, qty: ${position.quantityBought}, price: ${stopLossPrice}${position.baseAsset}, due to stoploss (${lossBaseAsset}${position.baseAsset} / %${lossPercentage})`);
								return;
							}

							if (settings.trade.sell_signal_at_profit) {
								let sellPrice = position.buyPrice * (1 + settings.trade.sell_at_profit_percentage / 100);

								if (tick.H >= sellPrice) {
									// if lowest value of last candle > needed buy price, assume it was purchased whole
									await self.db.updatePositionById(position._id, {
										status: 'closed',
										closeReason: 'gain',
										quantitySold: position.quantityBought,
										sellPrice: sellPrice,
										soldAt: new Date(), // todo: like this?
										sellOrderId: 'simulated',
									}).catch(error => {
										console.log('! monitorPositionsBittrex->updatePositionById: ' + error);
									});

									let profitBaseAsset = position.quantityBought * (sellPrice - position.buyPrice);
									let profitPercentage = parseFloat(profitBaseAsset / (position.quantityBought * position.buyPrice) * 100).toFixed(2);

									console.log(`* ${new Date()}: Sold simulated position on ${marketName}, qty: ${position.quantityBought}, price: ${sellPrice}, due to gain (${profitBaseAsset}${position.baseAsset} / %${profitPercentage})`);

								}
							} else {
								// todo: not implemented - trailing stoploss strategy
								// if (coin cur_price * 1+arm%/100 > buyPrice) then armed = true
								// if armed (coin cur_price * 1+arm%/100 > buyPrice)
								// new_stoploss = coin cur_price * (1-trailing_sl/100);
								// if new_stoploss > stoploss { stoploss = new_stoploss }
								// modify stoploss order in exchange
							}
						}

					} else { // if simulated
						// handle real buy/sell trades in bittrex
					}


				} // handle other exchanges?


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
		console.log('- Creating new position');

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

		let buyAbovePriceCoef = 1+(settings.trade.buy_signal_above_max_percentage/100);
		let quantity;
		let buyLimitPrice;

		if (baseAsset === 'BTC') {

			let requiredTradeAmount = settings.trade.total_btc_to_trade * (settings.trade.percentage_of_budget_per_position / 100);

			let availableBalance = await this.bittrex.getBalance(baseAsset).catch((err) => {
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
			signalTime : signal.time,
			buyPrice: buyLimitPrice,
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
			uuid = await this.bittrex.buyLimit(signal.market, quantity, buyLimitPrice);

			if (!uuid) {
				console.log(`! Error placing buy limit order in ${exchange}, reverting position`);
				await this.db.deletePositionById(positionDoc._id); // rollback if placing order failed ??
				return Promise.reject(error);
			}
			await this.db.updatePositionById(positionDoc._id, {buyOrderId: uuid}).catch((error) => {
				console.log(`! Error adding buy order UUID to position ${error}`);
				return Promise.reject(error);
			});
		} else {
			// uuid = uuidLib(); // simulate it
		}

		// return Promise.resolve(uuid);
		return Promise.resolve(true);

	}

}

module.exports = PositionsManager;
