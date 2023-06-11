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
const { forEach } = require("p-iteration");

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
                const existRecord = await query.selectWithAndOne(dbConstants.dbSchema.carts, { customer_id: requestParam.customer_id, dealer_id: requestParam.dealer_id, product_id: requestParam.product_id }, { _id: 0, customer_id: 1 });
                if (existRecord) {
                    reject(errors(labels.LBL_PRODUCT_ALREADY_EXIST_IN_CART["EN"], responseCodes.Conflict));
                    return
                }
                const otherProduct = await query.countRecord(dbConstants.dbSchema.carts, { customer_id: requestParam.customer_id });
                if (otherProduct > 0) {
                    reject(errors(labels.LBL_CART_NOT_EMPTY["EN"], responseCodes.Conflict));
                    return
                }

                const otherDealer = await query.selectWithAndOne(dbConstants.dbSchema.carts, { customer_id: requestParam.customer_id, dealer_id: { $ne: requestParam.dealer_id } }, { _id: 0, customer_id: 1 });
                if (otherDealer) {
                    reject(errors(labels.LBL_OTHER_PRODUCT_EXIST["EN"], responseCodes.Invalid));
                    return
                }
                const cart_id = await idGeneratorHandler.generateId("COCC");
                await query.insertSingle(dbConstants.dbSchema.carts, {
                    cart_id: cart_id,
                    customer_id: requestParam.customer_id,
                    dealer_id: requestParam.dealer_id,
                    product_id: requestParam.product_id,
                    qty: requestParam.qty,
                    dealer_product_id: requestParam.dealer_product_id
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
                let cartDetails = await query.selectWithAndOne(dbConstants.dbSchema.carts, { customer_id: requestParam.customer_id }, { _id: 0 });
                cartDetails = JSON.parse(JSON.stringify(cartDetails))
                if (cartDetails) {
                    let dealerDetail = await query.selectWithAndOne(dbConstants.dbSchema.dealers, { dealer_id: cartDetails.dealer_id }, { _id: 0, name: 1 });
                    cartDetails.dealer_name = dealerDetail.name;
                    let dealerProductDetail = await query.selectWithAndOne(dbConstants.dbSchema.dealer_product, { dealer_id: cartDetails.dealer_id, product_id: cartDetails.product_id }, { _id: 0, name: 1, image: 1, price: 1 });
                    cartDetails.product_name = dealerProductDetail.name;
                    cartDetails.product_image = dealerProductDetail.image;
                    cartDetails.product_price = dealerProductDetail.price;
                    const totalPrice = Number(cartDetails.qty * dealerProductDetail.price);
                    cartDetails['total_price'] = totalPrice
                    const gstAmount = Number((totalPrice * 16) / 100)
                    cartDetails['gst_amount'] = gstAmount;
                    cartDetails['grand_total'] = Number(totalPrice + gstAmount);
                }
                resolve(cartDetails);
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
