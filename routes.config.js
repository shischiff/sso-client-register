const { clientValidationRules, validate } = require('./lib/validator.js')
const send2multipleSSOs = require('./lib/multiple_sso')
const generator = require('generate-password');
// const { v4: uuidv4 } = require('uuid');

request = require('request');

let mode = process.env.MODE || "prod";
const config = require('./config/' + mode + '.env.config.js');

exports.routesConfig = function (app, logger) {
    app.get("/", function(req, res) {
                     res.render('index', { message: ' '});
                 });
    app.get("/new_client", function(req, res) {
                     res.render('index', { message: ' '});
                 });
    app.post("/new_client", clientValidationRules(), validate, (req, res) => {
        let uuid= req.id;
        const client = req.body;

        if (client.webForm) { //redirect uris received via web form are separated by new lines, this will convert it to an array of URIs
            logger.info('Received Webform: ', {"uuid": uuid} );
            client.redirectUris = client.redirectUris.split(",");
        } else{
            logger.info('Received API call: ', {"uuid": uuid} );
        }
        client.description={ //creating a JSON object from the contact details provided in the webform
        "contactName": client.contactName,
        "contactPhone": client.contactPhone
        };

        // Auto-generate a secret if the user left this field blank
        if (client.secret.length === 0){
            let secretLength =  config.secretLength || 12;
            client.secret = generator.generate({
                length: secretLength,
                numbers: true,
                uppercase: true,
                lowercase:true,
                excludeSimilarCharacters:true,
            });
        }

        let consentRequired = config.consentRequired || false;
        let body = {
            "clientId": client.id,
            "secret": client.secret,
            "redirectUris": client.redirectUris,
            "description": JSON.stringify(client.description),
            "consentRequired": consentRequired,
            "name": client.name
        };
        logger.info("Received body: ", {"uuid": uuid, "body": body});

        send2multipleSSOs.createClient(null, body, uuid, logger,function(error, ssoResponses) {
            /*  example ssoResponses: [{"name": "sso-1","code": 200,"msg": "client created successfully"},{"name": "sso-2","code": 400,"msg": "Bad Request"}]   */
            // process the respons(es) from RHSSO
            let responsesProcessed=0;
            let apiResponseCode=201;
            let resMessage = "";
            let errorCode =  "";
            if (error) {
                errorCode = "e1001";
                logger.error('error:' + error, {"uuid": uuid, "errorCode": errorCode});
                resMessage = "Something went wrong - server error " + errorCode;
                if (client.webForm) { // request origination is from a web form:
                        res.render('error', {message: resMessage});
                    } else {            //request origination is from a direct API call:
                        logger.info("api response: " + resMessage, {"uuid": uuid,"errorCode": errorCode});
                        res.status(apiResponseCode).json({
                            message: resMessage
                        });
                    }
            }
            else { // not error
                if (ssoResponses.map(x => x.code).every(code => code === 201)  ){ // *All* endpoints succeeded:
                    apiResponseCode = 201;
                    resMessage = "Client created successfully.|Take note of the following details:|ClientID = " + body.clientId + "|Secret = " + body.secret + "|redirect URIs: " + body.redirectUris+  "|These will only display once, copy these values and use them in your app";
                    if (client.webForm) { // request origination is from a web form:
                        logger.info("Web response: " + resMessage, {"uuid": uuid});
                        resMessage = resMessage.split('|').join('<br>');
                        res.render('response', {message: resMessage});
                    } else {            //request origination is from a direct API call:
                        logger.info("api response: " + resMessage, {"uuid": uuid});
                        res.status(apiResponseCode).json({
                            message: resMessage
                        });
                    }
                } else { // one or more response failed, then run cleanup:
                    logger.info("One or more endpoints failed to create the client " + body.clientId + ". Checking if clean up is required... ", {"uuid": uuid})
                    // Iterate over the responses and check, if succeeded use its token to delete it :
                    ssoResponses.forEach(function (ssoRes) {
                        if (ssoRes.code === 201) { //this client was created, clean it up:
                            logger.info("starting clean up of client: " + body.clientId + " on rhsso: " + ssoRes.name, {"uuid": uuid});
                            let token = 'bearer ' + ssoRes.registrationAccessToken;
                            request.delete(
                                {
                                    url: ssoRes.url+ '/' + body.clientId,
                                    method: 'DELETE',
                                    headers: {
                                        'Authorization': token
                                    }
                                },
                                function (error,response){
                                    if (error) { //if delete request failed
                                        errorCode = "e1002";
                                        logger.error('Clean up failed, could not delete the client from: ' + ssoRes.name + ' error message: ' + error, {"uuid": uuid, "errorCode": errorCode});
                                        apiResponseCode=500;
                                        responsesProcessed += 1;
                                    }else {
                                        if (response.statusCode !== 204) { //Deletion failed:
                                            errorCode = "e1003";
                                            logger.error('Cleanup failed, could not delete the client from: ' + ssoRes.name + ' error message: ' + response.body.error_description, {"uuid": uuid, "errorCode": errorCode});
                                            apiResponseCode = 500;
                                            responsesProcessed += 1;
                                        } else { //Clean up was successful
                                            logger.info('Cleanup done. sso: ' + ssoRes.name + " clientId: " + body.clientId + " deleted successfully", {"uuid": uuid});
                                            apiResponseCode = 400;
                                            responsesProcessed += 1;
                                        }
                                        if (responsesProcessed === ssoResponses.length) { // if Finished iterating, respond to the user with a summary of all sites:
                                            if (client.webForm) { // request origination is from a web form:
                                                if (apiResponseCode === 500) {
                                                    res.render('error', {message: "Server error - Something went wrong. error: " + errorCode});
                                                } else { // Clean up was successful
                                                    if(ssoResponses.map(x => x.msg).includes("Client Identifier in use")){
                                                        res.render('response', {message: "Failed to create client - Client Id already in use"});
                                                    }else{
                                                        // errorCode =
                                                        res.render('response', {message: "Failed to create client. error: " + errorCode});
                                                    }
                                                }
                                            } else {            //request origination is from a direct API call:
                                                resMessage = "Failed to create client";
                                                logger.info("api response: " + resMessage, {"uuid": uuid});
                                                res.status(apiResponseCode).json({
                                                    message:  resMessage
                                                });
                                            }
                                        }
                                    }
                                })
                        } else { // This client failed to create:
                            errorCode += ssoRes.errorCode;
                            apiResponseCode = 400;
                            responsesProcessed += 1;
                        }
                    })
                }
                if (responsesProcessed === ssoResponses.length) { // if Finished iterating, respond to the user with a summary of all sites:
                    if (client.webForm) { // request origination is from a web form:
                        if (apiResponseCode === 500) {
                            res.render('error', {message: "Server error - Something went wrong. error: " + errorCode});
                        } else { // Clean up was successful
                            if(ssoResponses.map(x => x.msg).includes("Client Identifier in use")){
                                res.render('response', {message: "Failed to create client - Client Id already in use"});
                            }else{
                                res.render('response', {message: "Failed to create client. error: " + errorCode});
                            }
                        }
                    } else {            //request origination is from a direct API call:
                        resMessage = "Failed to create client";
                        logger.info("api response: " + resMessage, {"uuid": uuid});
                        res.status(apiResponseCode).json({
                            message:  resMessage
                        });
                    }
                }
            }
        })
    });
};