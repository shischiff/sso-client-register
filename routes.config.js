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
//              "rootUrl": client.rootUrl,
              "name": client.name
        };
        console.log();
        console.dir(body);

//        Send to RHSSO(s):
        send2multipleSSOs.createClient(null, body,function(error, ssoResponses) {
        /*  example ssoResponses: [{"name": "sso-1","code": 200,"msg": "client created successfully"},{"name": "sso-2","code": 400,"msg": "Bad Request"}]   */
            // process the respons(es) from RHSSO
            if (error) {
                console.log('error:' + error)
            }
            else {
                let webMessage = "| ";
                let apiResponseCode=201;
                let apiMessage = "| ";
                ssoResponses.forEach(function (ssoRes, index) {
                        if (ssoRes.code !== 201 && ssoRes.code !== 200) {
                            webMessage += ssoRes.name + ": " + ssoRes.msg + ". erro code: " + ssoRes.code + " | ";
                            apiResponseCode = 400;
                            apiMessage  = "One or more requests failed ";
                        }else{ //success:
                            webMessage += ssoRes.name + ": " + ssoRes.msg + " | ";
                            apiResponseCode = 201;
                            apiMessage  = "All clients were created successfully  ";
                        }
                });
                if (client.webForm) { // request origination is from a web form:
                    res.render('index', {message: webMessage});
                } else {            //request origination is from a direct API call:
                    console.log("api response: " + apiMessage + webMessage);
                    res.status(apiResponseCode).json({
                        message: apiMessage + webMessage
                    });
                }
            }
        })
    });
};