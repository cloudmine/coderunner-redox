var request = require('request');

module.exports = {
  login: function(redoxOptions, callback) {

    var REDOX_BASE = "https://api.redoxengine.com/";
    var REDOX_ENDPOINT_LOGIN = "auth/authenticate";
    var REDOX_ENDPOINT_QUERY = "query";

    var redoxOptions = redoxOptions

    // Setting up the options we'll need to get an auth token from Redox
    var loginOptions = {
      url: REDOX_BASE + REDOX_ENDPOINT_LOGIN,
      form:{
        apiKey: redoxOptions['apiKey'],
        secret: redoxOptions['secret']
      }
    };

    request.post(loginOptions, function(err, response, body){
      // Looks like we got the token.

      var jsonBody = JSON.parse(body);

      redoxOptions['accessToken'] = jsonBody['accessToken'];
      redoxOptions['tokenExpiry'] = jsonBody['expires'];
      redoxOptions['refreshToken'] = jsonBody['refreshToken'];

      callback({
        "error" : err,
        "response" : response,
        "body" : body,
        "redoxOptions" : redoxOptions
      });
    })

  }

}
