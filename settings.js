'use strict';

// all times given in seconds

const settings = {
	bittrex : {
		base_url : 'https://mininghamster.com/api/v2/',
	},


	trade : {
		simulated_trading : true, // if true no real buy/sells will happen
		trade_on_exchanges : ['bittrex'], //, 'binance'],
		strategy : ['mh_signals'], // , 'rsi'],

		// Loss handling
		stop_loss_enabled : true,
		stop_loss_percentage : 15,

		trailing_stop_loss_arm_percentage : 1,
		trailing_stop_loss_enabled : true,
		trailing_stop_loss_percentage : 3,

		// positions
		max_time_to_hold_signal_position : 7*24*60*60,

	},

	mh_signals : {
		polling_interval : 30,
		signal_time_signature_utc_diff_string : 'UTC+0100',
		// max time that elapsed since the signal to trigger a buy (seconds)
		max_time_diff_to_buy : 180,
		// min time to wait after signal is given to trigger a buy for the signal (seconds)
		min_time_diff_to_buy : 30,
		// buy_signal_condition
	}
};

module.exports = Object.freeze(settings);
