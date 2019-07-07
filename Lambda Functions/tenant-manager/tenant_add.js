'use strict';

//Configure AWS SDK
const AWS = require('aws-sdk');
//Configure Environment
var configuration = require('/opt/nodejs/helper/config/config.json');
//Include Custom Modules
const tokenManager = require('/opt/nodejs/helper/token-manager.js');
const DynamoDBHelper = require('/opt/nodejs/helper/dynamodb-helper.js');

// Configure AWS Region
AWS.config.update({region: configuration.aws_region});

// Create a schema
var tenantSchema = {
    TableName : configuration.table.tenant,
    KeySchema: [
        { AttributeName: "id", KeyType: "HASH"}  //Partition key
    ],
    AttributeDefinitions: [
        { AttributeName: "id", AttributeType: "S" }
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10
    }
};

// Add tenant to DB
exports.handler = (event, context) => {
    var credentials = {};
    tokenManager.getSystemCredentials(function (systemCredentials) {
        credentials = systemCredentials;
        var tenant = JSON.parse(event.body);
        console.log('Creating Tenant: ' + tenant);

        // construct the helper object
        var dynamoHelper = new DynamoDBHelper(tenantSchema, credentials, configuration);

        dynamoHelper.putItem(tenant, credentials, function (err, tenant) {
            if (err) {
                console.log('Error creating new tenant: ' + err.message);
                context.succeed({
                    statusCode:400,
                    body: JSON.stringify({Error : "Error creating tenant"})
                });
            }
            else {
                console.log('Tenant ' + tenant.id + ' created');
                context.succeed({
                    statusCode:200,
                    body: JSON.stringify({status: 'success'})
                });
            }
        });
    });
};