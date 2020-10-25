// --------------------------------------------------------------
// Imports
const createLogger = require('logging');
const WebSocket    = require('ws');
const auth         = require('../auth/auth');
const parking      = require('../parking/parking');

// Defines
const CONFIG   = require('../config/config');
const { currentParking } = require('./api');

// Logger
const loggerWS = createLogger.default('WebSocket');

// --------------------------------------------------------------

let wss = null;

const sendMessage = (client, success, data) => {
    let dataToSend = {};

    dataToSend.success = success;
    dataToSend.data    = data;
    
    client.send(JSON.stringify(dataToSend));

    loggerWS.info("Message sent");
}

const messageHandler = (client, message) => {
    if (!auth.isTokenValid()) {
        auth.requestToken();

        setTimeout(messageHandler(message), 2000);
    } else {
        try {
            const JSONMessage = JSON.parse(message);

            switch (JSONMessage.task) {
                case "park":
                    parking.park(client)
                        .then(park => {
                            sendMessage(client, true, park);
                        })
                        .catch(err => sendMessage(client, false, err));
                    break;

                case "list":
                    parking.getCurrentParking()
                        .then(currentParking => sendMessage(client, true, currentParking))
                        .catch(err => sendMessage(client, false, err));
                    break;
                
                default:
                    loggerWS.error('Unknown action');
                    break;
            }
        } catch (err) {
            loggerWS.error('Message is not JSON formated');
        }
    }
}

exports.init = () => {
    wss = new WebSocket.Server({ port: CONFIG.WEBSOCKET_PORT });
    wss.on('listening', () => loggerWS.info('Server started and waiting for clients'));

    wss.on('connection', (ws, req) => {
        loggerWS.info("New client connected : " + req.socket.remoteAddress);

        ws.on('message', (message) => messageHandler(ws, message));
    });
}

exports.close = async () => {
    await wss.close();
}

exports.sendResultToClient = (client, data) => {
    client.send(JSON.stringify(data));
    loggerWS.info("Data sent to client", data);
}