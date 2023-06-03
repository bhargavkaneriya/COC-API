"use strict";
const dbConstants = require("./../../constants/db-constants");
const responseCodes = require("./../../helpers/response-codes");
const query = require("./../../utils/query-creator");
const labels = require("./../../utils/labels.json");
require("./../../models/dealer");
require("./../../models/product");
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
              (singleProduct.image = "tempString"),
                (singleProduct.code = requestParam.code),
                (singleProduct.discount = requestParam.discount),
                (singleProduct.price = requestParam.price);
            }
          });
        }

        await query.updateSingle(dbConstants.dbSchema.dealers,{ products: existProduct },{ dealer_id: requestParam.dealer_id });
        if(requestParam.type == "add"){
          resolve({message:"Product added successfully"});
        }else{
          resolve({message:"Product updated successfully"});
        }
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
        resolve(dealer.products);
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
        resolve({message:"Product deleted successfully"});
        return;
      } catch (error) {
        reject(error);
        return;
      }
    }
    main();
  });
};

const customerList = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const requestCustomers = await query.selectWithAnd(
          dbConstants.dbSchema.requests,
          { dealer_id: requestParam.dealer_id },
          { _id: 0, customer_id: 1 }
        );

        const quationCustomers = await query.selectWithAnd(
          dbConstants.dbSchema.quotations,
          { dealer_id: requestParam.dealer_id },
          { _id: 0, customer_id: 1 }
        );

        let totalCustomer = requestCustomers.concat(quationCustomers);
        totalCustomer = _.uniq(_.pluck(totalCustomer, "customer_id"));
        
        const sizePerPage = requestParam.sizePerPage ? requestParam.sizePerPage : 10;
        let page = requestParam.page ? requestParam.page : 0;
        if (page >= 1) {
          page = parseInt(page) - 1;
        }

        let comparisonColumnsAndValues = {
          customer_id: {$in:totalCustomer},
        }
        if(requestParam.searchKey){
          comparisonColumnsAndValues={...comparisonColumnsAndValues, name: requestParam.searchKey}
        }
        const response = await query.selectWithAndSortPaginate(dbConstants.dbSchema.customers,comparisonColumnsAndValues,{ _id: 0 }, sizePerPage, page, {created_at: -1});
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

const requestList = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const sizePerPage = requestParam.sizePerPage ? requestParam.sizePerPage : 10;
        let page = requestParam.page ? requestParam.page : 0;
        if (page >= 1) {
          page = parseInt(page) - 1;
        }
        let comparisonColumnsAndValues = {
          dealer_id: requestParam.dealer_id,
        }
        // if(requestParam.searchKey){
        //   comparisonColumnsAndValues={...comparisonColumnsAndValues, name: requestParam.searchKey}
        // }
        const response = await query.selectWithAndSortPaginate(dbConstants.dbSchema.requests,comparisonColumnsAndValues,{ _id: 0 }, sizePerPage, page, {created_at: -1});
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

const quotationList = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const sizePerPage = requestParam.sizePerPage ? requestParam.sizePerPage : 10;
        let page = requestParam.page ? requestParam.page : 0;
        if (page >= 1) {
          page = parseInt(page) - 1;
        }
        let comparisonColumnsAndValues = {
          dealer_id: requestParam.dealer_id,
        }
        // if(requestParam.searchKey){
        //   comparisonColumnsAndValues={...comparisonColumnsAndValues, name: requestParam.searchKey}
        // }
        const response = await query.selectWithAndSortPaginate(dbConstants.dbSchema.quotations,comparisonColumnsAndValues,{ _id: 0 }, sizePerPage, page, {created_at: -1});
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

const commonProductList = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const resData = await query.selectWithAnd(
          dbConstants.dbSchema.products,
          {
            status: "active",
          }
        );
        resolve(resData);
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
  productDelete,
  customerList,
  requestList,
  quotationList,
  commonProductList
};
