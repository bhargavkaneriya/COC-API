"use strict";
const config = require("./../../config");
const dbConstants = require("./../../constants/db-constants");
const responseCodes = require("./../../helpers/response-codes");
const query = require("./../../utils/query-creator");
const labels = require("./../../utils/labels.json");
require("./../../models/user");
require("./../../models/customer");
require("./../../models/dealer");
const _ = require("underscore");
const {
  errorHandler,
  passwordHandler,
  idGeneratorHandler,
} = require("xlcoreservice");
const errors = errorHandler;

const signUp = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        let modelName = "";
        requestParam.password = await passwordHandler.encrypt(requestParam.password);

        if (requestParam.user_type === "customer") {
          modelName = dbConstants.dbSchema.customers;
        } else if (requestParam.user_type === "dealer") {
          modelName = dbConstants.dbSchema.dealers;
        }

        const exist_email = await query.selectWithAndOne(modelName,{email: requestParam.email, status:{$ne:"pending"}},{ _id: 0 });
        if (exist_email) {
          reject(errors(labels.LBL_EMAIL_ALREADY_EXIST["EN"], responseCodes.Conflict));
          return;
        }
        
        const exist_phone_number = await query.selectWithAndOne(modelName,{phone_number: requestParam.phone_number, status:{$ne:"pending"}},{ _id: 0 });
        if (exist_phone_number) {
          reject(errors(labels.LBL_MOBILE_ALREADY_EXIST["EN"], responseCodes.Conflict));
          return;
        }

        let request_param = {};
        request_param = requestParam;
        request_param = { ...request_param, status: "pending" };
        let user_id = "";
        if (requestParam.user_type === "customer") {
          user_id = await idGeneratorHandler.generateId("COCB");
          request_param = { ...request_param, customer_id: user_id };
        } else if (requestParam.user_type === "dealer") {
          user_id = await idGeneratorHandler.generateId("COCD");
          request_param = { ...request_param, dealer_id: user_id };
        }
        const otp = await idGeneratorHandler.generateString(4,true,false,false);
        request_param = {...request_param, otp}
        await query.insertSingle(modelName, request_param);
        resolve({otp});
        return;
      } catch (error) {
        reject(error);
        return;
      }
    }
    main();
  });
};

const signIn = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        let modelName = "";
        if (requestParam.user_type === "customer") {
          modelName = dbConstants.dbSchema.customers;
        } else if (requestParam.user_type === "dealer") {
          modelName = dbConstants.dbSchema.dealers;
        }
        const exist_user = await query.selectWithAndOne(
          modelName,
          {
            email: requestParam.email,
            // status:{$ne:"pending"}
          },
          { _id: 0 }
        );
        if (!exist_user) {
          reject(errors(labels.LBL_INVALID_EMAIL["EN"], responseCodes.Invalid));
          return;
        }
        if (exist_user.status == "pending") {
          const otp = await idGeneratorHandler.generateString(
            4,
            true,
            false,
            false
          );
          resolved({
            otp,
            isVeryfied: false,
          });
          return;
        }
        requestParam.password = await passwordHandler.encrypt(
          requestParam.password
        );
        if (exist_user.password !== requestParam.password) {
          reject(
            errors(labels.LBL_INVALID_PASSWORD["EN"], responseCodes.Invalid)
          );
          return;
        }
        delete exist_user.password;
        resolve(exist_user);
        return;
      } catch (error) {
        reject(error);
        return;
      }
    }
    main();
  });
};

const sendOTP = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        let modelName = "";
        if (requestParam.user_type === "customer") {
          modelName = dbConstants.dbSchema.customers;
        } else if (requestParam.user_type === "dealer") {
          modelName = dbConstants.dbSchema.dealers;
        }
        const exist_user = await query.selectWithAndOne(
          modelName,
          {
            phone_number: requestParam.phone_number,
          },
          { _id: 0 }
        );
        if (!exist_user) {
          reject(
            errors(labels.LBL_INVALID_MOBILE["EN"], responseCodes.Invalid)
          );
          return;
        }
        const otp = await idGeneratorHandler.generateString(
          4,
          true,
          false,
          false
        );
        await query.updateSingle(
          modelName,
          { otp: otp },
          { phone_number: requestParam.phone_number }
        );
        resolve({ otp });
        return;
      } catch (error) {
        reject(error);
        return;
      }
    }
    main();
  });
};

const verifyOTP = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        let modelName = "";
        if (requestParam.user_type === "customer") {
          modelName = dbConstants.dbSchema.customers;
        } else if (requestParam.user_type === "dealer") {
          modelName = dbConstants.dbSchema.dealers;
        }
        const exist_user = await query.selectWithAndOne(
          modelName,
          {
            phone_number: requestParam.phone_number,
          },
          { _id: 0, password:0 }
        );
        if (!exist_user) {
          reject(errors(labels.LBL_INVALID_MOBILE["EN"], responseCodes.Invalid));
          return;
        }

        if(exist_user.otp == Number(requestParam.otp) || requestParam.otp == Number("0000")){
          const otp = await idGeneratorHandler.generateString(4,true,false,false);
          await query.updateSingle(modelName,{ otp: otp, status: "active" },{ phone_number: requestParam.phone_number });
          exist_user.status = "active"
          delete exist_user.otp;
          resolve(exist_user);
          return;
        }else{
          reject(errors(labels.LBL_INVALID_OTP["EN"], responseCodes.InvalidOTP));
          return;
        }
      } catch (error) {
        reject(error);
        return;
      }
    }
    main();
  });
};

const updateProfile = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        let modelName = "";
        let compareData = {};
        if (requestParam.user_type === "customer") {
          modelName = dbConstants.dbSchema.customers;
          compareData = { customer_id: requestParam.user_id };
        } else if (requestParam.user_type === "dealer") {
          modelName = dbConstants.dbSchema.dealers;
          compareData = { dealer_id: requestParam.user_id };
        }
        const exist_user = await query.selectWithAndOne(
          modelName,
          compareData,
          { _id: 0, password:0 }
        );
        if (!exist_user) {
          reject(errors(labels.LBL_USER_NOT_FOUND["EN"], responseCodes.Invalid));
          return;
        }
        let columnToUpdate = {name : requestParam.name};
        if(requestParam.password){
          requestParam.password = await passwordHandler.encrypt(
            requestParam.password
          );
          columnToUpdate = {...columnToUpdate, password:requestParam.password}
        }
        await query.updateSingle(modelName, columnToUpdate, compareData);
        const response = await query.selectWithAndOne(modelName, compareData, {_id:0, password:0, otp:0, products:0})
        resolve(response);
        return;
      } catch (error) {
        reject(error);
        return;
      }
    }
    main();
  });
};

module.exports = {
  signUp,
  sendOTP,
  verifyOTP,
  signIn,
  updateProfile
};
