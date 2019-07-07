'use strict';

//AWS Dependencies for Cognito and AWS SDK
global.fetch = require('node-fetch');
const AWS = require('aws-sdk');
const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const CognitoUserPool = AmazonCognitoIdentity.CognitoUserPool;

//Include Custom Modules
const tokenManager = require('/opt/nodejs/helper/token-manager.js');


// process login request
exports.handler = (event, context) => {
    var user = JSON.parse(event.body);
    console.log(user.userName);
    tokenManager.getUserPool(user.userName, function (error, userPoolLookup) {
        if (!error) {
            // get the pool data from the response
            var poolData = {
                UserPoolId: userPoolLookup.userPoolId,
                ClientId: userPoolLookup.client_id
            };
            console.log("Here");
            // construct a user pool object
            var userPool = new CognitoUserPool(poolData);
            // configure the authentication credentials
            var authenticationData = {
                Username: user.userName,
                Password: user.password
            };
            // create object with user/pool combined
            var userData = {
                Username: user.userName,
                Pool: userPool
            };
            // init Cognito auth details with auth data
            var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
            // authenticate user to in Cognito user pool
            var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

            cognitoUser.authenticateUser(authenticationDetails, {
                onSuccess: function (result) {
                    // get the ID token
                    var idToken = result.getIdToken().getJwtToken();
                    var AccessToken = result.getAccessToken().getJwtToken();
                    context.succeed({
                        statusCode:200,
                        headers: {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Headers": "Content-Type",
                            "Access-Control-Allow-Methods": "POST"
                        },
                        body: JSON.stringify({token: idToken, access: AccessToken})
                    });
                },
                onFailure: function(err) {
                    context.succeed({
                        statusCode:400,
                        headers: {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Headers": "Content-Type",
                            "Access-Control-Allow-Methods": "POST"
                        },
                        body: JSON.stringify(err)
                    });
                },
                mfaRequired: function(codeDeliveryDetails) {
                    // MFA is required to complete user authentication.
                    // Get the code from user and call

                    //MFA is Disabled for this QuickStart. This may be submitted as an enhancement, if their are sufficient requests.
                    var mfaCode = '';

                    if (user.mfaCode == undefined){
                        context.succeed({
                            statusCode:200,
                            headers: {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Headers": "Content-Type",
                            "Access-Control-Allow-Methods": "POST"
                        },
                            body: JSON.stringify({mfaRequired: true})
                        });
                    }
                    cognitoUser.sendMFACode(mfaCode, this)

                },
                newPasswordRequired: function(userAttributes, requiredAttributes) {
                    // User was signed up by an admin and must provide new
                    // password and required attributes, if any, to complete
                    // authentication.
                    if (user.newPassword == undefined){
                        context.succeed({
                            statusCode:200,
                            headers: {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Headers": "Content-Type",
                            "Access-Control-Allow-Methods": "POST"
                        },
                            body: JSON.stringify({newPasswordRequired: true})
                        });
                    }
                    // These attributes are not mutable and should be removed from map.
                    delete userAttributes.email_verified;
                    delete userAttributes['custom:tenant_id'];
                    cognitoUser.completeNewPasswordChallenge(user.newPassword, userAttributes, this);
                }
            });
        }
        else {
            console.log("Error Authenticating User: ", error);
            context.succeed({
                statusCode:400,
                headers: {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Headers": "Content-Type",
                            "Access-Control-Allow-Methods": "POST"
                        },
                body: "Error Authenticating User"
            });
        }
    });
};
