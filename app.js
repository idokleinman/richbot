'use strict';

require('dotenv').config();
const BittrexController = require('./lib/BittrexController');
const MiningHamsterController = require('./lib/MiningHamsterController');

console.log('welcome');

var bc = new BittrexController();
var mh = new MiningHamsterController();

bc.getMarketSummaries();
// bc.getCandles('BTC-ETH','fiveMin');


mh.getTestSignal();

function loopGetSignals() {
	// do whatever you like here
	console.log('---');

	mh.getSignal();
	setTimeout(loopGetSignals, 2000);
}

loopGetSignals();




