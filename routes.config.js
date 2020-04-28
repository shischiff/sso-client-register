const { clientValidationRules, validate } = require('./lib/validator.js')
const send2multipleSSOs = require('./lib/multiple_sso')

request = require('request');

exports.routesConfig = function (app) {
    app.get("/", function(req, res) {
                     res.render('index', { message: ' '});
                 });
    app.get("/new_client", function(req, res) {
                     res.render('index', { message: ' '});
                 });
    app.post("/new_client", clientValidationRules(), validate, (req, res) => {
      const client = req.body;

        if (client.webForm) { //redirect uris recieved via web form are separated by new lines, this will convert it to an array of URIs
            console.log('Recieved Webform: ' );
            client.redirectUris = client.redirectUris.split(",");
        } else{
            console.log('Recieved API call: ' );
        }
        client.description={ //creating a JSON object from the contact details provided in the webform
        "contactName": client.contactName,
        "contactPhone": client.contactPhone
        };

        body = {
            "clientId": client.id,
            "secret": client.secret,
            "redirectUris": client.redirectUris,
            "description": JSON.stringify(client.description),
            // "rootUrl": client.rootUrl,
            "name": client.name
        };
        console.log();
        console.dir(body);



        send2multipleSSOs.createClient(null, body,function(error, ssoResponses) {
            /*  example ssoResponses: [{"name": "sso-1","code": 200,"msg": "client created successfully"},{"name": "sso-2","code": 400,"msg": "Bad Request"}]   */
            // process the respons(es) from RHSSO
            let responsesProcessed=0;
            let webMessage = "| ";
            let apiResponseCode=201;
            let apiMessage = "| ";

            if (error) {
                    console.log('error:' + error);
                    if (client.webForm) { // request origination is from a web form:
                        webMessage = "Something went wrong server error";
                        res.render('error', {message: webMessage});
                    } else {            //request origination is from a direct API call:
                        console.log("api response: " + apiMessage + webMessage);
                        res.status(apiResponseCode).json({
                            message: apiMessage + webMessage
                        });
                    }

            }
            else {
                if (ssoResponses.map(x => x.code).includes(400)) { // one or more response failed, then run cleanup:
                    console.log("One or more endpoints failed to create the client " + body.clientId + ". Checking if clean up is required... ")
                    // Iterate over the responses and check, if succeeded use its token to delete it :
                    ssoResponses.forEach(function (ssoRes) {
                        if (ssoRes.code === 201) { //this client was created, clean it up:
                            console.log("starting clean up of client: " + body.clientId + " on rhsso: " + ssoRes.name);
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
                                        console.log('Clean up failed, could not delete the client from: ' + ssoRes.name + ' error message: ' + error);
                                        apiResponseCode=500;
                                        responsesProcessed += 1;
                                    }
                                    if (response.statusCode !== 204) { //Deletion failed:
                                        console.log('Cleanup failed, could not delete the client from: ' + ssoRes.name + ' error message: ' + response.body.error_description);
                                        apiResponseCode=500;
                                        responsesProcessed += 1;
                                    } else { //Clean up was successful
                                        console.log('Cleanup done. sso: ' + ssoRes.name + " clientId: " + body.clientId + " deleted successfully");
                                        apiResponseCode=400;
                                        webMessage += ssoRes.name + " - message: Cleanup performed due to failure of another site | ";
                                        responsesProcessed += 1;
                                    }
                                    if(responsesProcessed === ssoResponses.length) { // respond to the user with a summary of all sites:
                                        if (client.webForm) { // request origination is from a web form:
                                            if (apiResponseCode === 500) {
                                                res.render('error', {message: "Server error - Something went wrong"});
                                            }else {
                                                webMessage = webMessage.split('|').join('<br>');
                                                res.render('response', {message: webMessage});
                                            }
                                        } else {            //request origination is from a direct API call:
                                            console.log("api response: " + apiMessage + webMessage);
                                            res.status(apiResponseCode).json({
                                                message: apiMessage + webMessage
                                            });
                                        }
                                    }
                                })
                        } else { // This client failed to create:
                            webMessage += ssoRes.name + " - message: " + ssoRes.msg + ". code: " + ssoRes.code + " | ";
                            apiResponseCode = 400;
                            responsesProcessed += 1;
                        }
                    })
                } else { // All endpoints succeeded:
                    ssoResponses.forEach(function (ssoRes, index) {
                        webMessage += ssoRes.name + ": " + ssoRes.msg + " | ";
                        apiResponseCode = 201;
                        apiMessage = "All clients were created successfully  ";
                        responsesProcessed += 1;
                    });
                }
                if(responsesProcessed === ssoResponses.length) { // respond to the user with a summary of all sites:
                    if (client.webForm) { // request origination is from a web form:
                        webMessage = webMessage.split('|').join('<br>');
                        res.render('response', {message: webMessage});
                    } else {            //request origination is from a direct API call:
                        console.log("api response: " + apiMessage + webMessage);
                        res.status(apiResponseCode).json({
                            message: apiMessage + webMessage
                        });
                    }
                }
            }
        })
    });
}