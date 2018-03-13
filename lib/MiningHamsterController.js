'use strict';

const Promise = require('bluebird');
const axios = require('axios');
const moment = require('moment');
const settings = require('../settings')

class MiningHamsterController {

	constructor() {
		this.apiKey = process.env.MININGHAMSTER_API_KEY;
		this.baseUrl = process.env.MININGHAMSTER_BASE_URL; // move to settings.js
	}


	getSignal(key = this.apiKey) {
		return axios.get(`${this.baseUrl}${key}`)
			.then(response => {
				return response.data;
			})
			.catch(error => {
				console.log(error);
			});
	}


	getTestSignal() {
		this.getSignal('288b2113-28ac-4b14-801f-f4d9cf9d87ad');
	}

	timeSinceSignal(signal) {

		let signalTimeStr = signal.time + ' ' + settings.mh_signals.signal_time_signature_utc_diff_string;

		let signalTime = moment(signalTimeStr, 'YYYY-MM-DD HH:mm:ss [UTC]Z').toDate();
		// let tzSignalTime = signalTime.clone().tz('Europe/Paris').toDate();
		let nowTime = new Date();//.getTime();


		// get the difference (in milliseconds) between the two
		var diffInMs = nowTime - signalTime;

		console.log('signal '+signalTime);
		console.log('local  '+nowTime);
		console.log('diff:  '+diffInMs/1000);


	}

}

module.exports = MiningHamsterController;