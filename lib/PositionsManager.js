'use strict';
// require db
const BittrexController = require('./BittrexController');

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
		this.openPositionsCount = 0;
	}




	enter(signal) { // pair, exchange='bittrex', buyprice) {
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
		if (!settings.trade.active_exchanges.includes(signal.exchange)) {
			console.log('Not executed: Signal is on non-traded exchange');
			return 0;
		}

		let baseAsset = signal.market.split('-')[1];
		if (!settings.trade.base_assets.includes(baseAsset)) {
			console.log('Not executed: Signal is on non-traded base asset');
			return 0;
		}

		if (this.openPositionsCount > settings.trade.max_open_positions) {
			console.log('Not executed: Maximum open positions exceeded');
			return 0;
		}

		let buyAbovePriceRatio = 1+(settings.trade.buy_signal_above_max_percentage/100);
		let qty;
		let buyLimitPrice;

		if (baseAsset == 'BTC') {
			let tradeAmount = settings.trade.total_btc_to_trade * (percentage_of_budget_per_position / 100);
			if (tradeAmount < settings.trade.min_btc_per_position) {
				console.log(`Not executed: Position to open is below minimum of ${settings.trade.min_btc_per_position}${baseAsset}`);
				return 0;
			}

			buyLimitPrice = (signal.lastPrice * buyAbovePriceRatio);
			qty = tradeAmount / buyLimitPrice;
		}


		this.bittrexController.buy(signal.market, qty, buyLimitPrice);
		// now monitor this open position by uuid and strategy
		

	}

	_monitor() {
		// check on open/pending positions and make sure they're handled by strategy

	}
}

module.exports = PositionsManager;