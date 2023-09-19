"use strict";
const config = require("../../config");
const dbConstants = require("./../../constants/db-constants");
const responseCodes = require("./../../helpers/response-codes");
const query = require("./../../utils/query-creator");
const labels = require("./../../utils/labels.json");
require("./../../models/dealer");
require("./../../models/invoice");
require("./../../models/notification");
const _ = require("underscore");
const errors = require("../../utils/error-handler");
const request = require('request');
const apiKey = config.google_api_key
const { forEach } = require("p-iteration");
const axios = require('axios');

const popularProductList = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const response = await query.selectWithAnd(dbConstants.dbSchema.products, { is_popular: true }, { _id: 0, product_id: 1, name: 1, code: 1, image: 1 }, { created_at: -1 });
        response.map((element) => {
          element.image = config.aws.base_url + element.image
        })
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
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${pincode}&key=${process.env.GOOGLE_API_KEY}`;
    const response = await axios.get(url);
    if (response.status === 200) {
      const data = response.data;
      const lat = data.results[0].geometry.location.lat;
      const lng = data.results[0].geometry.location.lng;
      return { lat, lng };
    } else {
      throw new Error(`Error getting latitude and longitude for pincode ${pincode}`);
    }
  } catch (error) {
    console.log("Error:", error.message);
  }
};

// const getPincodesAroundLatLng = async (lat, lng, radius) => {
//   const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&radius=${radius}&key=${apiKey}`;
//   const response = await axios.get(url);
//   if (response.statusCode === 200) {
//     const data = await response.json();
//     const pincodes = data.results.map(result => result.formatted_address);
//     console.log("pincodes 34", pincodes);
//     return pincodes;
//   } else {
//     throw new Error(`Error getting pincodes around lat ${lat} and lng ${lng}`);
//   }
// };


// Function to calculate a destination point given a starting point, bearing, and distance
function calculateDestinationPoint(lat, lng, bearing, distance) {
  const R = 6371; // Earth's radius in kilometers
  const radianBearing = (bearing * Math.PI) / 180; // Convert bearing to radians
  const lat1 = (lat * Math.PI) / 180; // Convert latitude to radians
  const lng1 = (lng * Math.PI) / 180; // Convert longitude to radians

  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distance / R) + Math.cos(lat1) * Math.sin(distance / R) * Math.cos(radianBearing));
  const lng2 = lng1 + Math.atan2(Math.sin(radianBearing) * Math.sin(distance / R) * Math.cos(lat1), Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2));

  // Convert back from radians to degrees
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

