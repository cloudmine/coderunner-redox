'use strict';
//
// CloudMine, Inc.
// 2015
//

module.exports = function(req, reply) {

var request = require('request');
var cloudmine = require('cloudmine');
var guid = require('guid');
var _ = require('underscore');

var redoxAuth = require('./redox_auth');
var redoxQuery = require('./redox_query');
var cmParse = require('./parse');

// Reading the info from the req object

// var REQUEST_BODY = r eq.payload.request.body ? req.payload.request.body : null;
var REQUEST_QUERY = req.payload ? JSON.stringify(req.payload, null, 2) : null;

// if (_.has(req, 'payload')){
//   // there is a payload from the request
//   if (_.has(req.payload, 'request')){
//     if (_.has(req.payload.request, 'body')){
//       REQUEST_BODY = req.payload.request.body;
//       REQUEST_QUERY = _.has(REQUEST_BODY, 'query') ? REQUEST_BODY['query'] : null;
//     }
//   }
// }

// CloudMine setup

var CLOUDMINE_APPID = '94997e2f196a6a4a6f392c04b103e405';
var CLOUDMINE_MASTER_APIKEY = '662DE40478A74549867C35592AD739D2';

var cmOptions = {
  appid: CLOUDMINE_APPID,
  apikey: CLOUDMINE_MASTER_APIKEY
}

// Redox setup

var redoxOptions = {
  apiKey: '43445562-feef-4f08-a14f-d05950d6465f',
  secret: 'irjNpfVkCmEYvk2Y4aFRRyTiYruqxQgf',
  accessToken: '',
  tokenExpiry: '',
  refreshToken: '',
}


// An example query to send to Redox
var sampleQueryBody = {
  "Meta": {
    "DataModel": "Clinical Summary",
    "EventType": "Query",
    "EventDateTime": "2016-03-10T16:09:11.594Z",
    "Test": true,
    "Destinations": [
      {
        "ID": "ef9e7448-7f65-4432-aa96-059647e9b357",
        "Name": "Clinical Summary Endpoint"
      }
    ]
  },
  "Patient": {
    "Identifiers": [
      {
        "ID": "ffc486eff2b04b8^^^&1.3.6.1.4.1.21367.2005.13.20.1000&ISO",
        "IDType": "NIST"
      }
    ]
  }
}

// If the user has sent in a request query, use that. Otherwise, use the sample query. 
var queryBody = REQUEST_QUERY ? JSON.parse(REQUEST_QUERY) : sampleQueryBody;

// Doing the actual calls.
redoxAuth.login(redoxOptions, function(loginResponseData){

  if (loginResponseData["error"]){
    // There was an error in the login, don't go forward.
    reply({"error" : "couldn't log in"});
  } else {
    // We're logged in. Let's try and get that there query run.

    var newRedoxOptions = loginResponseData['redoxOptions'];

    redoxQuery.query(newRedoxOptions, queryBody, function(queryResponseData){
      if (queryResponseData["error"]){
        reply({"error" : "you logged in, but we couldn't query redox"});
      } else {
        cmParse.parse('clinical', queryResponseData['body'], cmOptions, function(parseResponse){
          reply(parseResponse)
        });
      }
    });
  }
});

};
