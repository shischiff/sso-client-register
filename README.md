# sso-client-register

This is a web client for registering clients with RH-SSO (Red Hat Single Sign On).

The software provides a web GUI as well as a HTTP RESTful api.
It supports sending a create client request to one or more RHSSO endpoints

In case of failure to write to all endpoints the application will perform a cleanup so there are on discrepancies between the endpoints.

## Prerequisites

nodejs and npm

versions: [TBD]

IMPORTANT! 
Make sure to enable access from the host to your RHSSO server(s) by adding its hostname, IP or the entire domain to the trusted hosts in the Realm settings under "Client Registrations Policies"

## Installation

        yum install npm
        cd <working directory>
        npm install -g forever
        npm install

## Configuration

Edit the config file under config/prod.env.config.js
The single important parameter is **sso_endpoints** 
This parameter is in the form of an array of objects and should include the name and the full endpoint url for your RHSSO(s)

e.g:

     ...
        "sso_endpoints": [
            {
                "name": "rhsso-1",
                "url": "http://sso1.example.com:8080/auth/realms/master/clients-registrations/openid-connect"
            },
            {
                "name": "rhsso-2",
                "url": "http://sso2.example.com:8080/auth/realms/master/clients-registrations/openid-connect"
            }
        ]
     ...

### Optional parameters

* port - The port on which the portal is listening (defaults to 3200)
* secretLength - Auto-generated secret length in case the end user leaves this field blank (default value is 12)
* logDir - Base directory where the portal logs should be saved - make sure the directory exists and the application has write permission to it. (default location is the application base directory)
* consentRequired - Whether the client should be created with Consent Required flag enabled or not (defaut value is false i.e disabled)  

### Configuration override
It is possible to use an alternative configuration file.  Create a new config file and use the same naming convention replacing only the word 'prod' for example config/test.env.config.js
than set an ENV variable in order to use it. for the example above:

    export MODE=test

Now run the portal as normal, it will load your alternative config file, this will be indicated at the beginning of the log.    

### overriding parameters (PORT)
It is possible to use ENV variable to override port configuration

Use the following to override the value in config file:
    
    export  PORT=<port number>    
 
## Running the server

    npm start 

Alternatively for better robustness use forever to automatically restarting the server after a crush:

    forever start app.js
    
And to make it survive a rebbot
        
     crontab -e
Next, let's add an entry to the bottom of this file:

     @reboot forever start <path/to/app>/app.js

 
## Usage

There are two options to use the server:

### 1. Web UI
Go to http://<server's address>:3200

Fill theform and hit the 'Apply' button, the request will be send to RHSSO (one or more servers, according to the configuration file)
Once completed the result of the request(s) will be displayed at the top the screen.     

### 2. REST API
    
It is possible to send POST requests to /new_client providing application/json body with the following parameters:
    
* id - client ID
* secret - 5 characters minimum, leave blank for an auto-generated secret
* redirectUris - an array containing the redirect url (e.g: ["https://www.example-application.com/oauth2/redirectUri"])
* name - application name
* conntactName - contact point for this client
* contactPhone - contact point for this client

E.g:
    
    curl -X POST \
      http://localhost:3200/new_client \
      -H 'content-type: application/json' \
      -d '{
            "secret": "secret123!",
            "redirectUris": ["https://www.example-application.com/oauth2/redirectUri-1", "https://www.example-application.com/oauth2/redirectUri-2"],
            "name": "myApptName",
            "id": "myClientId",
            "contactName": "John Doe",
            "contactPhone": "+1-070-9999-999"
          }'
          
Alternatively, these same parameters can be provided using a urlencoded POST request
