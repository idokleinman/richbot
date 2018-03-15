'use strict';

const bittrexApi = require('node-bittrex-api');
const Promise = require('bluebird');
const settings = require('../settings');
const bittrexApiPromise = Promise.promisifyAll(bittrexApi);


class BittrexController {

	constructor() {
		this.options = {
			'apikey' : settings.bittrex.api_key,
			'apisecret' : settings.bittrex.api_secret
		};
		bittrexApi.options(this.options);

	}


	getCandles(marketName, tickInterval) {
		bittrexApiPromise.getcandlesAsync({marketName, tickInterval}).then((result) => {
	    console.log(result);
      }).catch((err) => {
	    console.log(err);
      });
    }


	getMarketSummaries() {

		bittrexApi.getmarketsummaries( function( data, err ) {
			if (err) {
				return console.error(err);
			}
			var i = 1;
			data.result.forEach(function(value) {
				i++;
				if (i>5) {
					return true;
				}
				bittrexApi.getticker( { market : value.MarketName }, function( ticker ) {
					bittrexApi.getmarketsummary( { market : value.MarketName}, function( summary, err ) {
						console.log(value.MarketName);
						console.log(ticker.result);
						console.log(summary.result);
					});
				});
			});
		});
	}

	getOpenPositions() {

	}

	// create a buy limit order and return a promise resolving to the order UUID
	buyLimit(marketName, quantity, price) {
		return new Promise(function(resolve, reject) {
			bittrexApi.tradebuy({
				MarketName: marketName,
				OrderType: 'LIMIT',
				Quantity: quantity,
				Rate: price,
				TimeInEffect: 'GOOD_TIL_CANCELLED', // supported options are 'IMMEDIATE_OR_CANCEL', 'GOOD_TIL_CANCELLED', 'FILL_OR_KILL'
				ConditionType: 'LESS_THAN', // supported options are 'NONE', 'GREATER_THAN', 'LESS_THAN'
				Target: 0, // used in conjunction with ConditionType
			}, function (data, err) {
				if (err) {
					reject(err);
				} else {
					if (data.success) {
						resolve(data.result.uuid);
					} else {
						reject(false);
					}
				}
			});
		});
	}

	// get a balance of a asset in the exchange and return a promise resolving to the available (unassigned) balance
	getBalance(asset = 'BTC') {
		return new Promise(function(resolve, reject) {
			bittrexApi.getbalance({ currency: asset }, function (data, err) {
				// TODO: deposit some btc and see if this works
				// console.log('getBalance');
				// console.log(data);
				if (err) {
					reject(err);
				} else {
					resolve(data.result.Available || 0);
				}
			})
		});
	}


	// create a sell limit order and return a promise resolving to the order UUID
	sellLimit(marketName, quantity, price) {
		return new Promise(function(resolve, reject) {
			bittrexApi.tradesell({
				MarketName: marketName,
				OrderType: 'LIMIT',
				Quantity: quantity,
				Rate: price,
				TimeInEffect: 'GOOD_TIL_CANCELLED', // supported options are 'IMMEDIATE_OR_CANCEL', 'GOOD_TIL_CANCELLED', 'FILL_OR_KILL'
				ConditionType: 'GREATER_THAN', // supported options are 'NONE', 'GREATER_THAN', 'LESS_THAN'
				Target: 0, // used in conjunction with ConditionType
			}, function (data, err) {
				if (err) {
					reject(err);
				} else {
					if (data.success) {
						resolve(data.result.uuid);
					} else {
						reject(false);
					}
				}
			});
		});
	}

	// cancel order by uuid return a promise that resolves to true/false per order cancellation success
	cancelOrder(orderUuid) {
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


}

module.exports = BittrexController;
