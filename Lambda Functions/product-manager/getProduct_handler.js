'use strict';

const configuration = require('/opt/nodejs/helper/config/config.json');
const tokenManager = require('/opt/nodejs/helper/token-manager.js');
const DynamoDBHelper = require('/opt/nodejs/helper/dynamodb-helper.js');


var productSchema = {
    TableName : configuration.table.product,
    KeySchema: [
        { AttributeName: "tenantId", KeyType: "HASH"},  //Partition key
        { AttributeName: "productId", KeyType: "RANGE" }  //Sort key
    ],
    AttributeDefinitions: [
        { AttributeName: "tenantId", AttributeType: "S" },
        { AttributeName: "productId", AttributeType: "S" }
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10
    }
};

exports.handler = (event, context) => {
    var tenantId = tokenManager.getTenantId(event);
    console.log('Fetching product: ' + event.queryStringParameters.id);
    tokenManager.getCredentialsFromToken(event, function(credentials) {
        // init params structure with request params
        var params = {
            tenantId: tenantId,
            productId: event.queryStringParameters.id
        }

        // construct the helper object
        var dynamoHelper = new DynamoDBHelper(productSchema, credentials, configuration);

        dynamoHelper.getItem(params, credentials, function (err, product) {
            if (err) {
                console.log('Error getting product: ' + err.message);
                context.succeed({
                    statusCode:400,
                    headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "GET"
                },
                    body: JSON.stringify({error: "Error getting product"})
            });
            }
            else {
                console.log('Product ' + event.queryStringParameters.id + ' retrieved');
                context.succeed({
                    statusCode:200,
                    headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "GET"
                },
                    body: JSON.stringify(product)
            });
            }
        });
    });
};
