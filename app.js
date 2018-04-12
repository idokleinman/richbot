'use strict';

const logger = require('./lib/utils/logger');
const SignalProcessor = require('./lib/SignalProcessor');

logger.info('$$$ Welcome to RichBot! Let\'s make some money! $$$');
SignalProcessor.start();

// TODO:
// add express.js to serve  GET webpage with report, GET status of a position, POST new trading parameters/outside signal (future)
// Binance API support - future
// TA bot
// check signal TA indicators before entering position (wait for MACD cross or RSI <30 etc) - same for exiting position

