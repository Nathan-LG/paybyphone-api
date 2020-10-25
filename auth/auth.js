// --------------------------------------------------------------
// Imports
const createLogger = require('logging');
const low          = require('lowdb')
const FileSync     = require('lowdb/adapters/FileSync')

const api = require("../requests/api");

// DB
const adapter = new FileSync('db/db.json')
const db      = low(adapter)

// Logger
const logger = createLogger.default('Auth');
logger.info("Module loaded")

// --------------------------------------------------------------

exports.isTokenValid = () => {
    const auth = db.get("auth").value();
    if (auth.valid_until > Date.now()) {
        logger.info("Token is valid");
        return true;
    } else {
        logger.info("Token is not valid anymore");
        return false;
    }
}

exports.getToken = () => {
    return db.get("auth.token").value();
}

exports.getAccountId = () => {
    return db.get("account.id").value();
}

exports.requestAccountId = () => {
    api.accounts().then(data => {
        db.update('account.id', n => data).write();
    });
}

exports.requestToken = async (username, password) => {
    api.token(username, password).then(data => {
        const validUntil = Date.now() + data.expires_in * 1000;
    
        db.update('auth.token',       n => data.access_token)
          .update('auth.valid_until', n => validUntil)
          .update('auth.refresh',     n => data.refresh_token)
          .write();

        this.requestAccountId();
    });
}