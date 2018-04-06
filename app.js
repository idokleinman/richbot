'use strict';


// const BittrexController = require('./lib/BittrexController');
const MiningHamsterController = require('./lib/MiningHamsterController');
const PositionsManager = require('./lib/PositionsManager');
const settings = require('./settings');
const death = require('death');
const stringHash = require('string-hash');
// const _ = require('lodash');

// var bc = new BittrexController();
var mh = new MiningHamsterController();
var pm = new PositionsManager();
// bc.getMarketSummaries();
// bc.getCandles('BTC-ETH','fiveMin');

var lastSignalHash = 0;

// mh.getTestSignal();

death(function(signal, err) {
	pm.terminate();
	process.exit();

});



async function loopGetSignals() {

	let signals = await mh.getSignal().catch(error => {
		console.log(`~ Failed getting signal from MiningHamster - ${error}`);
	});

	if (signals) {
		let signal = signals[0];
		// calculate time since signal
		let timeSinceSignal = mh.timeSinceSignal(signal);
		// process.stdout.write(`.`);

		// debug time check disabled:
		if ((timeSinceSignal < settings.trade.max_signal_time_diff_to_buy) && (timeSinceSignal > settings.trade.min_signal_time_diff_to_buy)) {
		// if (true) {
			// console.log('got signal:');
			let signalHash = stringHash(signal.toString());

			if (signalHash !== lastSignalHash) {
				console.log(`- New signal published ${new Date()}`);
				console.log(signal);
				signal.time = mh.convertSignalTimeToIsoDate(signal);
				let enterPosition = await pm.enter(signal).catch((error) => {
					console.log(`${error}`);
				});

				if (enterPosition) {
					console.log(`- Enter position for new signal success at ${new Date()}`);
				}

				lastSignalHash = signalHash;
			} else {
				// NOP
				// console.log(`- Success getting signal from MiningHamster (no action)`);
			}
		} else {
			// NOP
			// console.log('Signal is out of enter time range');
		}
	}


	setTimeout(loopGetSignals, settings.mh_signals.polling_interval*1000);
}

console.log('* Welcome to RichBot! Let\'s make some auto-money...');
loopGetSignals();

// TODO:
// add express.js to serve  GET webpage with report, GET status of a position, POST new trading parameters/outside signal (future)
// Binance API support - future
// TA bot
// check signal TA indicators before entering position (wait for MACD cross or RSI <30 etc) - same for exiting position






