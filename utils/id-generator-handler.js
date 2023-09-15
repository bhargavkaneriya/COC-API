'use strict';
/*
 *---------------------------------------------------------------
 * ID Generator Handler
 *---------------------------------------------------------------
 *
 * This handler is Generate random string, number or invite code.
 * 
 *     generateId - Generate random ID
 *     generateString - Generate random string
 *     generateShortId - Generate sort ID
 *     generateMediumId - Generate medium ID
 *     generateLongId - Generate Long ID
 *     generateInviteCode - Generate user Invite code
 *
 */

const moment = require('moment');
const randomString = require('random-string');

const { Entropy } = require('entropy-string')
const entropy = new Entropy()

module.exports = {

    /*
     * Generate random ID
     * @created date : 28th Jan 2022.
     * @param {string} label - file path.
    */
    generateId: (label = '')=> {
        return new Promise((resolve) => {
            resolve(`${label}${moment().unix()}${Math.floor((Math.random() * 99) + 11)}`);
            return;
        })
    },

    /*
     * Generate random string
     * @created date : 28th Jan 2022.
     * @param {number} length - random string length.
     * @param {boolean} numeric - is number allow in string.
     * @param {boolean} letters - is letters allow in string.
     * @param {boolean} special - is special char allow in string.
    */
    generateString: (length, numeric, letters, special)=> {
        return new Promise((resolve) => {
            const generatedString = randomString({
                length,
                numeric,
                letters,
                special,
            });
            resolve(generatedString);
            return;
        })
    },

    /*
     * Generate sort ID
     * @created date : 28th Jan 2022.
     * @param {string} label - file path.
    */
    generateShortId: (label = '')=> {
        return new Promise((resolve) => {
            resolve(`${label}${entropy.smallID()}`);
            return;
        })
    },

    /*
     * Generate medium ID
     * @created date : 28th Jan 2022.
     * @param {string} label - file path.
    */
    generateMediumId: (label = '')=> {
        return new Promise((resolve) => {
            resolve(`${label}${entropy.mediumID()}`);
            return;
        })
    },

    /*
     * Generate long ID
     * @created date : 28th Jan 2022.
     * @param {string} label - file path.
    */
    generateLongId: (label = '')=> {
        return new Promise((resolve) => {
            resolve(`${label}${entropy.largeID()}`);
            return;
        })
    },

    /*
     * Generate imvite user code
     * @created date : 28th Jan 2022.
     * @param {number} length - random string length.
    */
    generateInviteCode: (length)=> {
        return new Promise((resolve) => {
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            let result = '';
            for (let i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
            resolve(result);
            return;
        })
    }
};