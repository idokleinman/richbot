'use strict';

require('dotenv').config();
const BittrexController = require('./lib/BittrexController');

console.log('welcome');
var bc = new BittrexController();
bc.getmarketsummaries();
