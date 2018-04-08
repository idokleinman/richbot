'use strict';

const axios = require('axios');
const moment = require('moment');
const settings = require('../settings');
const logger = require('./utils/logger');


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

	convertSignalTimeToIsoDate(signal) {
		let signalTimeStr = signal.time + ' ' + settings.mh_signals.signal_time_signature_utc_diff_string;
		return moment(signalTimeStr, 'YYYY-MM-DD HH:mm:ss [UTC]Z').toDate();
	}

	timeSinceSignal(signal) {

		let signalTime = this.convertSignalTimeToIsoDate(signal);
		// logger.debug(`signal orig time ${signal.time} and converted ${signalTime}`);
		let nowTime = new Date();

		// get the difference (in milliseconds) between the two
		let diff = (nowTime - signalTime) / 1000;

		return diff;

	}

}

module.exports = MiningHamsterController;
