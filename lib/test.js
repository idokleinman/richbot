"use strict";

const BittrexController = require('./BittrexController');

var bittrex = new BittrexController();


async function test() {
	let buyOrderId = await bittrex.buyLimit('BTC-ADA', 100, 0.00003370).catch(error => {console.log(error)});

	// small trade:
	// { success: false,
	// 	message: 'DUST_TRADE_DISALLOWED_MIN_VALUE_50K_SAT',
	// 	result: null }

	// not whitelisted IP:
	// { success: false,
	// 	message: 'WHITELIST_VIOLATION_IP',
	// 	result: null }


	console.log('buyOrderId');
	console.log(buyOrderId);

	let orderInfo = await bittrex.getOrder(buyOrderId).catch(error => {console.log(error)});

	/*
	{ AccountId: null,
		OrderUuid: 'd6590e1b-caac-4714-9249-a54c1e69d07d',
		Exchange: 'BTC-ADA',
		Type: 'LIMIT_BUY',
		Quantity: 100,
		QuantityRemaining: 100,
		Limit: 0.0000337,
		Reserved: 0.00337,
		ReserveRemaining: 0.00337,
		CommissionReserved: 0.00000842,
		CommissionReserveRemaining: 0.00000842,
		CommissionPaid: 0,
		Price: 0,
		PricePerUnit: null,
		Opened: '2018-04-21T00:21:11.317',
		Closed: null,
		IsOpen: true,
		Sentinel: 'aa74f9e1-4fee-4051-b261-1fede24c0d3e',
		CancelInitiated: false,
		ImmediateOrCancel: false,
		IsConditional: true,
		Condition: 'LESS_THAN',
		ConditionTarget: 0 }
		*/

	console.log('orderInfo:');
	console.log(orderInfo);

	let cancelStatus = await bittrex.cancelOrder(buyOrderId).catch(error => {console.log(error)});

	console.log('cancelStatus');
	console.log(cancelStatus); // true

	orderInfo = await bittrex.getOrder(buyOrderId).catch(error => {console.log(error)});

	console.log('cancelled orderInfo');
	console.log(orderInfo);

/*
	{ AccountId: null,
		OrderUuid: 'd6590e1b-caac-4714-9249-a54c1e69d07d',
		Exchange: 'BTC-ADA',
		Type: 'LIMIT_BUY',
		Quantity: 100,
		QuantityRemaining: 100,
		Limit: 0.0000337,
		Reserved: 0.00337,
		ReserveRemaining: 0.00337,
		CommissionReserved: 0.00000842,
		CommissionReserveRemaining: 0.00000842,
		CommissionPaid: 0,
		Price: 0,
		PricePerUnit: null,
		Opened: '2018-04-21T00:21:11.317',
		Closed: '2018-04-21T00:21:11.457',
		IsOpen: false,
		Sentinel: 'ace2039b-5ffb-4e1f-99ec-864c4fa66077',
		CancelInitiated: false,
		ImmediateOrCancel: false,
		IsConditional: true,
		Condition: 'LESS_THAN',
		ConditionTarget: 0 }
*/

	return;


}

module.exports = { test };

/*
 bot install:

 bittrex keys
 whitelist ip
 DB instance
 DB user
mining hamster account + API key
*/

