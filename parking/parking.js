// --------------------------------------------------------------
// Imports
const createLogger = require('logging');

const api  = require("../requests/api");
const auth = require("../auth/auth");
const ws   = require("../requests/ws");

// Logger
const logger = createLogger.default('Parking');
logger.info("Module loaded")

// Defines
const SECRETS = require("../config/secrets");

// --------------------------------------------------------------

exports.getCurrentParking = async () => {
    return await api.currentParking(auth.getAccountId())
                    .then(currentParking => {return currentParking})
                    .catch(err => {return err});
}

exports.park = async(client) => {
    return await api.quote(auth.getAccountId(), SECRETS.VEHICLE, SECRETS.ZONE, SECRETS.RATE)
                    .then(async quote => {
                            const quoteId    = quote.quoteId;
                            const stall      = quote.stall;
                            const startTime  = quote.parkingStartTime;
                            const expireTime = quote.parkingExpiryTime;

                            return await api.newParking(auth.getAccountId(), SECRETS.VEHICLE, SECRETS.ZONE, SECRETS.RATE, 
                                                        SECRETS.PAYMENT, SECRETS.CVV, quoteId, startTime, expireTime, stall)
                                            .then(url => {
                                                    setTimeout(() => {
                                                        api.checkPayment(url)
                                                           .then(data => {ws.sendResultToClient(client, data)})
                                                           .catch(err => {ws.sendResultToClient(client, (false, err))});
                                                    }, 10000);
                                                    return true;
                                            })
                                            .catch(err => {console.log(err.data); return err});
                        })
                        .catch(err => {console.log(err); return err});
}