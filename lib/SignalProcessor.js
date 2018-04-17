'use strict';

const settings = require('../settings');

const BittrexController = require('./BittrexController');
const MiningHamsterController = require('./MiningHamsterController');
const PositionsManager = require('./PositionsManager');

const death = require('death');
const stringHash = require('string-hash');
const logger = require('./utils/logger');
const moment = require('moment');
const btcPrice = require('./utils/btcPrice');

var bc = new BittrexController();
var mh = new MiningHamsterController();
var pm = new PositionsManager();

var lastSignalHash = 0;
let lastBitcoinPriceChangeCheck = 0;
let bitcoinPriceChange = {};
let signalsHalted = false;
let loopTimer;
let getSignalProcessing = false;

// mh.getTestSignal();


death(function(signal, err) {
	clearInterval(loopTimer);
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




async function _loopGetSignals() {

	// let testSignal = await mh.getTestSignal();
	// logger.debug(testSignal);
	// logger.debug(mh.timeSinceSignal(testSignal));

	// semaphore
	if (getSignalProcessing) {
		return;
	} else {
		getSignalProcessing = true;
	}

	function _recallGetSignals() {
		// setTimeout(async function() { await _loopGetSignals() }, settings.mh_signals.polling_interval*1000);
		getSignalProcessing = false;
	}

	// wait for DB to be connected before polling signals
	if (!pm.isDatabaseConnected()) {
		_recallGetSignals();
		return;
	}


	// Check bitcoin price swings:
	if ((Date.now() - lastBitcoinPriceChangeCheck) > settings.mh_signals.check_btc_change_every*1000) {
		lastBitcoinPriceChangeCheck = Date.now();
		bitcoinPriceChange = await btcPrice.getBitcoinPriceChange(bc).catch(error => {
			logger.warn(`Could not get bitcoin price change: ${JSON.stringify(error)}`);
		})
	}

	if (bitcoinPriceChange) {
		// Do not sample signals if BTC hour price swing is above defined value
		let hourPriceChangeOk = false;
		if (Math.abs(bitcoinPriceChange.hour) >= settings.mh_signals.halt_signals_if_btc_change_hour_percentage) {
			if (!signalsHalted) {
				signalsHalted = true;
				logger.info(`Halting signals because BTC moved ${bitcoinPriceChange.hour}% in the last hour - currently: ${bitcoinPriceChange.price}$`);
			}
		} else {
			hourPriceChangeOk = true;
		}

		// Do not sample signals if BTC day price swing is above defined value
		let dayPriceChangeOk = false;
		if (Math.abs(bitcoinPriceChange.day) >= settings.mh_signals.halt_signals_if_btc_change_day_percentage) {
			if (!signalsHalted) {
				signalsHalted = true;
				logger.info(`Halting signals because BTC moved ${bitcoinPriceChange.day}% in the last 24 hours - currently: ${bitcoinPriceChange.price}$`);
			}
		} else {
			dayPriceChangeOk = true;
		}

		// check signals resume condition
		if (hourPriceChangeOk && dayPriceChangeOk) {
			if (signalsHalted) {
				signalsHalted = false;
				logger.info(`Signals resumed`);

			}
		}
	}

	if (signalsHalted) {
		_recallGetSignals();
		return;
	}



	// Get signal from mining hamster API
	let signals = await mh.getSignal().catch(error => {
		logger.warn(`Failed getting signal from MiningHamster - ${error}`);
		_recallGetSignals();
		return;
	});


	if (signals) {
		let signal = signals[0];

		// console.log(signal);

		// Check signal is new and not repeated
		let signalHash = stringHash(JSON.stringify(signal));
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

			// Check time difference since signal was published
			let timeSinceSignal = mh.timeSinceSignal(signal);

			// todo: check signal coin tick with % diff not just time?
			if (timeSinceSignal < 0) {
				logger.error(`Time difference from signal is negative ${timeSinceSignal} - check timezone settings ${JSON.stringify(signal)}`);
				_recallGetSignals();
				return;
			}

			logger.debug(`Time difference from now is: ${timeSinceSignal} secs / ~${Math.floor(timeSinceSignal/60)} mins`);

			// Make sure signal is within defined time range and try to enter
			if ((timeSinceSignal < settings.trade.max_signal_time_diff_to_buy) && (timeSinceSignal >= settings.trade.min_signal_time_diff_to_buy)) {
				// if (true) { // debug time check disabled:

				// convert raw CET signal time string to ISO date (and adjust timezone)
				signal.time = mh.convertSignalTimeToIsoDate(signal);

				// try to enter position for valid signal with retries
				let enterPosition = await _enterPositionOnSignal(signal, settings.trade.enter_position_retries).catch((error) => {
					if (error !== `warn`) {
						logger.warn(`Could not enter position because: ${JSON.stringify(error)}`);
					}
				});

				if (enterPosition) {
					logger.info(`Success entering new position on signal`);
				}


			} else {
				logger.debug(`Not entering signal on ${signal.market} because its out of the defined time range-${moment().seconds(-1 * timeSinceSignal).fromNow()}`);
			}
		} else {
			// NOP - it's a repeated signal nothing to do
			process.stdout.write(`.`);
			// logger.debug(`Got signal: ${JSON.stringify(signal.market)} - not new (${signalHash} / ${lastSignalHash})`); //remove
		}
	}

	// Recall signal sample loop with defined polling interval
	_recallGetSignals();
}


function start() {
	logger.info('Starting signal processor');
	loopTimer = setInterval( _loopGetSignals, settings.mh_signals.polling_interval*1000);
	// _loopGetSignals();
}


module.exports = { start };

// timer = setInterval(loopGetSignals, settings.mh_signals.polling_interval*1000); //TODO: make sure previous call completed before new one starts




