'use strict';

// Declare dependencies
// const AWS = require('aws-sdk');
// const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
// const request = require('request');
// const async = require('async');

// Configure Environment
const configuration = require('/opt/nodejs/helper/config/config.json');

// Declare shared modules
const tokenManager = require('/opt/nodejs/helper/token-manager.js');
const DynamoDBHelper = require('/opt/nodejs/helper/dynamodb-helper.js');
const userHelper = require('/opt/nodejs/helper/user-helperNP.js');
const cognitoUsers = require('/opt/nodejs/helper/cognito-user.js');

/**
 * Provision a new tenant admin user
 */
exports.handler = (event, context) => {
    var user = JSON.parse(event.body);

    // get the credentials for the system user
    var credentials = {};
    tokenManager.getSystemCredentials(function (systemCredentials) {
        credentials = systemCredentials;
        // provision the tenant admin and roles
        userHelper.provisionAdminUserWithRoles(user, credentials, configuration.userRole.tenantAdmin, configuration.userRole.tenantUser,
            function(err, result) {
                if (err)
                {
                    context.succeed({
                        statusCode:400,
                        body:JSON.stringify({"Error": "Error Creating Tenant Admin"})
                    });
                }
                else
                context.succeed({
                    statusCode:200,
                    body: JSON.stringify(result)
                });
            });
    });
};