"use strict";
const dbConstants = require("./../../constants/db-constants");
const responseCodes = require("./../../helpers/response-codes");
const query = require("./../../utils/query-creator");
const labels = require("./../../utils/labels.json");
require("./../../models/dealer");
require("./../../models/product");
require("./../../models/dealer_product");
require("./../../models/cart");
const _ = require("underscore");
const { errorHandler, idGeneratorHandler } = require("xlcoreservice");
const errors = errorHandler;


const addToCart = (requestParam) => {
    return new Promise((resolve, reject) => {
        async function main() {
            try {
                const customer = await query.selectWithAndOne(dbConstants.dbSchema.customers, { customer_id: requestParam.customer_id }, { _id: 0, name: 1 });
                if (!customer) {
                    reject(
                        errors(labels.LBL_USER_NOT_FOUND["EN"], responseCodes.ResourceNotFound)
                    );
                    return;
                }
                const dealer = await query.selectWithAndOne(dbConstants.dbSchema.dealers, { dealer_id: requestParam.dealer_id }, { _id: 0, name: 1 });
                if (!dealer) {
                    reject(
                        errors(labels.LBL_USER_NOT_FOUND["EN"], responseCodes.ResourceNotFound)
                    );
                    return;
                }
                const otherDealer = await query.selectWithAndOne(dbConstants.dbSchema.carts, { customer_id: requestParam.customer_id, dealer_id: { $ne: requestParam.dealer_id } }, { _id: 0, customer_id: 1 });
                if (otherDealer) {
                    reject(errors(labels.LBL_OTHER_PRODUCT_EXIST["EN"], responseCodes.Invalid));
                    return
                }
                const existRecord = await query.selectWithAndOne(dbConstants.dbSchema.carts, { customer_id: requestParam.customer_id, dealer_id: requestParam.dealer_id, product_id: requestParam.product_id }, { _id: 0, customer_id: 1 });
                if (existRecord) {
                    reject(errors(labels.LBL_PRODUCT_ALREADY_EXIST_IN_CART["EN"], responseCodes.Conflict));
                    return
                }
                const cart_id = await idGeneratorHandler.generateId("COCC");
                await query.insertSingle(dbConstants.dbSchema.carts, {
                    cart_id: cart_id,
                    customer_id: requestParam.customer_id,
                    dealer_id: requestParam.dealer_id,
                    product_id: requestParam.product_id,
                    qty: requestParam.qty,
                    dealer_product_id:requestParam.dealer_product_id
                });
                resolve({ message: "Product added in cart successfully" });
                return;
            } catch (error) {
                reject(error);
                return;
            }
        }
        main();
    });
};

const cartList = (requestParam) => {
    return new Promise((resolve, reject) => {
        async function main() {
            try {
                const customer = await query.selectWithAndOne(dbConstants.dbSchema.customers, { customer_id: requestParam.customer_id }, { _id: 0, name: 1 });
                if (!customer) {
                    reject(
                        errors(labels.LBL_USER_NOT_FOUND["EN"], responseCodes.ResourceNotFound)
                    );
                    return;
                }

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
                        $lookup: {
                            from: "dealer_product",
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
                        $lookup: {
                            from: "products",
                            localField: "product_id",
                            foreignField: "product_id",
                            as: "productDetail",
                        },
                    },
                    {
                        $unwind: {
                            path: "$productDetail",
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                    {
                        $match: { customer_id: requestParam.customer_id },
                    },
                    {
                        $project: {
                            _id: 0,
                            cart_id: "$cart_id",
                            customer_id: "$customer_id",
                            customer_name: "$customerDetail.name",
                            dealer_id: "$dealer_id",
                            dealer_name: "$dealerProductDetail.name",
                            product_id: "$product_id",
                            product_name: "$productDetail.name",
                            product_image: "$productDetail.image",
                            qty: "$qty",
                            price:"$dealerProductDetail.price",
                            cart_created:"$created_at"
                        },
                    },
                    {
                        $sort: { created_at: -1 },
                    },
                    // {
                    //     $skip: page * sizePerPage,
                    // },
                    // {
                    //     $limit: sizePerPage,
                    // },
                ];
                const response = await query.joinWithAnd(
                    dbConstants.dbSchema.carts,
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

const deleteCart = (requestParam) => {
    return new Promise((resolve, reject) => {
      async function main() {
        try {
          const response = await query.selectWithAndOne(dbConstants.dbSchema.carts, { cart_id: requestParam.cart_id }, { _id: 0, cart_id: 1 });
          if (!response) {
            reject(errors(labels.LBL_INVALID_CART_ID["EN"], responseCodes.Invalid));
            return;
          }
          await query.removeMultiple(dbConstants.dbSchema.carts, { cart_id: requestParam.cart_id })
          resolve({ message: "Product removed from cart successfully" });
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
    addToCart,
    cartList,
    deleteCart
};
