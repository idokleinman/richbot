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
	}

	enter(pair, exchange='bittrex', buyprice) {
		// quantity by settings
	}

	_monitor() {
		// check on open/pending positions and make sure they're handled by strategy

	}
}

module.exports = PositionsManager;
