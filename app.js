'use strict';


// const BittrexController = require('./lib/BittrexController');
const MiningHamsterController = require('./lib/MiningHamsterController');
const PositionsManager = require('./lib/PositionsManager');
const settings = require('./settings');

// var bc = new BittrexController();
var mh = new MiningHamsterController();
var pm = new PositionsManager();
// bc.getMarketSummaries();
// bc.getCandles('BTC-ETH','fiveMin');



// mh.getTestSignal();

async function loopGetSignals() {
	// do whatever you like here
	console.log('---');

	let signals = await mh.getSignal();
	if (signals) {
		let signal = signals[0];
		// console.log(signal);
		// calculate time since signal
		let timeSinceSignal = mh.timeSinceSignal(signal);
		// if ((timeSinceSignal < settings.trade.max_signal_time_diff_to_buy) && (timeSinceSignal > settings.trade.min_time_diff_to_buy)) {
		let uuid = await pm.enter(signal).catch((error) =>{
			console.log(`${error}`);
		});

		if (uuid) {
			console.log(`Enter position success: ${uuid}`);
		}
		// } else {
		// 	console.log('Signal is out of enter time range');
		// }
	}


	setTimeout(loopGetSignals, settings.mh_signals.polling_interval*1000);
}

console.log('Welcome to RichBot');
loopGetSignals();

// TODO:
// add express.js to serve  GET webpage with report, GET status of a position, POST new trading parameters/outside signal (future)
// add DB for positions monitoring
// Binance API support






