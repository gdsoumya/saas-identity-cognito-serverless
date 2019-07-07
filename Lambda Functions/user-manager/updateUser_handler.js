'use strict'

const configuration = require('/opt/nodejs/helper/config/config.json');
const tokenManager = require('/opt/nodejs/helper/token-manager.js');
const userHelper = require('/opt/nodejs/helper/user-helperNP.js');
const cognitoUsers = require('/opt/nodejs/helper/cognito-user.js');

exports.handler = (event, context) => {
    var user = JSON.parse(event.body);
    tokenManager.getCredentialsFromToken(event, function(credentials) {
        // get the user pool id from the request
        var userPoolId = userHelper.getUserPoolIdFromRequest(event);

        // update user data
        cognitoUsers.updateUser(credentials, user, userPoolId, configuration.aws_region)
            .then(function(updatedUser) {
                context.succeed({
                    statusCode:200,
                    headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "POST"
                },
                    body: JSON.stringify(updatedUser)
                });
            })
            .catch(function(error) {
                context.succeed({
                    statusCode:400,
                    headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "POST"
                },
                    body: JSON.stringify({error: error.message})
                });
            });
    });
};