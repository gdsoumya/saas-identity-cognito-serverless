'use strict';

// Declare dependencies
// const AWS = require('aws-sdk');
// const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
// const request = require('request');
// const async = require('async');

// Configure Environment
// const configModule = require('/opt/nodejs/helper/config/config.js');

// Declare shared modules
const tokenManager = require('/opt/nodejs/helper/token-manager.js');
// const DynamoDBHelper = require('/opt/nodejs/helper/dynamodb-helper.js');
const userHelper = require('/opt/nodejs/helper/user-helperNP.js');

/**
 * Create a new user
 */
exports.handler = (event, context) => {
    tokenManager.getCredentialsFromToken(event, function (credentials) {
        var user = JSON.parse(event.body);
        console.log('Creating user: ' + user.userName);

        // extract requesting user and role from the token
        var authToken = tokenManager.getRequestAuthToken(event);
        var decodedToken = tokenManager.decodeToken(authToken);
        var requestingUser = decodedToken.email;
        user.tier = decodedToken['custom:tier'];
        user.tenant_id = decodedToken['custom:tenant_id'];

        // get the user pool data using the requesting user
        // all users added in the context of this user
        userHelper.lookupUserPoolData(credentials, requestingUser, user.tenant_id, false, function(err, userPoolData) {
            // if the user pool found, proceed
            if (!err || userPoolData!==undefined) {
                userHelper.createNewUser(credentials, userPoolData.UserPoolId, userPoolData.IdentityPoolId, userPoolData.client_id, user.tenant_id, user)
                    .then(function(createdUser) {
                        console.log('User ' + user.userName + ' created');
                        context.succeed({
                            statusCode:200,
                            headers: {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Headers": "Content-Type",
                            "Access-Control-Allow-Methods": "POST"
                        },
                            body: JSON.stringify({status: 'success'})
                        });
                    })
                    .catch(function(err) {
                        console.log('Error creating new user in DynamoDB: ' + err.message);
                        context.succeed({
                            statusCode:400,
                            headers: {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Headers": "Content-Type",
                            "Access-Control-Allow-Methods": "POST"
                        },
                            body: JSON.stringify({Error : "Error creating user in DynamoDB"})
                        });
                    });
            }
            else {
                context.succeed({
                    statusCode:400,
                    headers: {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Headers": "Content-Type",
                            "Access-Control-Allow-Methods": "POST"
                        },
                    body: JSON.stringify({Error : "User pool not found"})
                });
            }
        });
    });
};