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
    console.log('Fetching Orders for Tenant Id: ' + tenantId);
    tokenManager.getCredentialsFromToken(event, function(credentials) {
        var searchParams = {
            TableName: orderSchema.TableName,
            KeyConditionExpression: "tenantId = :tenantId",
            ExpressionAttributeValues: {
                ":tenantId": tenantId
            }
        };

        // construct the helper object
        var dynamoHelper = new DynamoDBHelper(orderSchema, credentials, configuration);

        dynamoHelper.query(searchParams, credentials, function (error, orders) {
            if (error) {
                console.log('Error retrieving orders: ' + error.message);
                context.succeed({
                    statusCode:400,
                    headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "POST"
                },
                    body: JSON.stringify({error: "Error retrieving orders"})
            });
            }
            else {
                console.log('Orders successfully retrieved');
                context.succeed({
                    statusCode:400,
                    headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "POST"
                },
                    body: JSON.stringify(orders)
            });
            }

        });
    });
}