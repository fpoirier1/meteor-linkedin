var urlUtil = Npm.require('url');

OAuth.registerService('linkedin', 2, null, function(query) {

  var response = LinkedIn.Oauth.getTokenResponse(query);
  var accessToken = response.accessToken;

  var userParams = LinkedIn.Api.profile(accessToken);

  userParams.services.linkedin = _.extend(userParams.services.linkedin, {
    accessToken: accessToken,
    expiresAt: (+new Date) + (1000 * response.expiresIn)
  });
  console.log(userParams);
  return {
    serviceData: userParams.services.linkedin,
    options: _.omit(userParams, "services")
  };
});

// checks whether a string parses as JSON
var isJSON = function (str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

// returns an object containing:
// - accessToken
// - expiresIn: lifetime of token in seconds
LinkedIn.Oauth = {};

LinkedIn.Oauth.getTokenResponse = function (query) {
  var config = ServiceConfiguration.configurations.findOne({service: 'linkedin'});
  if (!config)
    throw new ServiceConfiguration.ConfigError("Service not configured");

  var responseContent;
  try {
    // Request an access token
    responseContent = Meteor.http.post(
      "https://api.linkedin.com/uas/oauth2/accessToken", {
        params: {
          grant_type: 'authorization_code',
          client_id: config.clientId,
          client_secret: config.secret,
          code: query.code,
          redirect_uri: Meteor.absoluteUrl("_oauth/linkedin?close")
        }
      }).content;
  } catch (err) {
    throw new Error("Failed to complete OAuth handshake with LinkedIn. " + err.message);
  }

  // If 'responseContent' does not parse as JSON, it is an error.
  if (!isJSON(responseContent)) {
    throw new Error("Failed to complete OAuth handshake with LinkedIn. " + responseContent);
  }

  // Success! Extract access token and expiration
  var parsedResponse = JSON.parse(responseContent);
  var accessToken = parsedResponse.access_token;
  var expiresIn = parsedResponse.expires_in;

  if (!accessToken) {
    throw new Error("Failed to complete OAuth handshake with LinkedIn " +
      "-- can't find access token in HTTP response. " + responseContent);
  }

  return {
    accessToken: accessToken,
    expiresIn: expiresIn
  };
};

LinkedIn.retrieveCredential = function(credentialToken, credentialSecret) {
  return OAuth.retrieveCredential(credentialToken, credentialSecret)
};
