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
  idGeneratorHandler,
} = require("xlcoreservice");
const errors = errorHandler;
const { uploadImage, deleteImage } = require('../../utils/common');

const create = (requestParam, req) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        let request_param = {};
        request_param = requestParam;
        request_param = {
          ...request_param,
          product_id: await idGeneratorHandler.generateId("COCP"),
        };
        const imageName = await new Promise((resolve, reject) => {
          uploadImage(req, (error, result) => {
            console.log("error", error);
            resolve(result.file);
          });
        });
        request_param = { ...request_param, image: imageName };
        await query.insertSingle(dbConstants.dbSchema.products, request_param);
        resolve({});
        return;
      } catch (error) {
        reject(error);
        return;
      }
    }
    main();
  });
};

const list = () => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        let resData = await query.selectWithAnd(
          dbConstants.dbSchema.products,
          {
            status: "active",
          }
        );
        resData = JSON.parse(JSON.stringify(resData))
        resData.map((element) => {
          element.image = config.aws.base_url + element.image
        });
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

const details = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const resData = await query.selectWithAndOne(dbConstants.dbSchema.products, { product_id: requestParam.product_id }, { _id: 0 });
        if (!resData) {
          reject(errors(labels.LBL_INALID_PRODUCT["EN"], responseCodes.Invalid));
          return;
        }
        resData.image = config.aws.base_url + resData.image
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

const update = (requestParam, req) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const resData = await query.selectWithAndOne(dbConstants.dbSchema.products, { product_id: requestParam.product_id }, { _id: 0 });
        if (!resData) {
          reject(errors(labels.LBL_INVALID_PRODUCT["EN"], responseCodes.Invalid));
          return;
        }
        await deleteImage({ bucket: config.aws.s3.cocBucket, imageKey: resData.image });
        const imageName = await new Promise((resolve, reject) => {
          uploadImage(req, (error, result) => {
            console.log("error", error);
            resolve(result.file);
          });
        });
        requestParam = { ...requestParam, image: imageName };
        await query.updateSingle(dbConstants.dbSchema.products, requestParam, { product_id: requestParam.product_id })
        resolve({ message: "record updated successfully" });
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

const deleteProduct = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const resData = await query.selectWithAndOne(dbConstants.dbSchema.products, { product_id: requestParam.product_id }, { _id: 0 });
        if (!resData) {
          reject(errors(labels.LBL_INALID_PRODUCT["EN"], responseCodes.Invalid));
          return;
        }
        await query.removeMultiple(dbConstants.dbSchema.products, { product_id: requestParam.product_id })
        resolve({ message: "record deleted successfully" });
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

module.exports = {
  create,
  list,
  details,
  update,
  deleteProduct
};
