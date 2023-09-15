'use strict';
/*
 *---------------------------------------------------------------
 * Password Handler
 *---------------------------------------------------------------
 *
 * This handler is used to encrypt and decrypt password.
 * 
 *     encrypt - Encrypt normal password
 *     decrypt - Decrypt encrypted password
 *
 */
const crypto = require('crypto');
const algorithm = 'aes-256-ctr';
const password = '0123456789abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ';

module.exports = {

    encrypt: (text)=> {
        return new Promise((resolve) => {
            const cipher = crypto.createCipher(algorithm,password)
            let crypted = cipher.update(text,'utf8','hex')
            crypted += cipher.final('hex');
            resolve(crypted);
            return;
        })
    },

    decrypt: (text)=> {
        return new Promise((resolve) => {
            const decipher = crypto.createDecipher(algorithm,password)
            let dec = decipher.update(text,'hex','utf8')
            dec += decipher.final('utf8');
            resolve(dec);
            return;
        })
    }
};