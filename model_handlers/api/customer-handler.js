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
const { forEach } = require("p-iteration");

const popularProductList = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const response = await query.selectWithAnd(dbConstants.dbSchema.products, { is_popular: true }, { _id: 0, product_id: 1, name: 1, image: 1 }, { created_at: -1 });
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
    console.log("lat", lat);
    console.log("lng", lng);
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
    console.log("pincodes 34", pincodes);
    return pincodes;
  } else {
    throw new Error(`Error getting pincodes around lat ${lat} and lng ${lng}`);
  }
};

const dealerOrProductList = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        // const pincode = '380052';
        // const { lat, lng } = await getLatLngFromPincode(pincode);
        // console.log("49 lat",lat);
        // console.log("49 lng",lng);
        // console.log(`The latitude and longitude of pincode ${pincode} is ${lat}, ${lng}`);

        // if(lat && lng){
        //   const radius = 100;
        //   const pincodes = await getPincodesAroundLatLng(lat, lng, radius);
        //   console.log(`The pincodes around lat ${lat} and lng ${lng} within 100 km are: ${pincodes}`);
        // }

        const customerDetails = await query.selectWithAndOne(dbConstants.dbSchema.customers, { customer_id: requestParam.customer_id }, { _id: 0, pincode: 1 });
        if (!customerDetails) {
          reject(errors(labels.LBL_USER_NOT_FOUND["EN"], responseCodes.ResourceNotFound));
          return;
        }

        const sizePerPage = requestParam.sizePerPage ? parseInt(requestParam.sizePerPage) : 10;
        let page = requestParam.page ? parseInt(requestParam.page) : 0;
        if (page >= 1) {
          page = parseInt(page) - 1;
        }

        let comparisonColumnsAndValues = {
          "pincode": { $in: ['360450'] },
        };

        let model_name = "";
        if (requestParam.search_type === "product") {
          model_name = dbConstants.dbSchema.products
        } else {
          model_name = dbConstants.dbSchema.dealers
        }

        let totalRecords = await query.countRecord(model_name, {});
        console.log("totalRecords", totalRecords);

        const total_page = totalRecords <= 10 ? 0 : Math.ceil(totalRecords / sizePerPage);
        if (requestParam.page && requestParam.page > total_page) {
          reject(errors(labels.LBL_RECORD_NOT_AVAILABLE["EN"], responseCodes.Invalid));
          return;
        }

        // let dealerList = await query.selectWithAndSortPaginate(dbConstants.dbSchema.dealers, comparisonColumnsAndValues, {_id:0, dealer_id:1, name:1}, sizePerPage, page,  {created_at:-1})

        const joinArr = [
          {
            $lookup: {
              from: "dealer_product",
              localField: "dealer_id",
              foreignField: "dealer_id",
              as: "dealerProductDetail",
            },
          },
          {
            $unwind: {
              path: "$dealerProductDetail",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: comparisonColumnsAndValues,
          },
          {
            $project: {
              _id: 0,
              dealer_id: "$dealer_id",
              name: "$name"
            },
          },
          {
            $sort: { created_at: -1 },
          },
          {
            $skip: page * sizePerPage,
          },
          {
            $limit: sizePerPage,
          },
        ];
        let dealerList = await query.joinWithAnd(
          dbConstants.dbSchema.dealers,
          joinArr
        );
        console.log("dealerList", dealerList);
        dealerList = JSON.parse(JSON.stringify(dealerList));
        if (requestParam.search_type === "product") {
          const dealerIds = _.pluck(dealerList, 'dealer_id');
          const joinArr = [
            {
              $lookup: {
                from: "dealers",
                localField: "dealer_id",
                foreignField: "dealer_id",
                as: "dealerDetail",
              },
            },
            {
              $unwind: {
                path: "$dealerDetail",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $match: { dealer_id: { $in: dealerIds } },
            },
            {
              $project: {
                _id: 0,
                dealer_product_id: "$dealer_product_id",
                dealer_id: "$dealer_id",
                product_id: "$product_id",
                name: "$name",
                image: "$image",
                code: "$code",
                discount_percentage: "$discount_percentage",
                discount_amount: "$discount_amount",
                price: "$price",
                dealer_name: "$dealerDetail.name"
              },
            },
            {
              $sort: { created_at: -1 },
            },
            {
              $skip: page * sizePerPage,
            },
            {
              $limit: sizePerPage,
            },
          ];
          const productList = await query.joinWithAnd(
            dbConstants.dbSchema.dealer_product,
            joinArr
          );
          resolve({ response_data: productList, total_page })
        } else {
          // dealerList.map(async(singleDealer)=>{
          //   const total_records = await query.countRecord(dbConstants.dbSchema.dealer_product,{dealer_id:singleDealer.dealer_id});
          //   console.log("total_records",total_records);
          //   singleDealer.product_count = total_records
          //   console.log("singleDealer",singleDealer);
          // });

          await forEach(dealerList, async (singleDealer, x) => {
            const total_records = await query.countRecord(dbConstants.dbSchema.dealer_product, { dealer_id: singleDealer.dealer_id });
            singleDealer.product_count = total_records
          });

          resolve({ response_data: dealerList, total_page })
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

const dealerProductList = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        let sortName = { created_at: -1 };
        if (requestParam.search_key == "high_to_low") {
          sortName = { price: -1 }
        } else if (requestParam.search_key == "low_to_high") {
          sortName = { price: 1 }
        }
        const joinArr = [
          {
            $lookup: {
              from: "dealers",
              localField: "dealer_id",
              foreignField: "dealer_id",
              as: "dealerDetail",
            },
          },
          {
            $unwind: {
              path: "$dealerDetail",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: { dealer_id: requestParam.dealer_id },
          },
          {
            $project: {
              _id: 0,
              dealer_product_id: 1,
              dealer_id: 1,
              product_id: 1,
              name: 1,
              image: 1,
              code: 1,
              discount_percentage: 1,
              discount_amount: 1,
              price: 1,
              created_at: 1,
              dealer_name: "$dealerDetail.name"
            },
          },
          {
            $sort: sortName,
          }
        ];
        const response = await query.joinWithAnd(
          dbConstants.dbSchema.dealer_product,
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

const productDetail = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        let response = await query.selectWithAndOne(dbConstants.dbSchema.dealer_product, { dealer_product_id: requestParam.dealer_product_id }, { _id: 0 }, { created_at: -1 });
        if (response) {
          response = JSON.parse(JSON.stringify(response));
          const dealerDetail = await query.selectWithAndOne(dbConstants.dbSchema.dealers, { dealer_id: response.dealer_id }, { _id: 0, name: 1 })
          response.dealer_name = dealerDetail.name
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
        const response = await query.selectWithAndSortPaginate(dbConstants.dbSchema.requests, comparisonColumnsAndValues, { _id: 0 }, sizePerPage, page, { created_at: -1 });
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
        const response = await query.selectWithAndSortPaginate(dbConstants.dbSchema.quotations, comparisonColumnsAndValues, { _id: 0 }, sizePerPage, page, { created_at: -1 });
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
            customer_id: requestParam.customer_id
          }, { _id: 0, customer_id: 1, name: 1, phone_number: 1, email: 1, is_company: 1, pan_no: 1, gst_no: 1 }
        );
        console.log("response", response);
        if (!response) {
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


const updatePincode = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const response = await query.selectWithAndOne(
          dbConstants.dbSchema.customers,
          {
            customer_id: requestParam.customer_id
          }, { _id: 0 }
        );
        if (!response) {
          reject(errors(labels.LBL_USER_NOT_FOUND["EN"], responseCodes.ResourceNotFound));
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

const deleteQuotation = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const response = await query.selectWithAndOne(dbConstants.dbSchema.quotations, { quotation_id: requestParam.quotation_id }, { _id: 0 });
        if (!response) {
          reject(errors(labels.LBL_INVALID_QUOTATION_ID["EN"], responseCodes.Invalid));
          return;
        }
        await query.removeMultiple(dbConstants.dbSchema.quotations, { quotation_id: requestParam.quotation_id })
        resolve({ message: "Quotation deleted successfully" });
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
  dealerOrProductList,
  dealerProductList,
  productDetail,
  requestList,
  quotationList,
  getProfile,
  deleteQuotation,
  updatePincode
};
