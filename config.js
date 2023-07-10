"use strict";
const _ = require("underscore");

// const dotenv = require("dotenv");
// dotenv.config()

const requiredParams = [
  "API_BASE_URL",
  "APP_NAME_PROJECT_NAME",
  "PORT_PROJECT_NAME",
  //   "AWS_MONGO_DUMP_URL",
  //   "AWS_MONGO_RESTORE_URL",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_MOBILE_NO",
];

for (let i = 0; i < requiredParams.length; i++) {
  if (!_.has(process.env, requiredParams[i])) {
    throw new Error(
      "Project Name Platform Environment Variables Not Properly Set"
    );
  }
}

module.exports = {
  appName: process.env.APP_NAME_PROJECT_NAME,
  apiURL: process.env.API_BASE_URL,
  port: process.env.PORT_PROJECT_NAME,
  //   aws: {
  //     mongoDumpUrl: process.env.AWS_MONGO_DUMP_URL,
  //     mongoRestoreUrl: process.env.AWS_MONGO_RESTORE_URL,
  //   },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    mobileNo: process.env.TWILIO_MOBILE_NO
  },
  fcm_push_server_key: process.env.FCM_PUSH_SERVER_KEY
};
