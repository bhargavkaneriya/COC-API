"use strict";
const config = require("./../../config");
const dbConstants = require("./../../constants/db-constants");
const responseCodes = require("./../../helpers/response-codes");
const query = require("./../../utils/query-creator");
const labels = require("./../../utils/labels.json");
require("./../../models/product");
const _ = require("underscore");
const {
  errorHandler,
  passwordHandler,
} = require("xlcoreservice");
const { decrypt } = require("xlcoreservice/handlers/password-handler");
const errors = errorHandler;
const { generateToken } = require('../../utils/common');

const signIn = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const userData = await query.selectWithAndOne(dbConstants.dbSchema.users, { email: requestParam.email }, { _id: 0 });
        if (!userData) {
          reject(errors(labels.LBL_INVALID_EMAIL["EN"], responseCodes.Invalid));
          return;
        }
        userData.password = await decrypt(userData.password)
        if (requestParam.password !== userData.password) {
          reject(errors(labels.LBL_INVALID_PASSWORD["EN"], responseCodes.Invalid));
          return;
        }
        let dataToken = {};
        dataToken = { ...dataToken, id: userData.user_id, user_type: "user" }
        const access_token = generateToken(dataToken);
        await query.updateSingle(dbConstants.dbSchema.users, { access_token }, { email: requestParam.email });
        userData.access_token = access_token;
        resolve(userData);
        return;
      } catch (error) {
        reject(error);
        return;
      }
    }
    main();
  });
};

const details = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const resData = await query.selectWithAndOne(dbConstants.dbSchema.users, { user_id: requestParam.user_id }, { _id: 0, password: 0, access_token: 0 });
        if (!resData) {
          reject(errors(labels.LBL_USER_NOT_FOUND["EN"], responseCodes.ResourceNotFound));
          return;
        }
        resolve(resData);
        return;
      } catch (error) {
        console.log("error", error);
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
        const resData = await query.selectWithAndOne(dbConstants.dbSchema.users, { user_id: requestParam.user_id }, { _id: 0 });
        if (!resData) {
          reject(errors(labels.LBL_USER_NOT_FOUND["EN"], responseCodes.ResourceNotFound));
          return;
        }
        let columnToUpdate = {};
        if (requestParam.email) {
          columnToUpdate = { ...columnToUpdate, email: requestParam.email }
        }
        if (requestParam.password) {
          requestParam.password = await passwordHandler.encrypt(requestParam.password);
          columnToUpdate = { ...columnToUpdate, password: requestParam.password }
        }
        await query.updateSingle(dbConstants.dbSchema.users, columnToUpdate, { user_id: requestParam.user_id });
        let response = await query.selectWithAndOne(dbConstants.dbSchema.users, { user_id: requestParam.user_id }, { _id: 0, password: 0, access_token: 0 })
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

const logout = (requestParam, req2) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const exist_user = await query.selectWithAndOne(dbConstants.dbSchema.users, { user_id: requestParam.user_id }, { _id: 0, password: 0 });
        if (!exist_user) {
          reject(errors(labels.LBL_USER_NOT_FOUND["EN"], responseCodes.ResourceNotFound));
          return;
        }
        await query.updateSingle(dbConstants.dbSchema.users, { access_token: "" }, { user_id: requestParam.user_id });
        resolve({ message: "Logout sucessfully" });
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
  signIn,
  details,
  updateProfile,
  logout
};
