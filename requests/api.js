// --------------------------------------------------------------
// Imports
const axios        = require("axios");
const createLogger = require('logging');
const qs           = require('qs');

const auth = require("../auth/auth");

// Logger
const logger = createLogger.default('Requests');
logger.info("Module loaded")

// Defines
const CONFIG = require("../config/config");

const METHODS = {
    "GET"   : "get",
    "POST"  : "post",
    "PUT"   : "put",
    "DELETE": "delete"
};

const NO_AUTH = [
    "identity/token"
];

// --------------------------------------------------------------

const apiRequest = async (method, endpoint, data = null, headers = null) => {
    if (!NO_AUTH.includes(endpoint)) {
        token = auth.getToken();

        if (headers === null) {
            headers = {}
        }

        headers.Authorization = "Bearer " + token;
    }

    const promise = await axios({
        method,
        url: CONFIG.API_URL + ":" + CONFIG.API_PORT + "/" + endpoint,
        data,
        headers
    });
    
    return promise;
}

exports.token = async (username, password) => {
    return await apiRequest(METHODS.POST, "identity/token", qs.stringify({
        username,
        password,
        "grant_type": "password",
        "client_id": "paybyphone_webapp"
    }), {
        "Content-Type": "application/x-www-form-urlencoded"
    }).then((res) => {
        logger.info("Token acquired, starting with ", res.data.access_token.substring(0, 10));
        return res.data;
    }).catch(err => {
        logger.error("Token request failed with status", err.response.status, err.response.statusText, 
                     "- ", err.response.data.error_description);
    });
}

exports.accounts = async () => {
    return await apiRequest(METHODS.GET, "parking/accounts").then((res) => {
        logger.info("Account ID : ", res.data[0].id);
        return res.data[0].id;
    }).catch(err => {
        logger.error("Account request failed with status", err.response.status, err.response.statusText, 
                     "- ", err.response.data.error_description);
    });
}

exports.currentParking = async (account) => {
    return await apiRequest(METHODS.GET, "parking/accounts/" + account + "/sessions?periodType=Current").then((res) => {
        return res.data;
    }).catch(err => {
        logger.error("Parking request failed with status", err.response.status, err.response.statusText, 
                     "- ", err.response.data.error_description);
    });
}

exports.quote = async (account, vehicle, zone, rate) => {
    return await apiRequest(METHODS.GET, "parking/accounts/" + account + "/quote?licensePlate=" + vehicle + "&locationId=" + zone + "&rateOptionId=" + rate + "&durationTimeUnit=Minutes&durationQuantity=20&isParkUntil=false").then((res) => {
        return res.data;
    }).catch(err => {
        logger.error("Quote request failed with status", err.response.status, err.response.statusText, 
        "- ", err.response.data.error_description);
    });
}

exports.newParking = async (account, licensePlate, locationId, rateOptionId, paymentAccountId, cvv, quoteId, startTime, expireTime, stall) => {
    return await apiRequest(METHODS.POST, "parking/accounts/" + account + "/sessions", {
        licensePlate,
        locationId,
        "paymentMethod": {
            "paymentMethodType": "PaymentAccount",
            "payload": {
                paymentAccountId,
                cvv
            }
        },
        quoteId,
        rateOptionId,
        stall,
        startTime,
        expireTime
    }).then((res) => {
        return res.headers.location;
    }).catch(err => {
        logger.error("Quote request failed with status", err.response.status, err.response.statusText, 
        "- ", err.response.data.error_description);
    });
}

exports.checkPayment = async (url) => {
    token = auth.getToken();
    headers = {
        Authorization: "Bearer " + token
    };

    return await axios({
        method: "get",
        url,
        headers
    }).then((res) => {
        let success = false;

        for (const element of res.data) {
            if ("parkingSessionId" in element) {
                success = true;
                logger.info("Parking is paid !");
                break;
            }
        }

        if (!success) {
            logger.error("Parking is NOT paid !");
        }

        return (success, res.data);
    }).catch(err => {
        logger.error("Check payment request failed with status", err.response.status, err.response.statusText, 
        "- ", err.response.data.error_description);
    });
} 