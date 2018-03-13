'use strict';

const Promise = require('bluebird');
const axios = require('axios');

class MiningHamsterController {

	constructor() {
		this.apiKey = process.env.MININGHAMSTER_API_KEY;
		this.baseUrl = process.env.MININGHAMSTER_BASE_URL; // move to settings.js
	}


	getSignal(key = this.apiKey) {
		axios.get(`${this.baseUrl}${key}`)
			.then(response => {
				console.log(response.data);
			})
			.catch(error => {
				console.log(error);
			});
	}


	getTestSignal() {
		this.getSignal('288b2113-28ac-4b14-801f-f4d9cf9d87ad');
	}

	/*
	timeSinceSignal(signal) {
			var localDate = new Date();
			var utcOffset = localDate.getTimezoneOffset();
			console.log('local time utc offset: '+utcOffset);
			var cetOffset = utcOffset + 60;
			var cestOffset = utcOffset + 120;

			var localDateTime = localDate.getTime();
			var cetDate;

			cetDate.setTime(Date.parse(signal.time));
			console.log(cetDate);

			console.log('signal time utc offset: '+utcOffset);
	}
	*/

}

module.exports = MiningHamsterController;
