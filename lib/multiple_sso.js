/*
Sending request to one or more RHSSO endpoints based on the array configured under sso_endpoints
*/

let mode = process.env.MODE || "prod";
const config = require('../config/' + mode + '.env.config.js');
const ssoArray = process.env.SSO_ENDPOINTS || config.sso_endpoints ;

class ssoRes {
    constructor(name, code, msg, secret) {
        this.name = name;
        this.code = code;
        this.msg = msg;
        this.secret = secret;
    }
};


function createClient(err, body, cb){

    ssoResponses=[];
    itemsProcessed=0;
    // itterate over each sso endpoint and send the create request, collect responses in an array and pass to callback for processing
    ssoArray.forEach(function (sso, index) {
        console.log('sending client create command to RHSSO ' + sso.name);
        ssoResponses[index]=new ssoRes(name = sso.name);
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
