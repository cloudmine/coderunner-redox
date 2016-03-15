var guid = require('guid');
var cloudmine = require('cloudmine')

module.exports = {

  parse: function(type, input, cmOptions, callback) {

    var cmWebService = new cloudmine.WebService(cmOptions);
    // Creating the foundations of the JSON blobs we'll be saving as objects on the CloudMine system

    // The clinical object stores meta data about the visit
    var clinicalObject = {};

    // Stores information about the patient
    var patientObject = {};
    patientObject['__class__'] = 'Patient';

    // Stores information about the patient's allergies
    var allergyObject = {};
    allergyObject['__class__'] = 'Allergies';

    // Stores information about the patient's medications
    var medicationObject = {};
    medicationObject['__class__'] = 'Medications';

    //////////////// Clinical Object Parsing ////////////////

    // in this case, the result will be a
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

    cmWebService.search('[__class__ = "Patient", ssn = "' + patientObject['ssn'] + '"]').on('success', function(data, response){
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


      cmWebService.update(patientGuid, patientObject);
      cmWebService.update(medicationGuid, medicationObject);
      cmWebService.update(clinicalGuid, clinicalObject);
      cmWebService.update(allergyGuid, allergyObject);

      callback({"success":
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
      callback({"error": "couldn't update objects"})
    });
  }
}
