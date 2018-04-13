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
		api_secret : process.env.BITTREX_API_SECRET,
		polling_interval : 12, // poll positions/orders on bittrex every x seconds
	},

	report : {
		filename : 'bot_trade_report.txt',
	},

	trade : {
		simulated_trading : true, // if true no real buy/sells will happen
		simulated_balance : {
			bittrex : {
				btc: 0.5,
				eth: 0,
				usdt: 0
			},
			binance : {}
		},
		active_exchanges : ['bittrex'], //, 'binance'], // which exchanges to trade on
		coin_blacklist : [], //['VOX', 'CHAT'],
		enter_position_retries : 5, // maxiumum tries to enter a position on a signal

		// positions strategy for signals
		strategy : ['mh_signals'], // , 'rsi'], // currently the only strategy - setting ignored
		sell_signal_at_profit : true, // sell signal at profit, if true sell when reaches this profit, else use trailing stop_loss (trailing_stop_loss_enabled must be enabled)
		sell_at_profit_percentage : 3, // sell when coin reaches 3% gain
		buy_signal_above_max_percentage: 0.5, // buy coin for up to X percent above signal price

		// Stop Loss strategy
		stop_loss_enabled : true,  // when enabled:
		stop_loss_percentage : 16, // if position drops by X percent sell it immediately
		trailing_stop_loss_enabled : false, // sell_signal_at_profit will take precedence over this setting
		trailing_stop_loss_arm_percentage : 1,  // rise by Y percent to arm the trailing stop loss mechanism
		trailing_stop_loss_percentage : 3, // after position has risen by Y percent (above) and drops by X (this) percent, sell it


		// signal positions timing
		max_signal_time_diff_to_buy : 180, // max time that elapsed since the signal to trigger a buy (seconds) - after that signal is ignored
		min_signal_time_diff_to_buy : 0, // min time to wait after signal is given to trigger a buy for the signal (seconds), 0 for immediate action
		max_time_open_orders : 600, // when to cancel open buy orders for signals (which probably went higher in price too fast)
		max_time_to_hold_signal_position : 7*24*60*60, // position will be sold at any value after this time (even at loss)

		// budgeting
		base_assets : ['BTC'], // don't do ETH or USDT or BNB trading for now (*)
		total_to_trade : {
			btc : 0.5, // total max BTC value to assign for bot - bot will use less if less is available
			eth : 0,
			usdt : 0,
			bnb : 0, // binance only
		},
		max_open_positions : 10, // maximum number of positions to keep active, after this amount of open positions new signals will be ignored till positions are closed
		percentage_of_budget_per_position : 10, // assign X percent of the total btc to each position
		min_per_position: {
			btc : 0.01,
			eth : 0.5,
			usdt : 250,
			bnb : 20,
		}, // if not enough funds left in exchange - this is the min amount to open a new position, below that, signals are ignored


	},

	mh_signals : {
		base_url : 'https://mininghamster.com/api/v2/',
		api_key : process.env.MININGHAMSTER_API_KEY,

		polling_interval : 10, // 30 is ok
		signal_time_signature_utc_diff_string : 'UTC+0200',
		halt_signals_if_btc_change_hour_percentage : 5.0, // ignore signals if BTC moved > 5% in one hour
		halt_signals_if_btc_change_day_percentage : 10.0, // ignore signals if BTC moved > 10% in 24 hours
		check_btc_change_every : 5*60, // check BTC price swing every ? seconds


		// buy_signal_condition with TA
		// ..
	}
};

module.exports = Object.freeze(settings);
