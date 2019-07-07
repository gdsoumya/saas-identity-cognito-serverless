'use strict'

const tokenManager = require('/opt/nodejs/helper/token-manager.js');
const userHelper = require('/opt/nodejs/helper/user-helperNP.js');
const cognitoUsers = require('/opt/nodejs/helper/cognito-user.js');

exports.handler = (event, context) => {
    tokenManager.getCredentialsFromToken(event, function (credentials) {
        // get the tenant id from the request
        var tenantId = tokenManager.getTenantId(event);

        userHelper.lookupUserPoolData(credentials, event.queryStringParameters.id, tenantId, false, function(err, user) {
            if (err || user===undefined)
            context.succeed({
                statusCode:400,
                headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "POST"
            },
                body: JSON.stringify({error: "Error getting user attributes"})
            });
            else {
                cognitoUsers.getCognitoUser(credentials, user, function (err, user) {
                    if (err) {
                        context.succeed({
                            statusCode:400,
                            headers: {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Headers": "Content-Type",
                            "Access-Control-Allow-Methods": "POST"
                        },
                            body: JSON.stringify({error: "Error getting user with id : "+event.queryStringParameters.id})
                        });
                    }
                    else {
                        context.succeed({
                            statusCode:200,
                            headers: {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Headers": "Content-Type",
                            "Access-Control-Allow-Methods": "POST"
                        },
                            body: JSON.stringify(user)
                        });
                    }
                })
            }
        });
    });
};