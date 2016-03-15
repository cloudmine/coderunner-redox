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

var masterCMWebService = new cloudmine.WebService({
  appid: CLOUDMINE_APPID,
  apikey: CLOUDMINE_MASTER_APIKEY
})

// Redox setup

var redoxOptions = {
  apiKey: '43445562-feef-4f08-a14f-d05950d6465f',
  secret: 'irjNpfVkCmEYvk2Y4aFRRyTiYruqxQgf',
  accessToken: '',
  tokenExpiry: '',
  refreshToken: '',
}

/**
* Function that parses Redox's JSON output, and then saves it to CloudMine
* The function creates four objects from the Redox response supplied: patient,
* clinical, allergy, and medication. After creating these JSON representations,
* it searches CloudMine to see if the user already exists. If it does, we
* update that user's data. If it doesn't, then we create a new user, and create
* new data.
* @param {JSON} input - the body returned from a Redox query
*/
function cmParseRedoxQuery(input){

  var clinicalObject = {};

  var patientObject = {};
  patientObject['__class__'] = 'Patient';

  var allergyObject = {};
  allergyObject['__class__'] = 'Allergies';

  var medicationObject = {};
  medicationObject['__class__'] = 'Medications';

  //////////////// Clinical Object Parsing ////////////////

  clinicalObject['__class__'] = input['Meta']['DataModel'].toString().replace(' ', '');

  clinicalObject['procedures'] = [];
  var recentProcedures = input['Procedures']['Procedures'];
  for (var i = 0; i < recentProcedures.length; i++) {
    var item = recentProcedures[i];
    delete item['Code']
    delete item['CodeSystem'];
    delete item['CodeSystemName'];
    clinicalObject['procedures'].push(item);
  }


  //////////////// Patient Object Parsing ////////////////

  var patientInfo = input['Header']['Patient'];

  patientObject['ssn'] = patientInfo['Demographics']['SSN'];
  patientObject['firstName'] = patientInfo['Demographics']['FirstName'];
  patientObject['lastName'] = patientInfo['Demographics']['LastName'];
  patientObject['dob'] = patientInfo['Demographics']['DOB'];
  patientObject['sex'] = patientInfo['Demographics']['Sex'];
  patientObject['address'] = patientInfo['Demographics']['Address'];
  patientObject['phone'] = patientInfo['Demographics']['PhoneNumber'];
  patientObject['race'] = patientInfo['Demographics']['Race']['Name'];
  patientObject['ethnicity'] = patientInfo['Demographics']['Ethnicity']['Name'];
  patientObject['religion'] = patientInfo['Demographics']['Religion']['Name'];
  patientObject['marital'] = patientInfo['Demographics']['MaritalStatus']['Name'];


  //////////////// Allergy Object Parsing ////////////////

  var allergyInfo = input['Allergies'];

  for (var i = 0; i < allergyInfo.length; i++){
    var allergySubinfo = allergyInfo[i];

    allergyObject[allergySubinfo['Substance']['Name']] = {
      "reaction" : allergySubinfo['Reaction']['Name'],
      "severity" : allergySubinfo['Severity']['Name']
    }

  }


  //////////////// Medications Object Parsing ////////////////

  var medicationInfo = input['Medications']

  for (var i = 0; i < medicationInfo.length; i++){
    var medicationSubinfo = medicationInfo[i];

    medicationObject[medicationSubinfo['Product']['Name']] = {
      'start' : medicationSubinfo['StartDate'],
      'frequency' : medicationSubinfo['Frequency'],
      'route' : medicationSubinfo['Route']['Name'],
      'dose' : medicationSubinfo['Dose']
    }

  }

  // console.log(clinicalObject);
  // console.log(patientObject);
  // console.log(allergyObject);
  // console.log(medicationObject);

  //////////////// Talk to CloudMine Application ////////////////

  masterCMWebService.search('[__class__ = "Patient", ssn = "' + patientObject['ssn'] + '"]').on('success', function(data, response){
    // Successful search

    var patientGuid;
    var clinicalGuid;
    var allergyGuid;
    var medicationGuid;

    if (Object.keys(data).length == 0){
      // No user.
      patientGuid = guid.create().toString();
      clinicalGuid = guid.create().toString();
      allergyGuid = guid.create().toString();
      medicationGuid = guid.create().toString();

      patientObject['clinical'] = clinicalGuid;
      patientObject['allergies'] = allergyGuid;
      patientObject['medications'] = medicationGuid;

      medicationObject['patient'] = patientGuid;
      allergyObject['patient'] = patientGuid;
      clinicalObject['patient'] = patientGuid;

    } else {

      patientGuid = Object.keys(data)[0];
      var record = data[patientGuid];
      clinicalGuid = record['clinical'];
      allergyGuid = record['allergies'];
      medicationGuid = record['medications'];
    }


    masterCMWebService.update(patientGuid, patientObject);
    masterCMWebService.update(medicationGuid, medicationObject);
    masterCMWebService.update(clinicalGuid, clinicalObject);
    masterCMWebService.update(allergyGuid, allergyObject);

    reply({"success":
      {
        "updated" : {
          'patient' : patientObject,
          'medication' : medicationObject,
          'clinical' : clinicalObject,
          'allergy' : allergyObject
        }
      }
    });

  }).on('error', function(error, response){
    reply({"error": "couldn't update objects"})
  });
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
        cmParseRedoxQuery(queryResponseData['body']);
      }
    });
  }
});

};
