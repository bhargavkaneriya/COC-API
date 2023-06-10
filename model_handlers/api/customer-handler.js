"use strict";
const dbConstants = require("./../../constants/db-constants");
const responseCodes = require("./../../helpers/response-codes");
const query = require("./../../utils/query-creator");
const labels = require("./../../utils/labels.json");
require("./../../models/dealer");
const _ = require("underscore");
const { errorHandler } = require("xlcoreservice");
const errors = errorHandler;
const request = require('request');
const apiKey = process.env.GOOGLE_API_KEY;


const popularProductList = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const response = await query.selectWithAnd(dbConstants.dbSchema.products, {is_popular:true}, { _id: 0, product_id: 1, name: 1, image: 1 }, {created_at: -1});
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


const getLatLngFromPincode = async (pincode) => {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${pincode}&key=${apiKey}`;
  const response = await request.get(url);
  if (response.statusCode === 200) {
    const data = await response.json();
    const lat = data.results[0].geometry.location.lat;
    const lng = data.results[0].geometry.location.lng;
    console.log("lat",lat);
    console.log("lng",lng);
    return { lat, lng };
  } else {
    throw new Error(`Error getting latitude and longitude for pincode ${pincode}`);
  }
};

const getPincodesAroundLatLng = async (lat, lng, radius) => {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&radius=${radius}&key=${apiKey}`;
  const response = await request.get(url);
  if (response.statusCode === 200) {
    const data = await response.json();
    const pincodes = data.results.map(result => result.formatted_address);
    console.log("pincodes 34",pincodes);
    return pincodes;
  } else {
    throw new Error(`Error getting pincodes around lat ${lat} and lng ${lng}`);
  }
};


const productList = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        // const sizePerPage = requestParam.sizePerPage ? requestParam.sizePerPage : 10;
        // let page = requestParam.page ? requestParam.page : 0;
        // if (page >= 1) {
        //   page = parseInt(page) - 1;
        // }
        // let comparisonColumnsAndValues = {
        //   pincode: {$in:pincode},
        // }
        // if(requestParam.search_key){
        //   comparisonColumnsAndValues={...comparisonColumnsAndValues, name: requestParam.search_key}
        // }
        // const response = await query.selectWithAndSortPaginate(dbConstants.dbSchema.customers,comparisonColumnsAndValues,{ _id: 0 }, sizePerPage, page, {created_at: -1});
        // resolve(response);

        const pincode = '380052';
        const { lat, lng } = await getLatLngFromPincode(pincode);
        console.log("49 lat",lat);
        console.log("49 lng",lng);
        console.log(`The latitude and longitude of pincode ${pincode} is ${lat}, ${lng}`);

        if(lat && lng){
          const radius = 100;
          const pincodes = await getPincodesAroundLatLng(lat, lng, radius);
          console.log(`The pincodes around lat ${lat} and lng ${lng} within 100 km are: ${pincodes}`);
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
  popularProductList,
  productList,
  requestList,
  quotationList,
  getProfile,
  deleteQuotation
};
