'use strict';

// Declare library dependencies
const uuidV4 = require('uuid/v4');
const AWS = require('aws-sdk');
// //Configure Environment
const configuration = require('/opt/nodejs/helper/config/config.json');

AWS.config.region = configuration.aws_region;
var lambda = new AWS.Lambda();
/**
 * Register a new tenant
 */
exports.handler = (event, context) => {
    var tenant = JSON.parse(event.body);
    tenant.id = 'TENANT' + uuidV4();
    // Generate the tenant id
    tenant.id = 'TENANT' + uuidV4();
    console.log('Creating Tenant ID: ' + tenant.id);
    tenant.id = tenant.id.split('-').join('');
    // if the tenant doesn't exist, create one
    tenantExists(tenant, function(tenantExists) {
        if (tenantExists) {
            console.log("Error registering new tenant");
            context.succeed({
                statusCode:400,
                headers: {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Headers": "Content-Type",
                            "Access-Control-Allow-Methods": "POST"
                        },
                body: JSON.stringify({"error":"Error registering new tenant"})
            });
        }
        else {
            registerTenantAdmin(tenant)
                .then(function (tenData) {
                    //tenData = JSON.stringify(tenData)
                    //Adding Data to the Tenant Object that will be required to cleaning up all created resources for all tenants.
                    tenant.UserPoolId = tenData.pool.UserPool.Id;
                    tenant.IdentityPoolId = tenData.identityPool.IdentityPoolId;
                    // context.succeed({
                    //     statusCode:200,
                    //     body: JSON.stringify({"resp":tenData})
                    // });
                })
                .then(function () {
                    saveTenantData(tenant).then(function() {
                        console.log("Tenant registered: " + tenant.id);
                        context.succeed({
                            statusCode:200,
                            headers: {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Headers": "Content-Type",
                            "Access-Control-Allow-Methods": "POST"
                        },
                            body: JSON.stringify({resp:"Tenant " + tenant.id + " registered"})
                        });
                    });
                })
                .catch(function (err) {
                    console.log("Error registering new tenant: " + err);
                    context.succeed({
                        statusCode:400,
                        headers: {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Headers": "Content-Type",
                            "Access-Control-Allow-Methods": "POST"
                        },
                        body: JSON.stringify({error:"Error registering tenant: " + err})
                    });
                });
        }
    });
};

/**
 * Determine if a tenant can be created (they may already exist)
 * @param tenant The tenant data
 * @returns True if the tenant exists
 */
function tenantExists(tenant, callback) {
    var body = JSON.stringify({id : tenant.username});
    var params = {
        FunctionName: 'lookup_handler', // the lambda function we are going to invoke
        InvocationType: 'RequestResponse',
        LogType: 'Tail',
        Payload: JSON.stringify({body: body})
    };
    //callback(true);
    lambda.invoke(params, function(error, response) {
        //callback(response.Payload)
        console.log(response.Payload)
        var res = JSON.parse(response.Payload);
        var body = JSON.parse(res.body);
        if (error)
            callback(false);
        else if ((res != null) && (res.statusCode == 400))
            callback(false);
        else {
            if (body.userName === tenant.userName)
                callback(true);
            else
                callback(false);
        }
    });
}

/**
 * Register a new tenant user and provision policies for that user
 * @param tenant The new tenant data
 * @returns {Promise} Results of tenant provisioning
 */
function registerTenantAdmin(tenant) {
    var promise = new Promise(function(resolve, reject) {

        // init the request with tenant data
        var tenantAdminData = {
            "tenant_id": tenant.id,
            "companyName": tenant.companyName,
            "accountName": tenant.accountName,
            "ownerName": tenant.ownerName,
            "tier": tenant.tier,
            "email": tenant.email,
            "userName": tenant.userName,
            "role": tenant.role,
            "firstName": tenant.firstName,
            "lastName": tenant.lastName
        };

        var body = JSON.stringify(tenantAdminData);
        var params = {
            FunctionName: 'tenant_admin_handler', // the lambda function we are going to invoke
            InvocationType: 'RequestResponse',
            LogType: 'Tail',
            Payload: JSON.stringify({body: body})
        };
        lambda.invoke(params, function(error, response) {
            console.log(response.Payload)
            var res = JSON.parse(response.Payload);
            var body = JSON.parse(res.body);
            if (error || (res.statusCode != 200))
                reject(error);
            else {
                resolve(body);
            }
        });
    });
    return promise;
}

/**
 * Save the configration and status of the new tenant
 * @param tenant Data for the tenant to be created
 * @returns {Promise} The created tenant
 */
function saveTenantData(tenant) {
    var promise = new Promise(function(resolve, reject) {
        // init the tenant sace request
        var tenantRequestData = {
            "id": tenant.id,
            "companyName": tenant.companyName,
            "accountName": tenant.accountName,
            "ownerName": tenant.ownerName,
            "tier": tenant.tier,
            "email": tenant.email,
            "status": "Active",
            "UserPoolId": tenant.UserPoolId,
            "IdentityPoolId": tenant.IdentityPoolId,
            "userName": tenant.userName,
        };

        console.log(tenantRequestData);

        var body = JSON.stringify(tenantRequestData);
        var params = {
            FunctionName: 'tenant_add', // the lambda function we are going to invoke
            InvocationType: 'RequestResponse',
            LogType: 'Tail',
            Payload: JSON.stringify({body: body})
        };
        lambda.invoke(params, function(error, response) {
            console.log(response.Payload)
            var res = JSON.parse(response.Payload);
            var body = JSON.parse(res.body);
            console.log("save data",body);
            if (error || (res.statusCode != 200))
               { console.log("save data",body);
               reject(error);
               }
            else{
                console.log("save data",body);
                resolve(body);
                
            }
        });
    });

    return promise;
}