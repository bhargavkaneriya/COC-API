"use strict";
const dbConstants = require("./../../constants/db-constants");
const responseCodes = require("./../../helpers/response-codes");
const query = require("./../../utils/query-creator");
const labels = require("./../../utils/labels.json");
require("./../../models/dealer");
const _ = require("underscore");
const { errorHandler } = require("xlcoreservice");
const errors = errorHandler;

const dealerList = (requestParam) => {
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
          customer_id: requestParam.customer_id,
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
          customer_id: requestParam.customer_id,
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

const getProfile = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const response = await query.selectWithAndOne(
          dbConstants.dbSchema.customers,
          {
            customer_id:requestParam.customer_id
          },{_id:0, customer_id:1, name:1, phone_number:1,email:1, is_company:1, pan_no:1, gst_no:1}
        );
        console.log("response",response);
        if(!response){
          reject(errors(labels.LBL_USER_NOT_FOUND["EN"], responseCodes.Invalid));
          return;
        }
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

const deleteQuotation =  (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const response = await query.selectWithAndOne(dbConstants.dbSchema.quotations,{quotation_id:requestParam.quotation_id},{_id:0});
        if(!response){
          reject(errors(labels.LBL_INVALID_QUOTATION_ID["EN"], responseCodes.Invalid));
          return;
        }
        await query.removeMultiple(dbConstants.dbSchema.quotations, {quotation_id: requestParam.quotation_id})
        resolve({message:"Quotation deleted successfully"});
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
  dealerList,
  requestList,
  quotationList,
  getProfile,
  deleteQuotation
};
