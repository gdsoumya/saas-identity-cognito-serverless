'use strict';

// Declare dependencies
// const AWS = require('aws-sdk');
// const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
// // Configure Environment
const configuration = require('./config/config.json');

// Declare shared modules
const tokenManager = require('./token-manager.js');
const DynamoDBHelper = require('./dynamodb-helper.js');
const cognitoUsers = require('./cognito-user.js');

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

/**
 * Provision an admin user and the associated policies/roles
 * @param user The user being created
 * @param credentials Credentials to use for provisioning
 * @param adminPolicyName The name of of the admin policy to provisioned
 * @param userPolicyName The name of the user policy to be provisioned
 * @param callback Returns an object with the results of the provisioned items
 */
module.exports.provisionAdminUserWithRoles = function(user, credentials, adminPolicyName, userPolicyName, callback) {
    // vars that are used across multiple calls
    var createdUserPoolData = {};
    var trustPolicyTemplate = {};
    var createdTrustPolicyRole = {};
    var createdUserPoolClient = {};
    var createdIdentityPool = {};
    var createdAdminPolicy = {};
    var createdAdminRole = {};
    var createdUserPolicy = {};
    var createdUserRole = {};

    // setup params for template generation
    var policyCreationParams = {
        tenantId: user.tenant_id,
        accountId: configuration.aws_account,
        region: configuration.aws_region,
        tenantTableName: configuration.table.tenant,
        userTableName: configuration.table.user,
    };

    // init role based on admin policy name
    user.role = adminPolicyName;

    // see if this user is already in the system
    lookupUserPoolData(credentials, user.userName, user.tenant_id, true, function(err, userPoolData) {
        if (!err && userPoolData!==undefined){
            callback( new Error ('{"Error" : "User already exists"}'));
            console.log('{"Error" : "User already exists"}');
        }
        else {
            // create the new user
            cognitoUsers.createUserPool(user.tenant_id)
                .then(function (poolData) {
                    createdUserPoolData = poolData;

                    var clientConfigParams = {
                        "ClientName": createdUserPoolData.UserPool.Name,
                        "UserPoolId": createdUserPoolData.UserPool.Id
                    };

                    // add the user pool to the policy template configuration (couldn't add until here)
                    policyCreationParams.userPoolId = createdUserPoolData.UserPool.Id;

                    // crete the user pool for the new tenant
                    return cognitoUsers.createUserPoolClient(clientConfigParams);
                })
                .then(function(userPoolClientData) {
                    createdUserPoolClient = userPoolClientData;
                    var identityPoolConfigParams = {
                        "ClientId": userPoolClientData.UserPoolClient.ClientId,
                        "UserPoolId": userPoolClientData.UserPoolClient.UserPoolId,
                        "Name": userPoolClientData.UserPoolClient.ClientName
                    };
                    return cognitoUsers.createIdentityPool(identityPoolConfigParams);
                })
                .then(function (identityPoolData) {
                    createdIdentityPool = identityPoolData;
                    return createNewUser(credentials, createdUserPoolData.UserPool.Id, createdIdentityPool.IdentityPoolId, createdUserPoolClient.UserPoolClient.ClientId, user.tenant_id, user);
                })
                .then(function(identityRole) {
                    var returnObject = {
                        "pool": createdUserPoolData,
                        "userPoolClient": createdUserPoolClient,
                        "identityPool": createdIdentityPool,
                    };
                    callback(null, returnObject)
                })
                .catch (function(err) {
                    console.log(err)
                    callback(err);
                });
        }
    });
}

/**
 * Create a new user using the supplied credentials/user
 * @param credentials The creds used for the user creation
 * @param userPoolId The user pool where the user will be added
 * @param identityPoolId the identityPoolId
 * @param clientId The client identifier
 * @param tenantId The tenant identifier
 * @param newUser The data fro the user being created
 * @param callback Callback with results for created user
 */
