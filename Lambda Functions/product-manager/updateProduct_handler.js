'use strict'

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
    var product = JSON.parse(event.body);
    console.log('Updating product: ' + product.productId);
    tokenManager.getCredentialsFromToken(event, function(credentials) {
        // init the params from the request data
        var keyParams = {
            tenantId: tenantId,
            productId: product.productId
        }

        console.log('Updating product: ' + product.productId);

        var productUpdateParams = {
            TableName: productSchema.TableName,
            Key: keyParams,
            UpdateExpression: "set " +
                "sku=:sku, " +
                "title=:title, " +
                "description=:description, " +
                "#condition=:condition, " +
                "conditionDescription=:conditionDescription, " +
                "numberInStock=:numberInStock, " +
                "unitCost=:unitCost",
            ExpressionAttributeNames: {
                '#condition' : 'condition'
            },
            ExpressionAttributeValues: {
                ":sku": product.sku,
                ":title": product.title,
                ":description": product.description,
                ":condition":product.condition,
                ":conditionDescription":product.conditionDescription,
                ":numberInStock":product.numberInStock,
                ":unitCost":product.unitCost
            },
            ReturnValues:"UPDATED_NEW"
        };

        // construct the helper object
        var dynamoHelper = new DynamoDBHelper(productSchema, credentials, configuration);

        dynamoHelper.updateItem(productUpdateParams, credentials, function (err, product) {
            if (err) {
                console.log('Error updating product: ' + err.message);
                context.succeed({
                    statusCode:400,
                    headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "POST"
                },
                    body: JSON.stringify({error: "Error updating product"})
            });
            }
            else {
                console.log('Product ' + product.title + ' updated');
                context.succeed({
                    statusCode:200,
                    headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "POST"
                },
                    body: JSON.stringify(product)
            });
            }
        });
    });
};