module.exports = {

  query: function(redoxOptions, body, callback){

    var request = require('request');

    var REDOX_BASE = "https://api.redoxengine.com/";
    var REDOX_ENDPOINT_LOGIN = "auth/authenticate";
    var REDOX_ENDPOINT_QUERY = "query";

    // If you're not logged in, you can't well query.
    if (!redoxOptions['accessToken']){
      console.log('sorry, you don\'t have an access token. Please log in before trying to query');
      callback({"error": "no access token"});
      return;
    }

    var queryOptions = {
      url: REDOX_BASE + REDOX_ENDPOINT_QUERY,
      json: true,
      body: body,
      headers: {
        "Authorization": 'Bearer ' + redoxOptions['accessToken'],
        "Content-Type": "application/json"
      }
    }

    request.post(queryOptions, function(err, response, body){
      callback({"error" : err, "response" : response, "body": body})
    });

  }
}
