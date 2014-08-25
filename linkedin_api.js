var urlUtil = Npm.require('url');

var apiUrl = "https://api.linkedin.com/v1";

// Essential fields
var fields = [
  'firstName', 'lastName', 'emailAddress', 'pictureUrl;secure=true', 
  'headline', 'location', 'industry', 'id', 'siteStandardProfileRequest'
];

var normalizeUser = function(linkedinUser){

  if(!linkedinUser.siteStandardProfileRequest)
    console.log(linkedinUser);
  // The real linkedin ID is hidden in the profil request url
  var url = linkedinUser.siteStandardProfileRequest.url;
  if(!url)
    console.log(linkedinUser);

  linkedinUser.apiId = linkedinUser.id;
  linkedinUser.id = urlUtil.parse(url, true).query.id;

  // Normalizing properties name
  normalized = {};

  normalized.linkedinId = linkedinUser.id;
  normalized.linkedinApiId = linkedinUser.apiId;

  normalized.profile = {
    'firstname'   : linkedinUser.firstName,
    'lastname'    : linkedinUser.lastName,
    'headline'    : linkedinUser.headline || null,
    'pictureUrl'  : linkedinUser.pictureUrl || null,
    'location'    : linkedinUser.location || null,
  };

  if(linkedinUser.emailAddress)
    normalized.emails = [{
      'address' : linkedinUser.emailAddress,
      'verified' : false
    }];

  normalized.services = {
    linkedin : _.pick(linkedinUser, ['id', 'apiId', 'siteStandardProfileRequest'])
  }

  return normalized;
}

LinkedIn.Api = {

  'connections' : function(accessToken){
    check(accessToken, String);

    var url = apiUrl+'/people/~/connections:(' + fields.join(',') + ')';

    var connections = Meteor.http.get(url, {
      params: {
        'oauth2_access_token': accessToken,
        'format': 'json'
      }
    }).data.values;

    connections = _.filter(connections, function(connection){
      return connection.id != 'private';
    })

    return _.map(connections, normalizeUser);
  },

  'profile' : function(accessToken, connectionId){
    check(accessToken, String);

    console.log("ACCESS : ", accessToken)

    var id = connectionId || '~';
    var url = apiUrl+'/people/'+id+':(' + fields.join(',') + ')';

    var profile = Meteor.http.get(url, {
      params: {
        'oauth2_access_token': accessToken,
        'format': 'json'
      }
    }).data;

    return normalizeUser(profile);
  },

  'message' : function(accessToken, to, subject, body){
    check(accessToken, String);

    var url = apiUrl+'/people/~/mailbox';

    var message = {
      'subject': subject,
      'body': body,
      'recipients': {
        'values': [
          { 
            'person': { '_path': '/people/'+to}
          }
        ]
      }
    }

    var response = Meteor.http.post(url, {
      'data' : message,
      'params': {
        'oauth2_access_token': accessToken,
        'format': 'json'  
      },
      'headers': {
        'content-type' : 'application/json'
      }
    });
  }
}

var getAccessToken = function(userId){
  check(userId, String);

  var user = getUser(userId);
  return user.services.linkedin.accessToken || '';
}

Meteor.methods({
  'IN_message' : function(to, subject, body){
    if(!this.userId)
      return;

    return LinkedIn.Api.message(getAccessToken(this.userId), to, subject, body); 
  },

  'IN_connections' : function(){  
    if(!this.userId)
      return;

    return LinkedIn.Api.connections(getAccessToken(this.userId)); 
  },

  'IN_profile' : function(connectionId){  
    if(!this.userId)
      return;

    return LinkedIn.Api.profile(getAccessToken(this.userId), connectionId);  
  }
});
