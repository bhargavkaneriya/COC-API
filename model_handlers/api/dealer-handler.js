"use strict";
const dbConstants = require("./../../constants/db-constants");
const responseCodes = require("./../../helpers/response-codes");
const query = require("./../../utils/query-creator");
const labels = require("./../../utils/labels.json");
require("./../../models/dealer");
require("./../../models/product");
require("./../../models/dealer_product");
const _ = require("underscore");
const { errorHandler,idGeneratorHandler } = require("xlcoreservice");
const errors = errorHandler;

const productAdd = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const dealer = await query.selectWithAndOne(dbConstants.dbSchema.dealers,{ dealer_id: requestParam.dealer_id },{ _id: 0 });
        if(!dealer){
          reject(errors(labels.LBL_USER_NOT_FOUND["EN"], responseCodes.Invalid));
          return;
        }
        if(requestParam.type == "add"){
          const existProduct = await query.selectWithAndOne(dbConstants.dbSchema.dealer_product, {dealer_id: requestParam.dealer_id, product_id: requestParam.product_id}, {_id:0});
          if(existProduct){
            reject(errors(labels.LBL_PRODUCT_ALREADY_EXIST["EN"], responseCodes.Invalid));
            return;
          }
          const dealer_product_id = await idGeneratorHandler.generateId("COCDP");
          await query.insertSingle(dbConstants.dbSchema.dealer_product,
            {
            dealer_product_id:dealer_product_id,
            dealer_id:requestParam.dealer_id,
            product_id: requestParam.product_id,
            name:requestParam.name,
            image: "tempString",
            code: requestParam.code,
            discount_percentage: requestParam.discount_percentage,
            discount_amount: requestParam.discount_amount,
            price: requestParam.price,
          });
          resolve({message:"Product added successfully"});
          return;
        }else{
          await query.updateSingle(dbConstants.dbSchema.dealer_product,requestParam,{ dealer_product_id: requestParam.dealer_product_id });
          resolve({message:"Product updated successfully"});
          return
        }
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
        const sizePerPage = requestParam.sizePerPage ? requestParam.sizePerPage : 10;
        let page = requestParam.page ? requestParam.page : 0;
        if (page >= 1) {
          page = parseInt(page) - 1;
        }

        const dealer = await query.selectWithAndSortPaginate(dbConstants.dbSchema.dealer_product,{ dealer_id: requestParam.dealer_id },{ _id: 0 },sizePerPage, page, {created_at: -1});
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
          dbConstants.dbSchema.dealer_product,
          { dealer_product_id: requestParam.dealer_product_id },
          { _id: 0 }
        );
        if(!dealer){
          reject(errors(labels.LBL_INVALID_PRODUCT["EN"], responseCodes.Invalid));
          return; 
        }
        await query.removeMultiple(dbConstants.dbSchema.dealer_product, {dealer_product_id: requestParam.dealer_product_id})
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
        const response = await query.selectWithAndSortPaginate(dbConstants.dbSchema.customers,comparisonColumnsAndValues,{ _id: 0, customer_id:1, name:1, is_company:1, company_name:1, phone_number:1,email:1 }, sizePerPage, page, {created_at: -1});
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
        // const response = await query.selectWithAndSortPaginate(dbConstants.dbSchema.requests,comparisonColumnsAndValues,{ _id: 0 }, sizePerPage, page, {created_at: -1});

        const joinArr = [
          {
            $lookup: {
              from: "customers",
              localField: "customer_id",
              foreignField: "customer_id",
              as: "customerDetail",
            },
          },
          {
            $unwind: {
              path: "$customerDetail",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: comparisonColumnsAndValues,
          },
          {
            $project: {
              _id: 0,
              request_id: "$request_id",
              customer_id: "$customer_id",
              request_date: "$created_at",
              customer_name: "$customerDetail.name",
            },
          },
          {
            $sort:{created_at:-1}
          },
          {
            $skip: (page * sizePerPage)
          },
          {
            $limit: sizePerPage,
          },
        ];
        const response = await query.joinWithAnd(
          dbConstants.dbSchema.requests,
          joinArr
        );
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
        // const response = await query.selectWithAndSortPaginate(dbConstants.dbSchema.quotations,comparisonColumnsAndValues,{ _id: 0 }, sizePerPage, page, {created_at: -1});

        const joinArr = [
          {
            $lookup: {
              from: "customers",
              localField: "customer_id",
              foreignField: "customer_id",
              as: "customerDetail",
            },
          },
          {
            $unwind: {
              path: "$customerDetail",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: comparisonColumnsAndValues,
          },
          {
            $project: {
              _id: 0,
              quotation_id: "$quotation_id",
              customer_id: "$customer_id",
              quotation_date: "$created_at",
              customer_name: "$customerDetail.name",
            },
          },
          {
            $sort:{created_at:-1}
          },
          {
            $skip: (page * sizePerPage)
          },
          {
            $limit: sizePerPage,
          },
        ];
        const response = await query.joinWithAnd(
          dbConstants.dbSchema.quotations,
          joinArr
        );
        // resolve({response,total:10});
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
        const sizePerPage = requestParam.sizePerPage ? requestParam.sizePerPage : 10;
        let page = requestParam.page ? requestParam.page : 0;
        if (page >= 1) {
          page = parseInt(page) - 1;
        }
        
        const resData = await query.selectWithAndSortPaginate(dbConstants.dbSchema.products,{status: "active"}, {_id:0}, sizePerPage, page, {created_at: -1});
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

const getProfile = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const resData = await query.selectWithAndOne(
          dbConstants.dbSchema.dealers,
          {
            dealer_id:requestParam.dealer_id
          },{_id:0, dealer_id:1, name:1, phone_number:1,email:1}
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

const getBusinessProfile = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const resData = await query.selectWithAndOne(
          dbConstants.dbSchema.dealers,
          {
            dealer_id:requestParam.dealer_id
          },{_id:0, dealer_id: 1, business_name:1, business_address:1,state:1, city:1, pincode:1, is_verified:1, business_profile_status:1}
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

const updateBusinessProfile = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const resData = await query.selectWithAndOne(
          dbConstants.dbSchema.dealers,
          {
            dealer_id:requestParam.dealer_id
          },{_id:0, dealer_id: 1}
        );

        if(!resData){
          reject(errors(labels.LBL_USER_NOT_FOUND["EN"], responseCodes.Invalid));
          return;
        }

        await query.updateSingle(dbConstants.dbSchema.dealers, {
          business_name:requestParam.business_name,
          business_address:requestParam.business_address,
          state:requestParam.state,
          city:requestParam.city,
          pincode:requestParam.pincode,
          business_profile_status:"added"
        }, {dealer_id: requestParam.dealer_id})

        resolve({message:"Profile details updated successfully"});
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
  commonProductList,
  getProfile,
  getBusinessProfile,
  updateBusinessProfile
};
