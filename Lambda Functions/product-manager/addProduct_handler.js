'use strict';
const uuidV4 = require('uuid/v4');

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
    tokenManager.getCredentialsFromToken(event, function(credentials) {
        var product = JSON.parse(event.body);
        product.productId = uuidV4();
        product.tenantId = tenantId;

        // construct the helper object
        var dynamoHelper = new DynamoDBHelper(productSchema, credentials, configuration);

        dynamoHelper.putItem(product, credentials, function (err, product) {
            if (err) {
                console.log('Error creating new product: ' + err.message);
                context.succeed({
                    statusCode:400,
                    headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "POST"
                },
                    body: JSON.stringify({error:"Error creating product"})
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
                    body: JSON.stringify({status: 'success'})
            });
            }
        });
    });
};