'use strict';

require('dotenv').config();
let bittrex = require('node-bittrex-api');

bittrex.options({
  'apikey' : process.env.BITTREX_API_KEY,
  'apisecret' : process.env.BITTREX_API_SECRET,
});


bittrex.getmarketsummaries( function( data, err ) {
  if (err) {
    return console.error(err);
  }
  for( var i in data.result ) {
    bittrex.getticker( { market : data.result[i].MarketName }, function( ticker ) {
      console.log( ticker );
    });
  }
});

console.log('welcome');
console.log(process.env.BITTREX_API_KEY);
