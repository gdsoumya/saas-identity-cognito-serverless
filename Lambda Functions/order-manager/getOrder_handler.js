'use strict'

const configuration = require('/opt/nodejs/helper/config/config.json');
const tokenManager = require('/opt/nodejs/helper/token-manager.js');
const DynamoDBHelper = require('/opt/nodejs/helper/dynamodb-helper.js');

var orderSchema = {
    TableName : configuration.table.order,
    KeySchema: [
        { AttributeName: "tenantId", KeyType: "HASH"},  //Partition key
        { AttributeName: "orderId", KeyType: "RANGE" }  //Sort key
    ],
    AttributeDefinitions: [
        { AttributeName: "tenantId", AttributeType: "S" },
        { AttributeName: "orderId", AttributeType: "S" }
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10
    }
};

exports.handler = (event, context) => {
    var tenantId = tokenManager.getTenantId(event);
    console.log('Fetching order: ' + event.queryStringParameters.id);

    tokenManager.getCredentialsFromToken(event, function(credentials) {
        // init params structure with request params
        var params = {
            tenantId: tenantId,
            orderId: event.queryStringParameters.id
        }

        // construct the helper object
        var dynamoHelper = new DynamoDBHelper(orderSchema, credentials, configuration);

        dynamoHelper.getItem(params, credentials, function (err, order) {
            if (err) {
                console.log('Error getting order: ' + err.message);
                context.succeed({
                    statusCode:400,
                    headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "POST"
                },
                    body: JSON.stringify({error: "Error getting order"})
            });
            }
            else {
                console.log('Order ' + event.queryStringParameters.id + ' retrieved');
                context.succeed({
                    statusCode:400,
                    headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "POST"
                },
                    body: JSON.stringify(order)
            });
            }
        });
    });
};