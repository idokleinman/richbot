'use strict';

require('dotenv').config();
// all times given in seconds

let mongo_pwd = encodeURI(process.env.MONGODB_PASSWORD);

const settings = {
	mongodb: {
		connection_string : `mongodb://${process.env.MONGODB_USERNAME}:${mongo_pwd}@ds115219.mlab.com:15219/richbot`
	},

	bittrex : {
		api_key : process.env.BITTREX_API_KEY,
		api_secret : process.env.BITTREX_API_SECRET
	},

	report : {
		filename : 'bot_trade_report.txt',
	},

	trade : {
		simulated_trading : true, // if true no real buy/sells will happen
		active_exchanges : ['bittrex'], //, 'binance'],
		strategy : ['mh_signals'], // , 'rsi'],

		// Loss handling
		stop_loss_enabled : true,
		stop_loss_percentage : 15,
		trailing_stop_loss_arm_percentage : 1,
		trailing_stop_loss_enabled : true,
		trailing_stop_loss_percentage : 3,

		// positions for signals
		max_time_to_hold_signal_position : 7*24*60*60, // position will be sold at any value after this time (even at loss)
		sell_signal_at_profit : true, // sell signal at profit, if true sell when reaches this profit, else use trailing stop_loss (trailing_stop_loss_enabled must be enabled)
		sell_at_profit_percentage : 3, // sell when coin reaches 3% gain
		buy_signal_above_max_percentage: 0.5, // buy coin for up to X percent above ask price

		// positions timing
		// max time that elapsed since the signal to trigger a buy (seconds) - after that signal is ignored
		max_signal_time_diff_to_buy : 180,
		// min time to wait after signal is given to trigger a buy for the signal (seconds), 0 for immediate action
		min_time_diff_to_buy : 30,
		// when to cancel open buy orders for signals (which probably went higher in price)
		max_time_open_orders : 600,

		// budgeting
		base_assets : ['BTC'], // don't do eth or usdt trading for now (*)
		total_btc_to_trade : 0.5, // total BTC value to assign for bot
		total_eth_to_trade : 0, // future
		total_usdt_to_trade : 0, // future
		max_open_positions : 10, // maximum number of positions to keep open, after this amount of open positions new signals will be ignored till positions are closed
		percentage_of_budget_per_position : 10, // assign X percent of the total btc to each position
		min_btc_per_position: 0.01, // if not enough funds left in exchange - this is the min amount to open a new position, below that, signals are ignored

	},

	mh_signals : {
		base_url : 'https://mininghamster.com/api/v2/',
		api_key : process.env.MININGHAMSTER_API_KEY,

		polling_interval : 30,
		signal_time_signature_utc_diff_string : 'UTC+0100',



		// buy_signal_condition with TA
		// ..
	}
};

module.exports = Object.freeze(settings);
