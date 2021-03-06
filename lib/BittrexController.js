'use strict';

const bittrexApi = require('node-bittrex-api');
const settings = require('../settings');
// const bittrexApiPromise = Promise.promisifyAll(bittrexApi); // need bluebird for this

// unofficial API reference
// https://github.com/thebotguys/golang-bittrex-api/wiki/Bittrex-API-Reference-(Unofficial)
// official:
// https://www.npmjs.com/package/node.bittrex.api
// https://bittrex.com/Home/Api

class BittrexController {

	constructor() {
		this.options = {
			'apikey' : settings.bittrex.api_key,
			'apisecret' : settings.bittrex.api_secret
		};
		bittrexApi.options(this.options);

	}

	getOpenOrders() {
		//...?
	}

	async getOrder(id) {
		return new Promise(function(resolve, reject) {
			bittrexApi.getorder({
				uuid: id
			}, function (data, err) {
				if (err) {
					reject(err);
				} else {
					if (data.success) {
						resolve(data.result);
					} else {
						reject(false);
					}
				}
			});
		});
	}

	async cancelOrder(id) {
		return new Promise(function(resolve, reject) {
			bittrexApi.cancel({
				uuid: id
			}, function (data, err) {
				if (err) {
					reject(err);
				} else {
					resolve(data.success);
				}
			});
		});
	}

	// create a buy limit order and return a promise resolving to the order UUID
	async buyLimit(marketName, quantity, price) {
		return new Promise(function(resolve, reject) {
			bittrexApi.tradebuy({
				MarketName: marketName,
				OrderType: 'LIMIT',
				Quantity: quantity,
				Rate: price,
				TimeInEffect: 'GOOD_TIL_CANCELLED', // supported options are 'IMMEDIATE_OR_CANCEL', 'GOOD_TIL_CANCELLED', 'FILL_OR_KILL'
				ConditionType: 'NONE', // supported options are 'NONE', 'GREATER_THAN', 'LESS_THAN'
				Target: 0, // used in conjunction with ConditionType
			}, function (data, err) {
				if (err) {
					reject(err);
				} else {
					// console.log('buyLimit');
					// console.log(data);
					if (data.success) {
						resolve(data.result.OrderId);
					} else {
						reject(data.message);
					}
				}
			});
		});
	}

	// get a balance of a asset in the exchange and return a promise resolving to the available (unassigned) balance
	async getBalance(asset = 'BTC') {
		if (settings.trade.simulated_trading) {
			switch (asset) {
				case 'BTC' :
					if (settings.trade.simulated_balance.bittrex.btc > 0) {
						return settings.trade.simulated_balance.bittrex.btc; // it'll get promisified
					}
					break;
				case 'ETH' :
					if (settings.trade.simulated_balance.eth > 0) {
						return settings.trade.simulated_balance.eth; // it'll get promisified
					}
					break;
				case 'USDT' :
					if (settings.trade.simulated_balance.usdt > 0) {
						return settings.trade.simulated_balance.usdt; // it'll get promisified
					}
					break;
				default:
					return 0;
			}
		}

		return new Promise(function (resolve, reject) {
			bittrexApi.getbalance({ currency: asset }, function (data, err) {
				if (err) {
					reject(err);
				} else {
					resolve(data.result.Available || 0);
				}
			})
		});

	}


	async getTicks(marketName, tickInterval='oneMin') {
		return new Promise(function(resolve, reject) {
			bittrexApi.getticks({marketName, tickInterval}, function (data, err) {
				if (err) {
					reject(err);
				} else {
					resolve(data.result);
				}
			});
		});
	}

	// [“oneMin”, “fiveMin”, “thirtyMin”, “hour”, “day”].

	async getLatestTick(marketName, tickInterval='oneMin') {
		return new Promise(function(resolve, reject) {
			bittrexApi.getlatesttick({marketName, tickInterval}, function (data, err) {
				if (err) {
					reject(err);
				} else {
					resolve(data.result);
				}
			});
		});
	}


	async getOrderHistory() {
		return new Promise(function(resolve, reject) {
			bittrexApiPromise.getorderhistory({marketName, tickInterval}, function (data, err) {
				if (err) {
					reject(err);
				} else {
					resolve(data.result);
				}
			});
		});
	}



	// create a sell limit order and return a promise resolving to the order UUID
	async sellLimit(marketName, quantity, price) {
		return new Promise(function(resolve, reject) {
			bittrexApi.tradesell({
				MarketName: marketName,
				OrderType: 'LIMIT',
				Quantity: quantity,
				Rate: price,
				TimeInEffect: 'GOOD_TIL_CANCELLED', // supported options are 'IMMEDIATE_OR_CANCEL', 'GOOD_TIL_CANCELLED', 'FILL_OR_KILL'
				ConditionType: 'NONE', // supported options are 'NONE', 'GREATER_THAN', 'LESS_THAN'
				Target: 0, // used in conjunction with ConditionType
			}, function (data, err) {
				if (err) {
					reject(err);
				} else {
					if (data.success) {
						resolve(data.result.OrderId);
					} else {
						reject(data.message);
					}
				}
			});
		});
	}

	// create a sell stop-limit order and return a promise resolving to the order UUID
	async sellStopLimit(marketName, quantity, stopPrice, limitPrice) {
		return new Promise(function(resolve, reject) {
			bittrexApi.tradesell({
				MarketName: marketName,
				OrderType: 'LIMIT',
				Quantity: quantity,
				Rate: limitPrice,
				TimeInEffect: 'GOOD_TIL_CANCELLED', // supported options are 'IMMEDIATE_OR_CANCEL', 'GOOD_TIL_CANCELLED', 'FILL_OR_KILL'
				ConditionType: 'LESS_THAN', // supported options are 'NONE', 'GREATER_THAN', 'LESS_THAN'
				Target: stopPrice, // used in conjunction with ConditionType
			}, function (data, err) {
				if (err) {
					reject(err);
				} else {
					if (data.success) {
						resolve(data.result.OrderId);
					} else {
						reject(data.message);
					}
				}
			});
		});
	}


	// cancel order by uuid return a promise that resolves to true/false per order cancellation success
	async cancelOrder(orderUuid) {
		return new Promise(function(resolve, reject) {
			bittrexApi.cancel({
				uuid: orderUuid,
			}, function (data, err) {
				if (err) {
					reject(err);
				} else {
					resolve(data.success);
				}
			});
		});
	}

	// cancel order by uuid return a promise that resolves to true/false per order cancellation success
	async getOrder(orderUuid) {
		return new Promise(function(resolve, reject) {
			bittrexApi.getorder({
				uuid: orderUuid
			}, function (data, err) {
				if (err) {
					reject(err);
				} else {
					resolve(data.result);
				}
			});
		});
	}


}

module.exports = BittrexController;
