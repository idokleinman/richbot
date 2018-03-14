'use strict';

const bittrexApi = require('node-bittrex-api');
const Promise = require('bluebird');

const bittrexApiPromise = Promise.promisifyAll(bittrexApi);


class BittrexController {

	constructor() {
		this.options = {
			'apikey' : process.env.BITTREX_API_KEY,
			'apisecret' : process.env.BITTREX_API_SECRET,
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

	getAvailableBalance(baseAsset) {
		return 1;
	}

	buy(marketName, quantity, price) {
		bittrex.tradebuy({
			MarketName: marketName,
			OrderType: 'LIMIT',
			Quantity: quantity,
			Rate: price,
			TimeInEffect: 'GOOD_TIL_CANCELLED', // supported options are 'IMMEDIATE_OR_CANCEL', 'GOOD_TIL_CANCELLED', 'FILL_OR_KILL'
			ConditionType: 'LESS_THAN', // supported options are 'NONE', 'GREATER_THAN', 'LESS_THAN'
			Target: 0, // used in conjunction with ConditionType
		}, function( data, err ) {
			console.log( data );
		});

		// save order in db with uuid

	}

	sell() {

	}

}

module.exports = BittrexController;
