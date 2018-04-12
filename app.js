'use strict';


const BittrexController = require('./lib/BittrexController');
const MiningHamsterController = require('./lib/MiningHamsterController');
const PositionsManager = require('./lib/PositionsManager');
// const DatabaseManager = require('./lib/DatabaseManager');
const settings = require('./settings');
const death = require('death');
const stringHash = require('string-hash');
// const _ = require('lodash');
const logger = require('./lib/utils/logger');
const moment = require('moment');
const btcPrice = require('./lib/utils/btcPrice');

var bc = new BittrexController();
var mh = new MiningHamsterController();
var pm = new PositionsManager();

var lastSignalHash = 0;
let lastBitcoinPriceChangeCheck = 0;
let bitcoinPriceChange = {};

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
			return Promise.reject('warn');
		}

		if (result.type === 'error') {
			logger.error(result.msg);
			setTimeout(function() {
				_enterPositionOnSignal(signal, retryCounter-1)
			}, 5000)
		}

	});

	if (enterPosition) {
		return Promise.resolve(true);
	}


}




async function loopGetSignals() {

	// let testSignal = await mh.getTestSignal();
	// logger.debug(testSignal);
	// logger.debug(mh.timeSinceSignal(testSignal));

	function _recallGetSignals() {
		setTimeout(loopGetSignals, settings.mh_signals.polling_interval*1000);
	}


	if (!pm.isDatabaseConnected()) {
		// wait for DB to be connected before polling signals
		_recallGetSignals();
		return;
	}

	process.stdout.write(`.`);
	// check bitcoin price swings x minutes:
	if ((Date.now() - lastBitcoinPriceChangeCheck) > settings.mh_signals.check_btc_change_every*1000) {
		lastBitcoinPriceChangeCheck = Date.now();
		bitcoinPriceChange = await btcPrice.getBitcoinPriceChange(bc);
	}

	if (Math.abs(bitcoinPriceChange.hour) > settings.mh_signals.halt_signals_if_btc_change_hour) {
		logger.warn(`Halting signals because BTC moved ${bitcoinPriceChange.hour}% in the last hour`);
		_recallGetSignals();
		return;
	}

	if (Math.abs(bitcoinPriceChange.day) > settings.mh_signals.halt_signals_if_btc_change_day) {
		logger.warn(`Halting signals because BTC moved ${bitcoinPriceChange.day}% in the last 24 hours`);
		_recallGetSignals();
		return;
	}

	let signals = await mh.getSignal().catch(error => {
		logger.warn(`Failed getting signal from MiningHamster - ${error}`);
		_recallGetSignals();
		return;
	});

	if (signals) {
		let signal = signals[0];
		// logger.debug(`Got signal: ${JSON.stringify(signal)}`); //remove


		// calculate time since signal


		let signalHash = stringHash(signal.toString());
		if (signalHash !== lastSignalHash) {

			logger.debug(`New signal detected: ${JSON.stringify(signal)}`);
			lastSignalHash = signalHash;

			//{ success: 'false', message: 'no signal due to btc price' }
			if ((signal.success) && (signal.success == 'false')) {
				if ((signal.message) && (signal.message == 'no signal due to btc price')) {
					logger.info(`Signals are halted due to BTC price change (MH signals API configuration)`);
					_recallGetSignals();
					return;
				}
			}

			let timeSinceSignal = mh.timeSinceSignal(signal);

			// todo: check signal coin tick with % diff not just time?
			if (timeSinceSignal < 0) {
				logger.error(`Time difference from signal is negative ${timeSinceSignal} - check timezone settings ${JSON.stringify(signal)}`);
				_recallGetSignals();
				return;
			}

			logger.debug(`Time difference from now is: ${timeSinceSignal} secs / ~${Math.floor(timeSinceSignal/60)} mins`);

			// debug time check disabled:
			if ((timeSinceSignal < settings.trade.max_signal_time_diff_to_buy) && (timeSinceSignal >= settings.trade.min_signal_time_diff_to_buy)) {
			// if (true) {

				signal.time = mh.convertSignalTimeToIsoDate(signal); // convert raw signal time string to ISO date (and adjust timezone)

				let enterPosition = await _enterPositionOnSignal(signal, settings.trade.enter_position_retries).catch((error) => {
					if (error !== `warn`) {
						logger.warn(`Could not enter position because: ${error}`);
					}
				});

				if (enterPosition) {
					logger.info(`Success entering new position on signal`);
				}


			} else {
				// NOP
				// console.log(`- Success getting signal from MiningHamster (no action)`);
				logger.debug(`Not entering signal on ${signal.market} because its out of the defined time range-${moment().seconds(-1 * timeSinceSignal).fromNow()}`);

			}
		} else {
			// NOP
		}
	}

	_recallGetSignals();
}


logger.info('$$$ Welcome to RichBot! Let\'s make some money! $$$');
// timer = setInterval(loopGetSignals, settings.mh_signals.polling_interval*1000); //TODO: make sure previous call completed before new one starts
loopGetSignals();

// TODO:
// add express.js to serve  GET webpage with report, GET status of a position, POST new trading parameters/outside signal (future)
// Binance API support - future
// TA bot
// check signal TA indicators before entering position (wait for MACD cross or RSI <30 etc) - same for exiting position
// file logging / reports






