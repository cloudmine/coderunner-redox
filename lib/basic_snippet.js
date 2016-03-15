'use strict';
//
// CloudMine, Inc.
// 2015
//

module.exports = function(req, reply) {

  var cloudmine = require('cloudmine')

  var ws = new cloudmine.WebService({
    appid: 'c9d4c770f12e8d46232bd2e0fecbfb0e',
    apikey: '5E0188E228844D1D85B3DB379A8E0853'
  });

  ws.set('some_id', {
    field: "value",
    other: "other_value",
    color: "red"
  }).on('success', function(data, response){
    reply(data);
  }).on('error', function(error, response){
    reply(error);
  })

};
