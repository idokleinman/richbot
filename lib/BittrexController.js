'use strict';


const bittrexApi = require('node-bittrex-api');

class BittrexController {

  constructor() {
    console.log(process.env.BITTREX_API_KEY);
    this.options = {
      'apikey' : process.env.BITTREX_API_KEY,
      'apisecret' : process.env.BITTREX_API_SECRET,
    };
    bittrexApi.options(this.options);

  }


  getmarketsummaries() {

    bittrexApi.getmarketsummaries( function( data, err ) {
      if (err) {
        return console.error(err);
      }
      var i = 1;
      data.result.forEach(function(value) {
        i++;
        if (i>5) {
          return true;
        }
        bittrexApi.getticker( { market : value.MarketName }, function( ticker ) {
          bittrexApi.getmarketsummary( { market : value.MarketName}, function( summary, err ) {
            console.log(value.MarketName);
            console.log(ticker.result);
            console.log(summary.result);
          });
        });
      });
    });
  }

}

module.exports = BittrexController;
