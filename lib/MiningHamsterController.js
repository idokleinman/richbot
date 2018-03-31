'use strict';

const axios = require('axios');
const moment = require('moment');
const settings = require('../settings')

class MiningHamsterController {

	constructor() {
		this.apiKey = settings.mh_signals.api_key;
		this.baseUrl = settings.mh_signals.base_url;
	}


	async getSignal(key = this.apiKey) {
		return axios.get(`${this.baseUrl}${key}`)
			.then(response => {
				return Promise.resolve(response.data);
			})
			.catch(error => {
				// console.log(error);
				return Promise.reject(error);
			});
	}


	async getTestSignal() {
		return this.getSignal('288b2113-28ac-4b14-801f-f4d9cf9d87ad');
	}

	timeSinceSignal(signal) {

		let signalTimeStr = signal.time + ' ' + settings.mh_signals.signal_time_signature_utc_diff_string;

		let signalTime = moment(signalTimeStr, 'YYYY-MM-DD HH:mm:ss [UTC]Z').toDate();
		let nowTime = new Date();


		// get the difference (in milliseconds) between the two
		let diffInMs = (nowTime - signalTime) / 1000;

		// console.log('signal '+signalTime);
		// console.log('local  '+nowTime);
		// console.log('diff:  '+diffInMs);

		return diffInMs;

	}

}

module.exports = MiningHamsterController;
