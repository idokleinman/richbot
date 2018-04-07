'use strict';


// const BittrexController = require('./lib/BittrexController');
const MiningHamsterController = require('./lib/MiningHamsterController');
const PositionsManager = require('./lib/PositionsManager');
// const DatabaseManager = require('./lib/DatabaseManager');
const settings = require('./settings');
const death = require('death');
const stringHash = require('string-hash');
// const _ = require('lodash');
const logger = require('./lib/utils/logger');

// var bc = new BittrexController();
var mh = new MiningHamsterController();
var pm = new PositionsManager();

var lastSignalHash = 0;

// mh.getTestSignal();

death(function(signal, err) {
	pm.terminate();
	process.exit();

});


async function _enterPositionOnSignal(signal, retryCounter) {
	if (retryCounter < 0) {
		return Promise.reject('Out of retries');
	}
	let enterPosition = await pm.enter(signal).catch((result) => {

		if (result.type === 'warn') {
			logger.warn(result.msg);
			return Promise.reject('Warning');
		}

		if (result.type === 'error') {
			logger.error(result.msg);
			setTimeout(function() {
				_enterPositionOnSignal(signal, retryCounter-1)
			}, 5000)
		}

	});

	if (enterPosition) {
		logger.info(`Create new position for signal success`);
		return Promose.resolve(true);
	}


}


async function loopGetSignals() {

	let signals = await mh.getSignal().catch(error => {
		logger.warn(`Failed getting signal from MiningHamster - ${error}`);
	});

	if (signals) {
		let signal = signals[0];
		// calculate time since signal
		let timeSinceSignal = mh.timeSinceSignal(signal);

		logger.debug(timeSinceSignal);
		// process.stdout.write(`.`);

		// debug time check disabled:
		if ((timeSinceSignal < settings.trade.max_signal_time_diff_to_buy) && (timeSinceSignal >= settings.trade.min_signal_time_diff_to_buy)) {
		// if (true) {
			// console.log('got signal:');
			let signalHash = stringHash(signal.toString());

			if (signalHash !== lastSignalHash) {
				logger.debug(`New signal published ${JSON.stringify(signal)}`);
				signal.time = mh.convertSignalTimeToIsoDate(signal);

				let enterPosition = await _enterPositionOnSignal(signal, 5).catch((error) => {
					// logger.warn(`Could not enter position because: ${error}`);
				});

				if (enterPosition) {
					logger.info(`Enter position for new signal success`);
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

logger.info('$$$ Welcome to RichBot! Let\'s make some money! $$$');
loopGetSignals();

// TODO:
// add express.js to serve  GET webpage with report, GET status of a position, POST new trading parameters/outside signal (future)
// Binance API support - future
// TA bot
// check signal TA indicators before entering position (wait for MACD cross or RSI <30 etc) - same for exiting position
// file logging / reports