const dealerOrProductList = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const pincode = requestParam.pincode;
        const { lat, lng } = await getLatLngFromPincode(pincode);
        let nearbyPostalCodes = [];

        if (lat && lng) {
          // const radius = 100;
          // const pincodes = await getPincodesAroundLatLng(lat, lng, radius);
          // console.log(`The pincodes around lat ${lat} and lng ${lng} within 100 km are: ${pincodes}`);
          async function getPostalCodeFromLatLng(lat, lng) {
            const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.GOOGLE_API_KEY}`);
            if (response.data && response.data.results.length > 0) {
              const results = response.data.results;
              for (const result of results) {
                for (const component of result.address_components) {
                  if (component.types.includes('postal_code')) {
                    return component.long_name;
                  }
                }
              }
            }
            return null;
          }
          const currentLat = lat;
          const currentLng = lng;
          async function findNearbyPostalCodes() {
            const radiusKm = 100;
            const numberOfPoints = 10;
            for (let i = 0; i < numberOfPoints; i++) {
              const bearing = (360 / numberOfPoints) * i;
              const newLatLng = calculateDestinationPoint(currentLat, currentLng, bearing, radiusKm);
              const postalCode = await getPostalCodeFromLatLng(newLatLng.lat, newLatLng.lng);
              if (postalCode) {
                nearbyPostalCodes.push(postalCode);
              }
            }
            return nearbyPostalCodes;
          }

          // const demo = await findNearbyPostalCodes()
          // console.log("demo", demo);
          nearbyPostalCodes = await findNearbyPostalCodes()
          // findNearbyPostalCodes()
          //   .then(nearbyPostalCodes => {
          //     console.log('Nearby Postal Codes:');
          //     console.log("122", nearbyPostalCodes);
          //     if(nearbyPostalCodes){}
          //   })
          //   .catch(error => {
          //     console.error('Error:', error);
          //   });
        }

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
        console.log("nearbyPostalCodes",nearbyPostalCodes);
        let comparisonColumnsAndValues = {
          // "pincode": { $in: ['360450', '360005'] },
          "pincode": nearbyPostalCodes,
        };

        let model_name = "";
        if (requestParam.search_type === "product") {
          model_name = dbConstants.dbSchema.products
        } else if (requestParam.search_type === "dealer") {
          model_name = dbConstants.dbSchema.dealers
        } else {
          reject(errors(labels.LBL_INVALID_SEARCH_TYPE["EN"], responseCodes.Invalid));
          return;
        }

        let totalRecords = await query.countRecord(model_name, {});

        const total_page = totalRecords <= 10 ? 0 : Math.ceil(totalRecords / sizePerPage);
        if (requestParam.page && requestParam.page > total_page) {
          reject(errors(labels.LBL_RECORD_NOT_AVAILABLE["EN"], responseCodes.Invalid));
          return;
        }

        // let dealerList = await query.selectWithAndSortPaginate(dbConstants.dbSchema.dealers, comparisonColumnsAndValues, {_id:0, dealer_id:1, name:1}, sizePerPage, page,  {created_at:-1})
        if (requestParam.search_type == "dealer") {
          if (requestParam.search_key) {
            const searchTerm = requestParam.search_key;
            const regex = new RegExp(searchTerm, "i");
            comparisonColumnsAndValues = { ...comparisonColumnsAndValues, business_name: { $regex: regex } }
          }
        }

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
            $sort: { created_at: -1 },
          },
          {
            $project: {
              _id: 0,
              dealer_id: "$dealer_id",
              dealer_name: "$name",
              business_name: "$business_name"
            },
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

        dealerList = JSON.parse(JSON.stringify(dealerList));
        if (requestParam.search_type === "product") {
          const dealerIds = _.pluck(dealerList, 'dealer_id');
          let matchData = { dealer_id: { $in: dealerIds } };
          if (requestParam.search_key) {
            const searchTerm = requestParam.search_key;
            const regex = new RegExp(searchTerm, "i");
            matchData = { ...matchData, name: { $regex: regex } }
          }

          let sortName = { created_at: -1 };
          if (requestParam.search_filter == "high_to_low") {
            sortName = { price: -1 }
          } else if (requestParam.search_filter == "low_to_high") {
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
              $match: matchData,
            },
            {
              $sort: sortName,
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
          productList.map((element) => {
            element.image = config.aws.base_url + element.image
          })
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
            $sort: sortName,
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
              dealer_name: "$dealerDetail.name",
              business_name: "$dealerDetail.business_name"
            },
          },
        ];
        const response = await query.joinWithAnd(
          dbConstants.dbSchema.dealer_product,
          joinArr
        );
        response.map((element) => {
          element.image = config.aws.base_url + element.image
        })
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
          const dealerDetail = await query.selectWithAndOne(dbConstants.dbSchema.dealers, { dealer_id: response.dealer_id }, { _id: 0, name: 1, business_name: 1 })
          response.dealer_name = dealerDetail.name
          response.business_name = dealerDetail.business_name
        }
        response.image = config.aws.base_url + response.image
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
        let comparisonColumnsAndValues = {
          customer_id: requestParam.customer_id,
          is_deleted: false
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
            $lookup: {
              from: "dealer_products",
              localField: "dealer_product_id",
              foreignField: "dealer_product_id",
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
            $sort: { created_at: -1 },
          },
          {
            $project: {
              _id: 0,
              quotation_id: "$quotation_id",
              dealer_id: "$dealer_id",
              product_id: "$product_id",
              customer_id: "$customer_id",
              dealer_product_id: "$dealer_product_id",
              product_price: "$product_price",
              qty: "$qty",
              total_price: "$total_price",
              grand_total: "$grand_total",
              product_name: "$dealerProductDetail.name",
              dealer_name: "$dealerDetail.name",
              quotation_date: "$created_at",
              product_image: "$dealerProductDetail.image",
              quotation_pdf: "$quo_doc",
              delete_allowed: "$delete_allowed",
              business_name: "$dealerDetail.business_name"
            },
          },
        ];
        let response = await query.joinWithAnd(
          dbConstants.dbSchema.quotations,
          joinArr
        );
        response.map((element) => {
          element.product_image = config.aws.base_url + element.product_image
          element.quotation_pdf = config.aws.base_url + element.quotation_pdf
        })
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
          }, { _id: 0, password: 0, otp: 0, role_id: 0 }
        );
        if (!response) {
          reject(errors(labels.LBL_USER_NOT_FOUND["EN"], responseCodes.ResourceNotFound));
          return;
        }
        await query.updateSingle(dbConstants.dbSchema.customers, { pincode: requestParam.pincode }, { customer_id: requestParam.customer_id });
        const sendRes = await query.selectWithAndOne(
          dbConstants.dbSchema.customers,
          {
            customer_id: requestParam.customer_id
          }, { _id: 0, password: 0, otp: 0, role_id: 0 }
        );
        resolve(sendRes);
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

const verifyPincode = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        // const response = await query.selectWithAndOne(
        //   dbConstants.dbSchema.customers,
        //   { customer_id: requestParam.customer_id },
        //   { _id: 0, customer_id: 1, name: 1, phone_number: 1, email: 1, is_company: 1, pan_no: 1, gst_no: 1 }
        // );
        // console.log("response", response);
        // if (!response) {
        //   reject(errors(labels.LBL_INVALID_PINCODE["EN"], responseCodes.Invalid));
        //   return;
        // }
        resolve({ message: "Entered pincode is valid" });
        return;
      } catch (error) {
        reject(error);
        return;
      }
    }
    main();
  });
};

const notificationList = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const sizePerPage = requestParam.sizePerPage ? parseInt(requestParam.sizePerPage) : 10;
        let page = requestParam.page ? parseInt(requestParam.page) : 0;
        if (page >= 1) {
          page = parseInt(page) - 1;
        }

        const comparisonColumnsAndValues = { customer_id: requestParam.customer_id, type: "customer" };
        const totalRecords = await query.countRecord(dbConstants.dbSchema.notifications, comparisonColumnsAndValues);
        const total_page = totalRecords <= 10 ? 0 : Math.ceil(totalRecords / sizePerPage);

        if (requestParam.page && requestParam.page > total_page) {
          reject(errors(labels.LBL_RECORD_NOT_AVAILABLE["EN"], responseCodes.Invalid));
          return;
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
            $match: comparisonColumnsAndValues,
          },
          {
            $sort: { created_at: -1 },
          },
          {
            $project: {
              _id: 0,
              notification_id: "$notification_id",
              customer_id: "$customer_id",
              dealer_id: "$dealer_id",
              title: "$title",
              description: "$description",
              type: "$type",
              status: "$status",
              notification_date: "$created_at",
              dealer_name: "$dealerDetail.name"
            },
          },
          {
            $skip: page * sizePerPage,
          },
          {
            $limit: sizePerPage,
          }
        ];
        const response = await query.joinWithAnd(
          dbConstants.dbSchema.notifications,
          joinArr
        );
        resolve({ response_data: response, total_page });
        return;
      } catch (error) {
        reject(error);
        return;
      }
    }
    main();
  });
};

const invoiceList = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const sizePerPage = requestParam.sizePerPage ? parseInt(requestParam.sizePerPage) : 10;
        let page = requestParam.page ? parseInt(requestParam.page) : 0;
        if (page >= 1) {
          page = parseInt(page) - 1;
        }

        let comparisonColumnsAndValues = { customer_id: requestParam.customer_id };
        // if (requestParam.search_key) {
        //   comparisonColumnsAndValues = { ...comparisonColumnsAndValues, order_id: requestParam.order_id }
        // }
        if (requestParam.search_key) {
          const searchTerm = requestParam.search_key;
          const regex = new RegExp(searchTerm, "i");
          comparisonColumnsAndValues = { ...comparisonColumnsAndValues, order_id: { $regex: regex } }
        }

        const totalRecords = await query.countRecord(dbConstants.dbSchema.invoices, comparisonColumnsAndValues);
        const total_page = totalRecords <= 10 ? 0 : Math.ceil(totalRecords / sizePerPage);

        if (requestParam.page && requestParam.page > total_page) {
          reject(errors(labels.LBL_RECORD_NOT_AVAILABLE["EN"], responseCodes.Invalid));
          return;
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
            $match: comparisonColumnsAndValues,
          },
          {
            $sort: { created_at: -1 },
          },
          {
            $project: {
              _id: 0,
              invoice_id: "$invoice_id",
              customer_id: "$customer_id",
              dealer_id: "$dealer_id",
              dealer_name: "$dealerDetail.name",
              business_name: "$dealerDetail.business_name",
              invoice_document: "$invoice_document",
              order_id: "$order_id",
            },
          },
          {
            $skip: page * sizePerPage,
          },
          {
            $limit: sizePerPage,
          },
        ];
        const response = await query.joinWithAnd(
          dbConstants.dbSchema.invoices,
          joinArr
        );
        response.map((element) => {
          element.invoice_document = config.aws.base_url + element.invoice_document
        })
        resolve({ response_data: response, total_page });
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
  updatePincode,
  verifyPincode,
  notificationList,
  invoiceList
};
