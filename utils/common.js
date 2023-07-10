"use strict";
const { errorHandler } = require("xlcoreservice");
const jwt = require('jsonwebtoken');
const query = require("./../utils/query-creator");
const secretKey = process.env.JWT_SECRET_KEY;
const dbConstants = require("./../constants/db-constants");
const errors = errorHandler;
const labels = require("./../utils/labels.json");
const responseCodes = require("./../helpers/response-codes");
const config = require("../config");
// const FCM = require('fcm-node');
// const fcm = new FCM(config.fcm_push_server_key);

// Function to generate a JWT token
function generateToken(payload) {
  return jwt.sign(payload, secretKey);
}

// Middleware to verify the JWT token
async function verifyToken(req, res, next) {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const tokenBearer = token.split(' ')[1];
  const decodedToken = jwt.decode(tokenBearer, secretKey);

  if (decodedToken.user_type === "customer") {
    const customerData = await query.selectWithAndOne(dbConstants.dbSchema.customers, { customer_id: decodedToken.id }, { _id: 0, access_token: 1 })
    if (customerData.access_token !== tokenBearer) {
      return (errors(labels.LBL_JWT_TOKEN_INVALID["EN"], responseCodes.Unauthorized));
    }
  } else if (decodedToken.user_type == "dealer") {
    const dealerData = await query.selectWithAndOne(dbConstants.dbSchema.dealers, { dealer_id: decodedToken.id }, { _id: 0, access_token: 1 })
    console.log("dealerData.access_token", dealerData.access_token);
    if (dealerData.access_token !== tokenBearer) {
      return (errors(labels.LBL_JWT_TOKEN_INVALID["EN"], responseCodes.Unauthorized));
    }
  }

  jwt.verify(tokenBearer, secretKey, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Failed to authenticate token' });
    }
    req.user = decoded;
    next();
  });
}


const sendAndroidPush = async (requestParam) => {
  return new Promise(async (resolve, reject) => {
    try {
      const message = {
        registration_ids: [requestParam.device_token],
        collapse_key: 'green',
        data: {
          data: {
            'messageFrom': 'COC',
            message: requestParam.title,
            body: requestParam.description,
            push_type: 'normal'
          },
        },
      };

      fcm.send(message, function (error, result) {
        let pushResult
        if (error) {
          pushResult = 'failed'
          console.error("error=>", error)
          // reject(errors.internalServer(true))
          // return
        } else {
          result = JSON.parse(result)
          if (result.success == 1) {
            pushResult = 'success'
          } else {
            pushResult = 'failed'
          }
        }
        let notificationLog = {}
        resolve(notificationLog)
        return;
      });
    } catch (error) {
      console.log(error)
      reject(errors.internalServer(true))
      return
    }
  })
}

const sendIOSPush = async (requestParam) => {
  return new Promise(async (resolve, reject) => {
    try {
      let note = new apn.Notification();
      note.expiry = Math.floor(Date.now() / 1000) + 3600;
      note.badge = 1;
      note.sound = "ping.aiff";
      note.alert = requestParam.description;
      note.payload.body = {
        'messageFrom': 'Chapchap',
        'title': requestParam.title,
        'message': requestParam.description,
        'push_type': 'normal',
      };
      if (requestParam.user_type == 'consumer') {
        note.topic = config.push_notification.bundle_id_consumer;
      } else if (requestParam.user_type == 'restaurant') {
        note.topic = config.push_notification.bundle_id_restaturant;
      } else {
        note.topic = config.push_notification.bundle_id_delivery_boy;
      }
      apnProvider.send(note, requestParam.device_token).then((result) => {
        console.log("======>" + JSON.stringify(result));
        let pushResult
        if (result.failed.length == 0) {
          pushResult = 'success'
        } else {
          pushResult = 'failed'
        }
        let notificationLog = {}
        resolve(notificationLog)
        return;
      }).catch((error) => {
        console.log("error------------------------------------=>" + error)
        reject(errors.internalServer(true))
        return
      });
    } catch (error) {
      console.log(error)
      reject(errors.internalServer(true))
      return
    }
  })
}


module.exports = {
  generateToken,
  verifyToken,
  sendAndroidPush,
  sendIOSPush
};