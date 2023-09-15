'use strict';

/*
 *---------------------------------------------------------------
 * aes-256 Handler
 *---------------------------------------------------------------
 *
 * This handler is used for encrypt and decrypt data using aes-256 npm.
 * 
 *     encrypt - encrypt JSON File using aes-256
 *     decrypt - decrypt key using aes-256
 *     encryptParam - encrypt single key using aes-256
 *
 */

const crypto = require('crypto');
const algorithm = 'aes-256-cbc';

/*
 * encrypt
 * @created date : 28th Jan 2022.
 * @param {string} Securitykey - used for encrypt data.
 * @param {string} iv - used for encrypt data.
 * @param {Object} data - which you want to encrypt data.
 * @return{responseCode} - Return response code.
 */

const encrypt = (Securitykey, iv, data)=> {
    return new Promise((resolve) => {
        const cipher = crypto.createCipheriv(algorithm, Securitykey, iv);
        let encryptedData = cipher.update(JSON.stringify(data), "utf-8", "hex");
        encryptedData += cipher.final("hex");
        resolve({
            data: encryptedData,
            iv: iv.toString('hex')
        })
        return;
    })
};

/*
 * decrypt
 * @created date : 28th Jan 2022.
 * @param {string} Securitykey - used for decrypt data.
 * @param {string} iv - used for decrypt data.
 * @param {Object} data - which you want to decrypt data.
 * @return{responseCode} - Return response code.
 */
const decrypt = (Securitykey, iv, data)=> {
    return new Promise((resolve) => {
        const decipher = crypto.createDecipheriv(algorithm, Securitykey, iv);
        let decryptedData = decipher.update(data, "hex", "utf-8");
        decryptedData += decipher.final("utf8");
        resolve(decryptedData)
        return;
    })
};

/*
 * encryptParam
 * @created date : 28th Jan 2022.
 * @param {string} Securitykey - used for decrypt single key.
 * @param {string} iv - used for decrypt single key.
 * @param {string} data - which you want to decrypt single key.
 * @return{responseCode} - Return response code.
 */
const encryptParam = (Securitykey, iv, data)=> {
    return new Promise((resolve) => {
        const cipher = crypto.createCipheriv(algorithm, Securitykey, iv);
        let encryptedData = cipher.update(data, "utf-8", "hex");
        encryptedData += cipher.final("hex");
        resolve({
            data: encryptedData,
            iv: iv.toString('hex')
        })
        return;
    })
};

module.exports = {
    encrypt,
    decrypt,
    encryptParam
};