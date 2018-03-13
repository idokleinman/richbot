'use strict';

require('dotenv').config();
const BittrexController = require('./lib/BittrexController');
const MiningHamsterController = require('./lib/MiningHamsterController');

console.log('welcome');

var bc = new BittrexController();
var mh = new MiningHamsterController();

// bc.getMarketSummaries();
// bc.getCandles('BTC-ETH','fiveMin');


mh.getTestSignal();

function loopGetSignals() {
	// do whatever you like here
	console.log('---');

	mh.getSignal().then((signal) => {
		console.log(signal[0]);
		// calculate time since signal
		mh.timeSinceSignal(signal[0]);
		// , if its < 1 min then simulate buy
		// add signal ID / buy price to memory (hash)
		// simulate buy
		// track price of ticker
		// if above 2% simulate sell
		// print report
		// future: add checking of RSI, binance

	});


	setTimeout(loopGetSignals, 2000);
}

loopGetSignals();




