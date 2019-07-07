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
    console.log('Fetching Products for Tenant Id: ' + tenantId);
    tokenManager.getCredentialsFromToken(event, function(credentials) {
        var searchParams = {
            TableName: productSchema.TableName,
            KeyConditionExpression: "tenantId = :tenantId",
            ExpressionAttributeValues: {
                ":tenantId": tenantId
            }
        };

        // construct the helper object
        var dynamoHelper = new DynamoDBHelper(productSchema, credentials, configuration);

        dynamoHelper.query(searchParams, credentials, function (error, products) {
            if (error) {
                console.log('Error retrieving products: ' + error.message);
                context.succeed({
                    statusCode:400,
                    headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "GET"
                },
                    body: JSON.stringify({error:"Error retrieving products"})
            });
            }
            else {
                console.log('Products successfully retrieved');
                context.succeed({
                    statusCode:200,
                    headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "GET"
                },
                    body: JSON.stringify(products)
            });
            }

        });
    });
};