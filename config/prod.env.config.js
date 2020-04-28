module.exports = {
    "port": 3200,
    "secretLength": 12,
    "sso_endpoints": [
        {
            "name": "rhsso-1",
            "url": "http://sso1.example.com:8080/auth/realms/master/clients-registrations/default"
        },
        {
            "name": "rhsso-2",
            "url": "http://sso2.example.com:8080/auth/realms/master/clients-registrations/default"
        }
    ]
};
