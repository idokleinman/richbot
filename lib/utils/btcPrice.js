'use strict';

let btcPrices = [];

var logger = require('./logger');

async function calculateBitcoinPriceChange(exchangeController) {
	let btcChangeOneMin = 0;
	let btcChangeFiveMin = 0;
	let btcChangeOneHour = 0;
	let btcChangeSixHour = 0;
	let btcChangeTwentyFourHour = 0;
	let trimIndex = 0;


	let btcPriceObj = await exchangeController.getLatestTick('USDT-BTC');
	let btcPrice = btcPriceObj[0]['C'];
	logger.info(`Bitcoin price: ${btcPrice}`);
	btcPrices.push({ btcPrice, timestamp: Date.now() });
	let i = 0;
	btcPrices.forEach(price => {
		let oneSec = 1000;
		let oneMin = 60 * oneSec;
		let fiveMin = 5 * oneMin;
		let oneHour = oneMin * 60;
		let sixHours = oneHour * 6;
		let twentyFourHours = oneHour * 24;
		let samplingDiff = settings.mh_signals.polling_interval*1000*2;
		i++;

		let timeDiff =  Date.now() - price.timestamp;

		if ((timeDiff > oneMin-samplingDiff) && (timeDiff < oneMin+samplingDiff)) {
			btcChangeOneMin = (((btcPrice - price.btcPrice) / btcPrice) * 100).toFixed(2);
		}

		if ((timeDiff > fiveMin-samplingDiff) && (timeDiff < fiveMin+samplingDiff)) {
			btcChangeFiveMin = (((btcPrice - price.btcPrice) / btcPrice) * 100).toFixed(2);
		}

		if ((timeDiff > oneHour-samplingDiff) && (timeDiff < oneHour+samplingDiff)) {
			btcChangeOneHour = (((btcPrice - price.btcPrice) / btcPrice) * 100).toFixed(2);
		}

		if ((timeDiff > sixHours-samplingDiff) && (timeDiff < sixHours+samplingDiff)) {
			btcChangeSixHour = (((btcPrice - price.btcPrice) / btcPrice) * 100).toFixed(2);
		}

		if ((timeDiff > twentyFourHours-samplingDiff) && (timeDiff < twentyFourHours+samplingDiff)) {
			btcChangeTwentyFourHour = (((btcPrice - price.btcPrice) / btcPrice) * 100).toFixed(2);
			trimIndex = i;

		}

	});

	logger.info(`BTC 1-min: ${btcChangeOneMin}% 5-min: ${btcChangeFiveMin}% 1-hour: ${btcChangeOneHour}% 6-hour: ${btcChangeSixHour}% 24-hour: ${btcChangeTwentyFourHour}%`);
	if (trimIndex > 0) {
		btcPrices.slice(trimIndex, btcPrices.length - 1);
		trimIndex = 0;
	}

	return; //todo: make object

}


// [“oneMin”, “fiveMin”, “thirtyMin”, “hour”, “day”].

async function getBitcoinPriceChange(exchangeController) {
	let btcPriceObj;

	btcPriceObj = await exchangeController.getLatestTick('USDT-BTC','oneMin');
	let btcPrice1Min = (((btcPriceObj[0]['C'] - btcPriceObj[0]['O']) / btcPriceObj[0]['C']) * 100).toFixed(2);

	btcPriceObj = await exchangeController.getLatestTick('USDT-BTC','fiveMin');
	let btcPrice5Min = (((btcPriceObj[0]['C'] - btcPriceObj[0]['O']) / btcPriceObj[0]['C']) * 100).toFixed(2);

	btcPriceObj = await exchangeController.getLatestTick('USDT-BTC','thirtyMin');
	let btcPrice30Min = (((btcPriceObj[0]['C'] - btcPriceObj[0]['O']) / btcPriceObj[0]['C']) * 100).toFixed(2);

	btcPriceObj = await exchangeController.getLatestTick('USDT-BTC','hour');
	let btcPrice1Hour = (((btcPriceObj[0]['C'] - btcPriceObj[0]['O']) / btcPriceObj[0]['C']) * 100).toFixed(2);

	btcPriceObj = await exchangeController.getLatestTick('USDT-BTC','day');
	let btcPrice24Hour = (((btcPriceObj[0]['C'] - btcPriceObj[0]['O']) / btcPriceObj[0]['C']) * 100).toFixed(2);

	logger.info(`BTC price change 1-min: ${btcPrice1Min}% 5-min: ${btcPrice5Min}% 30-min: ${btcPrice30Min}% 1-hour: ${btcPrice1Hour}% 24-hour: ${btcPrice24Hour}%`);

	let btcChange = {
		oneMin : btcPrice1Min,
		fiveMin : btcPrice5Min,
		thirtyMin : btcPrice30Min,
		hour : btcPrice1Hour,
		day : btcPrice24Hour
	}

	return btcChange;

}

module.exports = { getBitcoinPriceChange, calculateBitcoinPriceChange };