const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const winston = require('winston');
let mode = process.env.MODE || "prod";
const config = require('./config/' + mode + '.env.config.js');
const addRequestId = require('express-request-id')();

let logDir = config.logDir ||"./"
const logger = winston.createLogger({
    level: 'info',
    format:
        winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        ),
    defaultMeta: { service: 'rhsso-portal' },
    transports: [
        // - Write all logs with level `error` and below to `error.log`
        // - Write all logs with level `info` and below to `app.log`
        // - Write all logs with level `info` and below to the console
        new winston.transports.File({ filename: logDir + 'error.log', level: 'error' }),
        new winston.transports.File({ filename: logDir + 'app.log'}),
        new winston.transports.Console()
    ]
});

logger.info("Loading configuration file: ./config/" + mode + ".env.config.js" );
logger.info("Print configuration to log", {"config": config});


let path = require('path');
const port = process.env.PORT || config.port || 3200;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const router = require('./routes.config');
app.use(express.static(path.join(__dirname, 'views')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(addRequestId);

router.routesConfig(app, logger );


app.listen(port, function () {
    logger.info("Starting")
    logger.info('app listening at port ' + port);
});
