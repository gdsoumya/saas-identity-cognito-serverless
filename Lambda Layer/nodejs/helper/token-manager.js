'use strict';

// Declare library dependencies
const jwtDecode = require('jwt-decode');
const async = require('async');
const AWS = require('aws-sdk');

//Configure Environment
var configuration = require('./config/config.json');

AWS.config.region = configuration.aws_region;
var lambda = new AWS.Lambda();
// TODO: replace temporary cache with real cache
var tokenCache = {};

/**
 * Extract an id token from a request, decode it and extract the tenant
 * id from the token.
 * @param req A request
 * @returns A tenant Id
 */
module.exports.getTenantId = function(req) {
    var tenantId = '';
    var bearerToken = req.headers.Authorization;
    if (bearerToken) {
        bearerToken = bearerToken.substring(bearerToken.indexOf(' ') + 1);
        var decodedIdToken = jwtDecode(bearerToken);
        if (decodedIdToken)
            tenantId = decodedIdToken['custom:tenant_id'];
    }
    return tenantId;
}
/**
 * Get the authorization token from a request
 * @param req The request with the authorization header
 * @returns The user's email address
 */
module.exports.getRequestAuthToken = function(req) {
    authToken = '';
    var authHeader = req.headers.Authorization;
    if (authHeader)
        var authToken = authHeader.substring(authHeader.indexOf(' ') + 1);
    return authToken;
}
/**
 * Decode and token and extract the token
 * @param bearerToken A bearer token
 * @returns The user's full name
 */
module.exports.decodeToken = function(bearerToken) {
    var resultToken = {};
    if (bearerToken) {
        var decodedIdToken = jwtDecode(bearerToken);
        if (decodedIdToken)
            resultToken = decodedIdToken;
    }
    return resultToken;
}
/**
 * Get access credential from the passed in request
 * @param req A request
 * @returns The access credentials
 */
module.exports.getCredentialsFromToken = function(req, updateCredentials) {
    var bearerToken = req.headers.Authorization;
    if (bearerToken) {
        var tokenValue = bearerToken.substring(bearerToken.indexOf(' ') + 1);
        if (!(tokenValue in tokenCache)) {
            var decodedIdToken = jwtDecode(tokenValue);
            var userName = decodedIdToken['cognito:username'];
            async.waterfall([
                function(callback) {
                    getUserPoolWithParams(userName, callback)
                },
                function(userPool, callback) {
                    authenticateUserInPool(userPool, tokenValue, callback)
                }
            ], function(error, results) {
                if (error) {
                    console.log('Error fetching credentials for user')
                    updateCredentials(null);
                }
                else {
                    tokenCache[tokenValue] = results;
                    updateCredentials(results);
                }
            });
        }
        else if (tokenValue in tokenCache) {
            console.log('Getting credentials from cache');
            updateCredentials(tokenCache[tokenValue]);
        }
    }
};

/**
 * Lookup the user pool from a user name
 * @param user The username to lookup
 * @param callback Function called with found user pool
 */
module.exports.getUserPool = function(userName, callback) {

    var body = JSON.stringify({id : userName});
    var params = {
        FunctionName: 'lookup_handler', // the lambda function we are going to invoke
        InvocationType: 'RequestResponse',
        LogType: 'Tail',
        Payload: JSON.stringify({body: body})
    };
    lambda.invoke(params, function(error, response) {
        var res = JSON.parse(response.Payload)
        if (!error && res.statusCode === 200) {
            callback(null, JSON.parse(res.body));
        }
        else {
            callback(error, res);
            }
    });
}

/**
 * Lookup the user pool from a user name
 * @param user The username to lookup
 * @param idToken Identity token
 * @return params object with user pool and idToken
 */
