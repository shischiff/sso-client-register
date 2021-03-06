/*
Sending request to one or more RHSSO endpoints based on the array configured under sso_endpoints
*/

let mode = process.env.MODE || "prod";
const config = require('../config/' + mode + '.env.config.js');
const ssoArray = process.env.SSO_ENDPOINTS || config.sso_endpoints ;

class ssoRes {
    constructor(name, url, code, msg, secret, registrationAccessToken, errorCode) {
        this.name = name;
        this.url = url;
        this.code = code;
        this.msg = msg;
        this.secret = secret;
        this.registrationAccessToken = registrationAccessToken;
        this.errorCode = errorCode;
    }
}


function createClient(err, body, uuid, logger, cb){

    ssoResponses=[];
    itemsProcessed=0;
    // itterate over each sso endpoint and send the create request, collect responses in an array and pass to callback for processing
    ssoArray.forEach(function (sso, index) {
        logger.info('sending client create command to RHSSO ' + sso.name, {"uuid": uuid});
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
                    ssoResponses[index]['errorCode'] = "e1004";
                    logger.error(sso.name +': ' + error, {"uuid": uuid, "errorCode":ssoResponses[index]['errorCode']});
                    ssoResponses[index]['code']=400;
                    ssoResponses[index]['msg']='Failed sending request to RHSSO';
                    itemsProcessed ++;
                } else {
                    if (response.statusCode !== 201){//if received bad response
                        ssoResponses[index]['errorCode'] = "e1005";
                        if (typeof response.body !== 'undefined') {
                            logger.info(sso.name + ': ' + response.statusCode + ' ' + response.body.error_description, {"uuid": uuid, "errorCode":ssoResponses[index]['errorCode']});
                            ssoResponses[index]['msg'] = response.body.error_description;
                        }else{
                            logger.info(sso.name + ': ' + response.statusCode + ' ' + response.statusMessage, {"uuid": uuid, "errorCode":ssoResponses[index]['errorCode']});
                            ssoResponses[index]['msg'] = response.statusMessage;
                        }
                        ssoResponses[index]['code']=response.statusCode ;
                        itemsProcessed ++;
                    }
                    else{ // Success
                        logger.info(sso.name + ': client created successfully', {"uuid": uuid});
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

module.exports.createClient = createClient;
