'use strict'

const userHelper = require('/opt/nodejs/helper/user-helperNP.js');

exports.handler = (event, context) => {
    if(event.queryStringParameters.state.toLowerCase()==='enable')
        userHelper.updateUserEnabledStatus(event, true, function(err, result) {
            if (err)
            context.succeed({
                statusCode:400,
                headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "PUT"
            },
                body: JSON.stringify({error: "Error Enabling User"})
            });
            else
            context.succeed({
                statusCode:200,
                headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "PUT"
            },
                body: JSON.stringify(result)
            });
        });
    else if(event.queryStringParameters.state.toLowerCase()==='disable')
        userHelper.updateUserEnabledStatus(event, false, function(err, result) {
            if (err)
            context.succeed({
                statusCode:400,
                headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "PUT"
            },
                body: JSON.stringify({error: "Error Disabling User"})
            });
            else
            context.succeed({
                statusCode:200,
                headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "PUT"
            },
                body: JSON.stringify(result)
            });
        });
    else
        context.succeed({
            statusCode:200,
            headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "PUT"
        },
            body: JSON.stringify({error: "Invalid Request"})
        }); 
};