function getUserPoolWithParams(userName, callback) {

    var body = JSON.stringify({id : userName});
    var params = {
        FunctionName: 'lookup_handler', // the lambda function we are going to invoke
        InvocationType: 'RequestResponse',
        LogType: 'Tail',
        Payload: JSON.stringify({body: body})
    };
    lambda.invoke(params, function(error, response) {
        var res = JSON.parse(response.Payload)
        if (!error && res.statusCode === 200) {
            callback(null, JSON.parse(res.body));
        }
        else {
            callback(null, "Error loading user: " + error);
        }
    });
}
/**
 * Authenticate the user in the user pool
 * @param userPool The pool to use for authentication
 * @param idToken The id token for this session
 * @param callback The callback for completion
 */
function authenticateUserInPool(userPool, idToken, callback) {
    var decodedIdToken = jwtDecode(idToken);
    var provider = decodedIdToken.iss;
    provider = provider.replace('https://', '');
    var params = {
        token: idToken,
        provider: provider,
        IdentityPoolId: userPool.IdentityPoolId
    }
    var getIdentity = getId(params, function (ret, data) {
        if (ret) {
            var params = {
                token: idToken,
                IdentityId: ret.IdentityId,
                provider: provider
            }
            var returnedIdentity = ret;
            var getCredentials = getCredentialsForIdentity(params, function (ret, data) {
                if (ret) {
                    var returnedCredentials = ret;

                    // put claim and user full name into one response
                    callback(null, {"claim": returnedCredentials.Credentials});
                }
                else {
                    console.log('ret');
                }
            })
        }
        else {
            console.log('ret');
        }
    })
}

/**
 * Get AWS Credentials with Cognito Federated Identity and ID Token
 * @param IdentityPoolId The Identity Pool ID
 * @param idToken The id token for this session
 * @param callback The callback for completion
 */
function getCredentialsForIdentity(event, callback) {
    var cognitoidentity = new AWS.CognitoIdentity({apiVersion: '2014-06-30',region: configuration.aws_region});
    var params = {
        IdentityId: event.IdentityId, /* required */
        //CustomRoleArn: 'STRING_VALUE',
        Logins: {
            [event.provider]: event.token,
            /* '<IdentityProviderName>': ... */
        }
    };
    cognitoidentity.getCredentialsForIdentity(params, function (err, data) {
        if (err) {
            console.log(err, err.stack);
            callback(err);
        }
        else {
            callback(data);
        }
    });
};

/**
 * Get Cognito Federated identity
 * @param IdentityPoolId The Identity Pool ID
 * @param AccountId The AWS Account Number
 * @param Logins Provider Map Provider : ID Token
 */
function getId (event, callback) {
    var cognitoidentity = new AWS.CognitoIdentity({apiVersion: '2014-06-30',region: configuration.aws_region});
    var params = {
        IdentityPoolId: event.IdentityPoolId, /* required */
        AccountId: configuration.aws_account,
        Logins: {
            [event.provider]: event.token,
            /* '<IdentityProviderName>': ... */
        }
    };
    cognitoidentity.getId(params, function (err, data) {
        if (err) {
            console.log(err, err.stack);
            callback(err);
        }
        else {
            callback(data);
        }
    });
};
module.exports.getSystemCredentials = function(callback) {
    var sysCreds = '';
    var sysConfig = new AWS.Config();
    sysConfig.getCredentials(function(err) {
        if (err) {
            callback(err.stack);
            console.log('Unable to Obtain Credentials');
        } // credentials not loaded
        else{
            var tempCreds = sysConfig.credentials;
            if (tempCreds.metadata == undefined || tempCreds.metadata == null){
                var credentials = {"claim": tempCreds};
                callback(credentials);
            }
            else {
                sysCreds = {
                    SessionToken: tempCreds.metadata.Token,
                    AccessKeyId: tempCreds.metadata.AccessKeyId,
                    SecretKey: tempCreds.metadata.SecretAccessKey,
                    Expiration: tempCreds.metadata.Expiration,
                }
                var credentials = {"claim": sysCreds};
                callback(credentials);
            }

        }
    })

}
