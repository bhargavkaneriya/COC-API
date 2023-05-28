"use strict";
const dbConstants = require("./../../constants/db-constants");
const responseCodes = require("./../../helpers/response-codes");
const query = require("./../../utils/query-creator");
const labels = require("./../../utils/labels.json");
require("./../../models/dealer");
const _ = require("underscore");
const { errorHandler } = require("xlcoreservice");
const errors = errorHandler;

const productAdd = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const dealer = await query.selectWithAndOne(
          dbConstants.dbSchema.dealers,
          { dealer_id: requestParam.dealer_id },
          { _id: 0 }
        );

        let existProduct = dealer.products;
        if (requestParam.type == "add") {
          existProduct.push({
            product_id: requestParam.product_id,
            image: "tempString",
            code: requestParam.code,
            discount: requestParam.discount,
            price: requestParam.price,
          });
        } else {
          existProduct.map((singleProduct) => {
            if (singleProduct.product_id == requestParam.product_id) {
                singleProduct.image = "tempString",
                singleProduct.code = requestParam.code,
                singleProduct.discount = requestParam.discount,
                singleProduct.price = requestParam.price;
            }
          });
        }

        await query.updateSingle(
          dbConstants.dbSchema.dealers,
          { products: existProduct },
          { dealer_id: requestParam.dealer_id }
        );
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

const productList = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const dealer = await query.selectWithAndOne(
          dbConstants.dbSchema.dealers,
          { dealer_id: requestParam.dealer_id },
          { _id: 0 }
        );
        resolve(dealer);
        return;
      } catch (error) {
        reject(error);
        return;
      }
    }
    main();
  });
};

const productDelete = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const dealer = await query.selectWithAndOne(
          dbConstants.dbSchema.dealers,
          { dealer_id: requestParam.dealer_id },
          { _id: 0 }
        );
        let existProduct = dealer.products;
        existProduct = _.reject(existProduct, function (num) {
          return num.product_id == requestParam.product_id;
        });

        await query.updateSingle(
          dbConstants.dbSchema.dealers,
          { products: existProduct },
          { dealer_id: requestParam.dealer_id }
        );
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

module.exports = {
  productAdd,
  productList,
  productDelete
};