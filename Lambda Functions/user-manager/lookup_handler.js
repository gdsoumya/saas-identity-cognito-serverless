'use strict';

// Declare dependencies
// const AWS = require('aws-sdk');
// const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
// const request = require('request');
// const async = require('async');

// Configure Environment
// const configModule = require('/opt/nodejs/helper/config/config.json');

// Declare shared modules
const tokenManager = require('/opt/nodejs/helper/token-manager.js');
// const DynamoDBHelper = require('/opt/nodejs/helper/dynamodb-helper.js');
const userHelper = require('/opt/nodejs/helper/user-helperNP.js');

/**
 * Lookup user pool for any user - no user data returned
 */
exports.handler = (event, context) => {
    var body =  JSON.parse(event.body);
    tokenManager.getSystemCredentials(function (credentials) {
        userHelper.lookupUserPoolData(credentials,body.id, null, true, function (err, user) {
            if (err || user===undefined) {
                context.succeed({
                    statusCode:400,
                    body: JSON.stringify({error: "Error getting user"})
                });
            }
            else {
                if (user.length == 0)
                    context.succeed({
                        statusCode:400,
                        body: JSON.stringify({error: "User not found"})
                    });
                else
                context.succeed({
                    statusCode:200,
                    body: JSON.stringify(user)
                });
            }
        });
    });
};