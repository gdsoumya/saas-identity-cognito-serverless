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
    console.log('Deleting Order: ' + event.queryStringParameters.id);

    tokenManager.getCredentialsFromToken(event, function(credentials) {
        // init parameter structure
        var deleteOrderParams = {
            TableName : orderSchema.TableName,
            Key: {
                tenantId: tenantId,
                orderId: event.queryStringParameters.id
            }
        };

        // construct the helper object
        var dynamoHelper = new DynamoDBHelper(orderSchema, credentials, configuration);

        dynamoHelper.deleteItem(deleteOrderParams, credentials, function (err, order) {
            if (err) {
                console.log('Error deleting product: ' + err.message);
                context.succeed({
                    statusCode:400,
                    headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "POST"
                },
                    body: JSON.stringify({error: "Error deleting order"})
            });
            }
            else {
                console.log('Product ' + event.queryStringParameters.id + ' deleted');
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
}