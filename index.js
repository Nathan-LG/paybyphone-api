// --------------------------------------------------------------
// Imports
const createLogger = require('logging');
const WebSocket    = require('ws');

const auth = require('./auth/auth');
const ws   = require('./requests/ws');

// Defines
const CONFIG   = require('./config/config');
const SECRETS  = require('./config/secrets');

// Logger
const logger = createLogger.default('PayByPhone-API');

// --------------------------------------------------------------
// Utility function when closing the program

let called = false;

const exitHandler = async () => {
    if (!called) {
        called = true;
        await ws.close();
        logger.info('Shutting down');
    }
}

// --------------------------------------------------------------

// Websocket server
ws.init();

// Auth
if (!auth.isTokenValid()) {
    auth.requestToken(SECRETS.USERNAME, SECRETS.PASSWORD);
}

// Exit handler
process.stdin.resume();

process.on('SIGINT', exitHandler);
process.on('SIGUSR1', exitHandler);
process.on('SIGUSR2', exitHandler);