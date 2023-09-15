'use strict';
/*
 *---------------------------------------------------------------
 * Twillo Handler
 *---------------------------------------------------------------
 *
 * This handler is used to send sms using twillo.
 * 
 *     sendSms - Send sms using twillo
 *
 */

const twilio = require('twilio');
let client = '';

/**
* Method used to update keys
*
* @param {Object} requestParam - An object with keys account_sid, auth_token, mobile_no
*/
const config = (requestParam)=> {
    client = new twilio(requestParam.account_sid, requestParam.auth_token);
};

/**
* Method used to send SMS using twilio
*
* @param {Object} requestParam - An object with keys message, to, from
*/
const sendSms = (requestParam)=> {
    return new Promise((resolve, reject) => {
        client.messages.create({
            body: requestParam.message,
            to: requestParam.to, // Text this number
            from: requestParam.from // From a valid Twilio number
        }).then((message) => {
            resolve(message);
            return
        }).catch((err)=>{
            reject(err);
            return
        });
    })
};


module.exports = {
    config,
    sendSms,
};