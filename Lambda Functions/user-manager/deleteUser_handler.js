'use strict'

const configuration = require('/opt/nodejs/helper/config/config.json');
const tokenManager = require('/opt/nodejs/helper/token-manager.js');
const userHelper = require('/opt/nodejs/helper/user-helperNP.js');
const cognitoUsers = require('/opt/nodejs/helper/cognito-user.js');
const DynamoDBHelper = require('/opt/nodejs/helper/dynamodb-helper.js');

var userSchema = {
    TableName : configuration.table.user,
    KeySchema: [
        { AttributeName: "tenant_id", KeyType: "HASH"},  //Partition key
        { AttributeName: "id", KeyType: "RANGE" }  //Sort key
    ],
    AttributeDefinitions: [
        { AttributeName: "tenant_id", AttributeType: "S" },
        { AttributeName: "id", AttributeType: "S" }
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10
    },
    GlobalSecondaryIndexes: [
        {
            IndexName: 'UserNameIndex',
            KeySchema: [
                { AttributeName: "id", KeyType: "HASH"}
            ],
            Projection: {
                ProjectionType: 'ALL'
            },
            ProvisionedThroughput: {
                ReadCapacityUnits: 10,
                WriteCapacityUnits: 10
            }
        }
    ]
};

exports.handler = (event, context) => {
    var userName = event.queryStringParameters.id;
    tokenManager.getCredentialsFromToken(event, function (credentials) {
        console.log('Deleting user: ' + userName);

        // get the tenant id from the request
        var tenantId = tokenManager.getTenantId(event);
        // see if the user exists in the system
        userHelper.lookupUserPoolData(credentials, userName, tenantId, false, function (err, userPoolData) {
            var userPool = userPoolData;
            // if the user pool found, proceed
            if (err || userPool=== undefined) {
                context.succeed({
                    statusCode:400,
                    headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "POST"
                },
                    body: JSON.stringify({error: "User does not exist"})
                });
            }
            else {
                console.log(userPoolData)
                // first delete the user from Cognito
                cognitoUsers.deleteUser(credentials, userName, userPool.UserPoolId, configuration.aws_region)
                    .then(function (result) {
                        console.log('User ' + userName + ' deleted from Cognito');

                        // now delete the user from the user data base
                        var deleteUserParams = {
                            TableName: userSchema.TableName,
                            Key: {
                                id: userName,
                                tenant_id: tenantId
                            }
                        };

                        // construct the helper object
                        var dynamoHelper = new DynamoDBHelper(userSchema, credentials, configuration);

                        // delete the user from DynamoDB
                        dynamoHelper.deleteItem(deleteUserParams, credentials, function (err, user) {
                            if (err) {
                                console.log('Error deleting DynamoDB user: ' + err.message);
                                context.succeed({
                                    statusCode:400,
                                    headers: {
                                    "Access-Control-Allow-Origin": "*",
                                    "Access-Control-Allow-Headers": "Content-Type",
                                    "Access-Control-Allow-Methods": "POST"
                                },
                                    body: JSON.stringify({error: "Error deleting DynamoDB user"})
                            });
                            }
                            else {
                                console.log('User ' + userName + ' deleted from DynamoDB');
                                context.succeed({
                                    statusCode:400,
                                    headers: {
                                    "Access-Control-Allow-Origin": "*",
                                    "Access-Control-Allow-Headers": "Content-Type",
                                    "Access-Control-Allow-Methods": "POST"
                                },
                                    body: JSON.stringify({status: 'success'})
                            });
                            }
                        })
                    })
                    .catch(function (error) {
                        console.log('Error deleting Cognito user: ' + err);
                        context.succeed({
                            statusCode:400,
                            headers: {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Headers": "Content-Type",
                            "Access-Control-Allow-Methods": "POST"
                        },
                            body: JSON.stringify({error: "Error deleting user"})
                    });
                    });
            }
        });
    });
};