var createNewUser= function(credentials, userPoolId, identityPoolId, clientId, tenantId, newUser) {
    var promise = new Promise(function(resolve, reject) {
        // fill in system attributes for user (not passed in POST)
        newUser.userPoolId = userPoolId;
        newUser.tenant_id = tenantId;
        newUser.email = newUser.userName;
		newUser.fb_api = "adafaf"
		newUser.google_api = "adafaf"
        // cerate the user in Cognito
        cognitoUsers.createUser(credentials, newUser, function (err, cognitoUser) {
            if (err)
                reject(err);
            else {
                // populate the user to store in DynamoDB
                newUser.id = newUser.userName;
                newUser.UserPoolId = userPoolId;
                newUser.IdentityPoolId = identityPoolId;
                newUser.client_id = clientId;
                newUser.tenant_id = tenantId;
                newUser.sub = cognitoUser.User.Attributes[0].Value;

                // construct the helper object
                var dynamoHelper = new DynamoDBHelper(userSchema, credentials, configuration);

                dynamoHelper.putItem(newUser, credentials, function (err, createdUser) {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(null, createdUser)
                    }
                });
            }
        });
    });

    return promise;
}

/**
 * Enable/disable a user
 * @param req The request with the user information
 * @param enable True if enabling, False if disabling
 * @param callback Return results of applying enable/disable
 */
/**
 * Enable/disable a user
 * @param req The request with the user information
 * @param enable True if enabling, False if disabling
 * @param callback Return results of applying enable/disable
 */
module.exports.updateUserEnabledStatus= function(req, enable, callback) {
    var user = JSON.parse(req.body);

    tokenManager.getCredentialsFromToken(req, function(credentials) {
        // get the tenant id from the request
        var tenantId = tokenManager.getTenantId(req);

        // Get additional user data required for enabled/disable
        lookupUserPoolData(credentials, user.userName, tenantId, false, function(err, userPoolData) {
            var userPool = userPoolData;

            // if the user pool found, proceed
            if (err || userPoolData===undefined) {
                callback("User Not found");
            }
            else {
                // update the user enabled status
                cognitoUsers.updateUserEnabledStatus(credentials, userPool.UserPoolId, user.userName, enable)
                    .then(function() {
                        callback(null, {status: 'success'});
                    })
                    .catch(function(err) {
                        callback(err);
                    });
            }
        });
    });
}

/**
 * Lookup a user's pool data in the user table
 * @param credentials The credentials used ben looking up the user
 * @param userId The id of the user being looked up
 * @param tenantId The id of the tenant (if this is not system context)
 * @param isSystemContext Is this being called in the context of a system user (registration, system user provisioning)
 * @param callback The results of the lookup
 */
var lookupUserPoolData= function(credentials, userId, tenantId, isSystemContext, callback) {

    // construct the helper object
    var dynamoHelper = new DynamoDBHelper(userSchema, credentials, configuration);

    // if we're looking this up in a system context, query the GSI with user name only
    if (isSystemContext) {

        // init params structure with request params
        var searchParams = {
            TableName: userSchema.TableName,
            IndexName: userSchema.GlobalSecondaryIndexes[0].IndexName,
            KeyConditionExpression: "id = :id",
            ExpressionAttributeValues: {
                ":id": userId
            }
        };

        // get the item from the database
        dynamoHelper.query(searchParams, credentials, function (err, users) {
            if (err) {
                console.log('Error getting user: ' + err.message);
                callback(err);
            }
            else {
                if (users.length == 0) {
                    var err = new Error('No user found: ' + userId);
                    callback(err);
                }
                else
                    callback(null, users[0]);
            }
        });
    }
    else {
        // if this is a tenant context, then we must get with tenant id scope
        var searchParams = {
            id: userId,
            tenant_id: tenantId
        }

        // get the item from the database
        dynamoHelper.getItem(searchParams, credentials, function (err, user) {
            if (err) {
                console.log('Error getting user: ' + err.message);
                callback(err);
            }
            else {
                callback(null, user);
            }
        });
    }
}
/**
 * Extract a token from the header and return its embedded user pool id
 * @param req The request with the token
 * @returns The user pool id from the token
 */
module.exports.getUserPoolIdFromRequest= function(req) {
    var token = req.headers.Authorization;
    var userPoolId;
    var decodedToken = tokenManager.decodeToken(token);
    if (decodedToken) {
        var pool = decodedToken.iss;
        userPoolId = pool.substring(pool.lastIndexOf("/") + 1);
    }
    return userPoolId;
};

module.exports.lookupUserPoolData = lookupUserPoolData;
module.exports.createNewUser = createNewUser;