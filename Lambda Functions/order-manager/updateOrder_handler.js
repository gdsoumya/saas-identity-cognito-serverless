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
    var order = JSON.parse(event.body);
    tokenManager.getCredentialsFromToken(event, function(credentials) {
        // init the params from the request data
        var keyParams = {
            tenantId: tenantId,
            orderId: order.orderId
        }

        console.log('Updating Order Id: ' + order.orderId);

        var orderUpdateParams = {
            TableName: orderSchema.TableName,
            Key: keyParams,
            UpdateExpression: "set " +
                "productId=:productId, " +
                "productSKU=:productSKU, " +
                "productDescription=:productDescription, " +
                "dateOrdered=:dateOrdered, " +
                "orderedBy=:orderedBy, " +
                "quantity=:quantity, " +
                "unitCost=:unitCost",
            ExpressionAttributeValues: {
                ":productId": order.productId,
                ":productSKU": order.productSKU,
                ":productDescription": order.productDescription,
                ":dateOrdered":order.dateOrdered,
                ":orderedBy":order.orderedBy,
                ":quantity":order.quantity,
                ":unitCost":order.unitCost
            },
            ReturnValues:"UPDATED_NEW"
        };

        // construct the helper object
        var dynamoHelper = new DynamoDBHelper(orderSchema, credentials, configuration);

        dynamoHelper.updateItem(orderUpdateParams, credentials, function (err, order) {
            if (err) {
                console.log('Error updating order: ' + err.message);
                context.succeed({
                    statusCode:400,
                    headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "POST"
                },
                    body: JSON.stringify({error: "Error updating order"})
            });
            }
            else {
                console.log('Order ' + order.title + ' updated');
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