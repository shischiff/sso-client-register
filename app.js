const express = require('express');
const app = express();
const bodyParser = require('body-parser');

let mode = process.env.MODE || "prod";
console.log("Loading configuration file: ./config/" + mode + ".env.config.js" )
const config = require('./config/' + mode + '.env.config.js');

let path = require('path');
const port = process.env.PORT || config.port || 3200;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const router = require('./routes.config');
app.use(express.static(path.join(__dirname, 'views')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
router.routesConfig(app);


app.listen(port, function () {
    console.log('app listening at port %s', port);
});
