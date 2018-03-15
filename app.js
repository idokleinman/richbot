'use strict';

require('dotenv').config();
// const BittrexController = require('./lib/BittrexController');
const MiningHamsterController = require('./lib/MiningHamsterController');
const PositionsManager = require('./lib/PositionsManager');
const settings = require('./settings');



// var bc = new BittrexController();
var mh = new MiningHamsterController();
var pm = new PositionsManager();
// bc.getMarketSummaries();
// bc.getCandles('BTC-ETH','fiveMin');


mh.getTestSignal();

function loopGetSignals() {
	// do whatever you like here
	console.log('---');

	mh.getSignal().then((signals) => {
		let signal = signals[0];
		console.log(signal);
		// calculate time since signal
		let timeSinceSignal = mh.timeSinceSignal(signal);
		if ((timeSinceSignal < settings.trade.max_signal_time_diff_to_buy) && (timeSinceSignal > settings.trade.min_time_diff_to_buy)) {
			pm.enter(signal);
		}



		// , if its < 1 min then simulate buy
		// add signal ID / buy price to memory (hash)
		// simulate buy
		// track price of ticker
		// if above 2% simulate sell
		// print report
		// future: add checking of RSI, binance

	});


	setTimeout(loopGetSignals, 5000);
}

console.log('Welcome to RichBot');
loopGetSignals();

// TODO:
// add express.js to serve  GET webpage with report, GET status of a position, POST new trading parameters/outside signal (future)
// add DB for positions monitoring
// Binance API support






