/*
Sending request to one or more RHSSO endpoints based on the array configured under sso_endpoints
*/

let mode = process.env.MODE || "prod";
const config = require('../config/' + mode + '.env.config.js');
const ssoArray = process.env.SSO_ENDPOINTS || config.sso_endpoints ;

class ssoRes {
    constructor(name, url, code, msg, secret, registrationAccessToken) {
        this.name = name;
        this.url = url;
        this.code = code;
        this.msg = msg;
        this.secret = secret;
        this.registrationAccessToken = registrationAccessToken;
    }
};


function createClient(err, body, cb){

    ssoResponses=[];
    itemsProcessed=0;
    // itterate over each sso endpoint and send the create request, collect responses in an array and pass to callback for processing
    ssoArray.forEach(function (sso, index) {
        console.log('sending client create command to RHSSO ' + sso.name);
        ssoResponses[index]=new ssoRes(name = sso.name, url = sso.url);
        request.post(
            {
                url: sso.url,
                json: body,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            },
            function (error,response){
                if (error) { //if request failed
                    console.log(sso.name +': ' + error);
                    ssoResponses[index]['code']=400;
                    ssoResponses[index]['msg']='Failed sending request to RHSSO';
                    itemsProcessed ++;
                } else { //if received bad response
                    if (response.statusCode !== 201 && response.statusCode !== 200){
                        console.log(sso.name +': ' + response.statusCode + ' '  + response.statusMessage);
                        ssoResponses[index]['code']=response.statusCode ;
                        ssoResponses[index]['msg']=response.statusMessage;
                        itemsProcessed ++;
                    }
                    else{ // Success
                        console.log(sso.name + ': client created successfully');
                        ssoResponses[index].code=response.statusCode;
                        ssoResponses[index].msg='client created successfully';
                        ssoResponses[index].secret=response.body.secret;
                        ssoResponses[index].registrationAccessToken=response.body.registrationAccessToken;
                        itemsProcessed ++;
                    }
                }
                if(itemsProcessed === ssoResponses.length) {
                    return cb( null, ssoResponses);
                }
            }
        );
    });
}

function validateCreation(err, ssoResponses){
    if (ssoResponses.map(x => x.code).indexOf(400)) { // one or more response failed:
        console.log("one or more response failed to create the client " + body.clientId + ". Running clean up... ")
        // Itterate over the responses and check if succeeded, use its token to delete it :
        ssoResponses.forEach(function (ssoRes, index) {
            if (ssoRes.code === 201) { //this response failed:
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
                        if (error) { //if request failed
                            console.log('Clean up failed, could not delete the client from: ' + ssoRes.name + ' error message: ' + error);
                            // return 500 ?
                        }
                        if (response.statusCode !== 204) { //Deletion failed:
                            console.log('Clean up failed, could not delete the client from: ' + ssoRes.name + ' error message: ' + response.statusMessage);
                            // return 500 ?
                        } else { //Clean up was successful
                            console.log('Clean up done. sso: ' + ssoRes.name + " clientId: " + body.clientId + " deleted successfully");
                            // return 400 ?
                        }
                    })
            }
        })
    }
}

module.exports.createClient = createClient;
module.exports.validateCreation = validateCreation;
