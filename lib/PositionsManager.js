'use strict';
// require db
const BittrexController = require('./BittrexController');
const settings = require('../settings');
const uuidLib = require('uuid/v1');
const DatabaseManager = require('./DatabaseManager');
const Queue = require('bull');
const logger = require('./utils/logger');



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

let lastLossGain = 0;

class PositionsManager {

	constructor() {
		this.bittrex = new BittrexController();
		this.db = new DatabaseManager();
		// setTimeout(this._startMonitoringPositionsBittrex.bind(this), settings.bittrex.polling_interval*1000);
		this.timer = setInterval(this.monitorPositions.bind(this), settings.bittrex.polling_interval*1000);
	}

	isDatabaseConnected() {
		return this.db.isConnected();
	}



	monitorPositions() {

		if (!this.db.isConnected()) {
			logger.warn(`Database not connected, cannot monitor positions. Trying to reconnect...`);
			this.db.reconnect();
			return;
		}

		this.db.getAllActivePostions().catch((error) => {
			logger.error(`Failed retrieving positions - ${error}`);
			return;

		}).then((positions) => {
			if (!positions) {
				logger.error(`Failed retrieving positions`);
				return;
			}

			process.stdout.write(`+`);

			let self = this;
			positions.forEach(async function(position) {
				// logger.debug(`Analyzing position: ${JSON.stringify(position)}`);

				if (position.exchange === 'bittrex') {
					let marketName = `${position.baseAsset}-${position.coin}`;

					if (position.simulated) {
						let tick = await self.bittrex.getLatestTick(marketName).catch(error => {
							logger.error(`monitorPositions -> getLatestTick failed ${JSON.stringify(error)}`);
							return;
						});


						if ((!tick) || (tick && !tick[0])) {
							logger.error('monitorPositions -> getLatestTick did not retrieve valid tick data');
							return;
						} else {
							tick = tick[0];
						}

						// logger.debug(`Got tick from Bittrex: ${JSON.stringify(tick)}`);

						let curLossGain = (((tick.C / position.signalPrice) - 1) * 100).toFixed(2);
						if (curLossGain !== lastLossGain) {
							logger.info(`Analyzing position on ${marketName} now at ${curLossGain}%`);
							lastLossGain = curLossGain;
						}

						if (position.status === 'open') {
							// todo: expiry check should happen regardless of simulated mode
							let nowTime = new Date();
							let diff = (nowTime - position.createdAt) / 1000;
							if (diff > settings.trade.max_time_open_orders) {
								await self.db.updatePositionById(position._id, {
									status: 'closed',
									closeReason: 'expired'
								}).catch(error => {
									logger.error('monitorPositions -> updatePositionById failed: ' + error);
								});
								logger.info(`Open position on ${marketName} expired.`);
								return; // next position
							}

							if (tick.L <= position.signalPrice) { // && (tick.H > position.signalPrice)) {
								// if lowest value of last candle > needed buy price, assume it was purchased whole
								await self.db.updatePositionById(position._id, {
									status: 'active',
									quantityBought: position.quantity,
									buyPrice: tick.L,
									boughtAt: new Date(), //todo: like this?
									buyOrderId: 'simulated'
								}).catch(error => {
									logger.error('monitorPositions -> updatePositionById: '+error);
								});
								// TODO: not display this in cases of an error (try/catch or then)
								logger.info(`Bought simulated position on ${marketName}, qty: ${position.quantity}, price: ${tick.L}${position.baseAsset}.`);

							}
						} else if (position.status === 'active') {
							// check expiry time and sell/cancel (not bought = cancelled, if bought check max time to keep open)
							// ...

							let stopLossPrice = position.buyPrice * (1 - settings.trade.stop_loss_percentage / 100);

							if ((tick.L <= stopLossPrice) && (settings.trade.stop_loss_enabled)) {
								// if lowest value of last candle > needed buy price, assume it was purchased whole
								await self.db.updatePositionById(position._id, {
									status: 'closed',
									closeReason: 'stoploss',
									quantitySold: position.quantityBought,
									sellPrice: stopLossPrice,
									sellOrderId: 'simulated',
								}).catch(error => {
									logger.error(`monitorPositions -> updatePositionById: ${error}`);
								});
								let lossBaseAsset = position.quantityBought*(stopLossPrice-position.buyPrice);
								let lossPercentage = parseFloat(lossBaseAsset/(position.quantityBought * position.buyPrice)*100).toFixed(2);

								logger.info(`Sold simulated position on ${marketName}, qty: ${position.quantityBought}, price: ${stopLossPrice}${position.baseAsset}, due to stoploss (${lossBaseAsset}${position.baseAsset} / %${lossPercentage})`);
								return;
							}

							if (settings.trade.sell_signal_at_profit) {
								let sellPrice = position.buyPrice * (1 + settings.trade.sell_at_profit_percentage / 100);

								if (tick.H >= sellPrice) {
									// if highest value of last candle > needed sell price, assume it was sold whole
									if (tick.C > sellPrice) { // even higher gain if tick closed higher
										sellPrice = tick.C;
									}
									await self.db.updatePositionById(position._id, {
										status: 'closed',
										closeReason: 'gain',
										quantitySold: position.quantityBought,
										sellPrice: sellPrice,
										soldAt: new Date(), // todo: like this?
										sellOrderId: 'simulated',
									}).catch(error => {
										logger.error(`monitorPositions -> updatePositionById: ${JSON.stringify(error)}`);
									});

									let profitBaseAsset = position.quantityBought * (sellPrice - position.buyPrice);
									let profitPercentage = parseFloat(profitBaseAsset / (position.quantityBought * position.buyPrice) * 100).toFixed(2);

									logger.info(`Sold simulated position on ${marketName}, qty: ${position.quantityBought}, price: ${sellPrice}, due to profit (${profitBaseAsset}${position.baseAsset} / %${profitPercentage})`);

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

					} else { // if (not) simulated

						// real positions monitor
						// check buys
						if (position.status === 'open') {
							// check buy order - if fullfilled or partial update status: partial or active
							let buyOrderStatus = await self.bittrex.getOrder(position.buyOrderId).catch(error => {
								logger.error(`monitorPositions -> on ${position.exchange} getOrder failed: ${error}`);
							});


							/*
							{ AccountId: null,
								OrderUuid: 'd6590e1b-caac-4714-9249-a54c1e69d07d',
								Exchange: 'BTC-ADA',
								Type: 'LIMIT_BUY',
								Quantity: 100,
								QuantityRemaining: 100,
								Limit: 0.0000337,
								Reserved: 0.00337,
								ReserveRemaining: 0.00337,
								CommissionReserved: 0.00000842,
								CommissionReserveRemaining: 0.00000842,
								CommissionPaid: 0,
								Price: 0,
								PricePerUnit: null,
								Opened: '2018-04-21T00:21:11.317',
								Closed: null,
								IsOpen: true,
								Sentinel: 'aa74f9e1-4fee-4051-b261-1fede24c0d3e',
								CancelInitiated: false,
								ImmediateOrCancel: false,
								IsConditional: true,
								Condition: 'LESS_THAN',
								ConditionTarget: 0 }
							*/

							if (buyOrderStatus) {
								if (buyOrderStatus.QuantityRemaining < buyOrderStatus.Quantity) {
									// active or partial
									// todo: determine if this is the correct way / check IsOpen?
									let quantityBought = buyOrderStatus.Quantity - buyOrderStatus.QuantityRemaining;

									let status = (quantityBought == position.quantity) ? 'active' : 'partial';
									// TODO: check about PricePerUnit vs Price (actual buy price?) and wtf is Reserved..
									let buyPrice = buyOrderStatus.PricePerUnit;
									let stopLossPrice = buyPrice * (1 - settings.trade.stop_loss_percentage / 100);
									let limitPrice = stopLossPrice * (1 - settings.trade.stop_loss_limit_below_percentage / 100);
									// todo: need to update/cancel the stoploss order qty if buy order moves from partial to fulfilled
									let stopLossOrderId = await self.bittrex.sellStopLimit(marketName, quantityBought, stopLossPrice, limitPrice).catch(error => {
										logger.error(`Failure placing stop loss sell order on ${position.exchange}: ${error}`);
									});

									await self.db.updatePositionById(positionDoc._id, {
										quantityBought,
										boughtAt: buyOrderStatus.Closed, // todo: date format ok?
										stopLossOrderId,
										status,
										commissionPaid: buyOrderStatus.CommissionPaid

									}).catch((error) => {
										logger.error(`Failure updating position ${postition._id} with buy order status: ${error}`);
									});

								}
							} else {
								logger.error(`monitorPositions position ${position._id} on ${position.exchange} getOrder did not return valid data`);
							}

							// add stoploss order to position
						}

						if (position.status === 'partial') {

							// check buy order - if now fulfilled update status to active and update quantities
							let buyOrderStatus = await self.bittrex.getOrder(position.buyOrderId).catch(error => {
								logger.error(`monitorPositions -> on ${position.exchange} getOrder failed: ${error}`);
							});

							if (buyOrderStatus) {
								if (buyOrderStatus.QuantityRemaining < buyOrderStatus.Quantity) {
									// active or partial
									// todo: determine if this is the correct way / check IsOpen?
									let quantityBought = buyOrderStatus.Quantity - buyOrderStatus.QuantityRemaining;

									// buy order completed the purchase of more coins - update stop loss qty and status as needed
									if (quantityBought != position.quantityBought) {

										let status = (quantityBought == position.quantity) ? 'active' : 'partial';
										let buyPrice = buyOrderStatus.PricePerUnit;
										let stopLossPrice = buyPrice * (1 - settings.trade.stop_loss_percentage / 100);
										let limitPrice = stopLossPrice * (1 - settings.trade.stop_loss_limit_below_percentage / 100);
										// todo: need to update/cancel the stoploss order qty if buy order moves from partial to fulfilled

										let stopLossOrderId = null;
										if (position.stopLossOrderId) {
											try {
												await self.bittrex.cancelOrder(position.stopLossOrderId);
												stopLossOrderId = await self.bittrex.sellStopLimit(marketName, quantityBought, stopLossPrice, limitPrice)
											}
											catch (error) {
												logger.error(`Failure updating stop loss sell order on ${position.exchange}: ${error}`);
											}
										}

										if (stopLossOrderId) {
											await self.db.updatePositionById(positionDoc._id, {
												quantityBought,
												boughtAt: buyOrderStatus.Closed, // todo: date format ok?
												stopLossOrderId,
												status,
												commissionPaid: buyOrderStatus.CommissionPaid // todo: check if this is cumulative or needs read-update-write with value from order

											}).catch((error) => {
												logger.error(`Failure updating position ${postition._id} with buy order status: ${error}`);
											});
										}
									}

								}
							} else {
								logger.error(`monitorPositions position ${position._id} on ${position.exchange} getOrder did not return valid data`);
							}

						}

						// check sells
						if ((position.status === 'active') || (postition.status === 'partial')) {
							// if stoploss order fulfilled, update status to closed with reason stoploss, cancel all other orders if exists
							// check the current tick of the coin
							// if tick > required sell price, cancel stoplosss order, place gain sell market order (unless sell order already exists)
							// if sell order exists - check its fulfillment and update position status to closed if all position was sold
							// todo: decide if we sell limit or market if tick > sell gain price


							/*
							{ AccountId: null,
								OrderUuid: 'd6590e1b-caac-4714-9249-a54c1e69d07d',
								Exchange: 'BTC-ADA',
								Type: 'LIMIT_BUY',
								Quantity: 100,
								QuantityRemaining: 100,
								Limit: 0.0000337,
								Reserved: 0.00337,
								ReserveRemaining: 0.00337,
								CommissionReserved: 0.00000842,
								CommissionReserveRemaining: 0.00000842,
								CommissionPaid: 0,
								Price: 0,
								PricePerUnit: null,
								Opened: '2018-04-21T00:21:11.317',
								Closed: null,
								IsOpen: true,
								Sentinel: 'aa74f9e1-4fee-4051-b261-1fede24c0d3e',
								CancelInitiated: false,
								ImmediateOrCancel: false,
								IsConditional: true,
								Condition: 'LESS_THAN',
								ConditionTarget: 0 }
							*/


							if (position.stopLossOrderId) {
								// check the stoploss
								let sellOrderStatus = await self.bittrex.getOrder(position.stopLossOrderId).catch(error => {
									logger.error(`Failure getting status of stop loss sell order on position in ${position.exchange}: ${error}`);
								});
								if (sellOrderStatus) {
									if (sellOrderStatus.Quantity > 0) { // position touched the stop loss value
										if (sellOrderStatus.Quantity == position.quantityBought) {
											let sellPrice = sellOrderStatus.PricePerUnit;
											let lossBaseAsset = position.quantityBought * (sellPrice - position.buyPrice);
											let lossPercentage = parseFloat(lossBaseAsset / (position.quantityBought * position.buyPrice) * 100).toFixed(2);

											logger.info(`Sold position on ${marketName}, qty: ${position.Quantity}, price: ${sellPrice}, due to stop-loss (${lossBaseAsset}${position.baseAsset} / %${lossPercentage})`);

											await self.db.updatePositionById(position._id, {
												status: 'closed',
												closeReason: 'stoploss',
												quantitySold: position.quantityBought,
												sellPrice: sellPrice,
												soldAt: new Date(), // todo: like this?
												commissionPaid: postition.commissionPaid + sellOrderStatus.CommissionPaid,
											}).catch(error => {
												logger.error(`monitorPositions -> updatePositionById: ${JSON.stringify(error)}`);
											});

										} else {
											logger.warn(`Position on ${marketName} touched stop-loss - partial sell`);
											await self.db.updatePositionById(position._id, {
												quantitySold: sellOrderStatus.Quantity,
												sellPrice: sellPrice,
											}).catch(error => {
												logger.error(`monitorPositions -> updatePositionById: ${JSON.stringify(error)}`);
											});
										}
									}
								}
							}

							// check the take profit sell order
							if (settings.trade.sell_signal_at_profit) {
								let sellPrice = position.buyPrice * (1 + settings.trade.sell_at_profit_percentage / 100);

								let sellOrderId = position.sellOrderId;
								// a sell order exists - signal touched sell price - waiting for a sale
								if (sellOrderId) {
									let sellOrderStatus = await self.bittrex.getOrder(sellOrderId).catch(error => {
										logger.error(`Failure getting status of sell order on position in ${position.exchange}: ${error}`);
									});
									if (sellOrderStatus) {
										let sellPrice = sellOrderStatus.PricePerUnit;
										let profitBaseAsset = position.quantityBought * (sellPrice - position.buyPrice);
										let profitPercentage = parseFloat(profitBaseAsset / (position.quantityBought * position.buyPrice) * 100).toFixed(2);

										if (sellOrderStatus.QuantityRemaining == 0) {
											logger.info(`Sold position on ${marketName}, qty: ${position.Quantity}, price: ${sellPrice}, due to profit (${profitBaseAsset}${position.baseAsset} / %${profitPercentage})`);

											await self.db.updatePositionById(position._id, {
												status: 'closed',
												closeReason: 'gain',
												quantitySold: position.quantityBought,
												sellPrice: sellPrice,
												soldAt: new Date(), // todo: like this?
												commissionPaid: postition.commissionPaid + sellOrderStatus.CommissionPaid,
											}).catch(error => {
												logger.error(`monitorPositions -> updatePositionById: ${JSON.stringify(error)}`);
											});

										} else {
											logger.info(`Partial sell of ${marketName} position, qty: ${sellOrderStatus.quantityBought}, price: ${sellOrderStatus.PricePerUnit}, due to profit (${profitBaseAsset}${position.baseAsset} / %${profitPercentage})`);
										}
									} else {
										logger.error(`Failure getting valid data on status of sell order on position in ${position.exchange}: ${error}`);
									}

								} else {

									// check price, if its > profit then place sell order and check it in the next iteration

									if (tick.C >= sellPrice) {
										sellPrice = tick.C;

										try {
											await self.bittrex.cancelOrder(position.stopLossOrderId);
											await self.db.updatePositionById(position._id, {
												stopLossOrderId: null
											});

										}
										catch(error) {
											logger.error(`Failure cancelling stop loss order on ${position.exchange}: ${error}`);
											return
										}

										try {
											let sellOrderId = await self.bittrex.sellLimit(marketName, position.quantityBought, sellPrice); // todo: check if there're reserved coins from old failed order placements
											await self.db.updatePositionById(position._id, {
												sellOrderId
											});
										} catch(error) {
											logger.error(`Failure placing take profit sell order / updating position: ${JSON.stringify(error)}`);
											return
										}

										logger.debug(`Placed take profit sell order on position ${marketName}, qty: ${position.quantityBought}, price: ${sellPrice}`);

									}
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
		logger.debug('Creating new position');

		if (await this.db.positionBySignalExists(signal)) {
			let errMsg = `Not executed: Position for this signal already exists`; // might need to silence this one
			return Promise.reject({type: 'warn', msg: errMsg});
		}

		// only bittrex is supported currently
		let exchange = signal.exchange;
		if (!settings.trade.active_exchanges.includes(exchange)) {
			let errMsg = 'Not executed: Signal is on non-traded exchange';
			return Promise.reject({type: 'warn', msg: errMsg});
		}

		// todo: make min_to_trade = 0 implement this functionality:
		let baseAsset = signal.market.split('-')[0];
		let coin = signal.market.split('-')[1];
		if (!settings.trade.base_assets.includes(baseAsset)) {
			let errMsg = `Not executed: Signal is on non-traded base asset (${baseAsset})`;
			return Promise.reject({type: 'warn', msg: errMsg});
		}

		if (settings.trade.coin_blacklist.includes(coin)) {
			let errMsg = `Not executed: Signal is on a blacklisted coin (${coin})`;
			return Promise.reject({type: 'warn', msg: errMsg});
		}

		let openPositionsCount = await this._getOpenPositionsNum();
		if (openPositionsCount >= settings.trade.max_open_positions) {
			let errMsg = `Not executed: Maximum open positions exceeded`;
			return Promise.reject({type: 'warn', msg: errMsg});
		}

		let buyAbovePriceCoef = 1+(settings.trade.buy_signal_above_max_percentage/100);
		let quantity;
		let buyLimitPrice;

		// todo: switch case baseAsset... support all base assets
		if (baseAsset === 'BTC') {

			let requiredTradeAmount = settings.trade.total_to_trade.btc * (settings.trade.percentage_of_budget_per_position / 100);

			let availableBalance = await this.bittrex.getBalance(baseAsset).catch((err) => {
				let errMsg = `Not executed: Error retrieving available balance from Bittrex ${err}`;
				return Promise.reject({type: 'error', msg: errMsg});
			});

			let tradeAmount = Math.min(availableBalance, requiredTradeAmount);

			if (tradeAmount < settings.trade.min_per_position.btc) {
				let errMsg = `Not executed: Position to open is below minimum of ${settings.trade.min_per_position.btc}${baseAsset} - available balance too low (${availableBalance})`;
				return Promise.reject({type: 'warn', msg: errMsg});
			}

			buyLimitPrice = (parseFloat(signal.lastprice) * buyAbovePriceCoef).toFixed(10);
			quantity = (tradeAmount / buyLimitPrice).toFixed(4);
		}

		logger.info(`Going to buy ${quantity}${coin} at price ${buyLimitPrice}${baseAsset}`);

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
			let errMsg = `Error adding position to database ${error}`;
			return Promise.reject({type: 'error', msg: errMsg});
		});

		if (!settings.trade.simulated_trading) {
			uuid = await this.bittrex.buyLimit(signal.market, quantity, buyLimitPrice).catch(error => {
				logger.error(`Failure placing buy order on ${signal.exchange}: ${error}`);
			});

			if (!uuid) {
				await this.db.deletePositionById(positionDoc._id); // rollback if placing order failed ??
				let errMsg = `Error placing buy limit order in ${exchange}, reverting position`;
				return Promise.reject({type: 'error', msg: errMsg});
			}
			await this.db.updatePositionById(positionDoc._id, {buyOrderId: uuid}).catch((error) => {
				let errMsg = `Error adding buy order UUID to position ${error}`;
				return Promise.reject({type: 'error', msg: errMsg});
			});
		} else {
			// uuid = uuidLib(); // simulate it
		}

		// return Promise.resolve(uuid);
		return Promise.resolve(true);

	}

}

module.exports = PositionsManager;
