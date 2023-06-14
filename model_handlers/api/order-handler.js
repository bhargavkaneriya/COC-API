"use strict";
const dbConstants = require("./../../constants/db-constants");
const responseCodes = require("./../../helpers/response-codes");
const query = require("./../../utils/query-creator");
const labels = require("./../../utils/labels.json");
require("./../../models/order");
const _ = require("underscore");
const { errorHandler, idGeneratorHandler } = require("xlcoreservice");
const errors = errorHandler;

const createOrder = (requestParam) => {
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
                const deliveryDetail = await query.selectWithAndOne(dbConstants.dbSchema.delivery_detail, { delivery_detail: requestParam.delivery_detail }, { _id: 0 });
                if (!deliveryDetail) {
                    reject(
                        errors(labels.LBL_USER_NOT_FOUND["EN"], responseCodes.ResourceNotFound)
                    );
                    return;
                }
                const cartDetail = await query.selectWithAndOne(dbConstants.dbSchema.carts, { cart_id: requestParam.cart_id }, { _id: 0 });
                if (!cartDetail) {
                    reject(
                        errors(labels.LBL_INVALID_CART_ID["EN"], responseCodes.ResourceNotFound)
                    );
                    return;
                }
                const dealerProduct = await query.selectWithAndOne(dbConstants.dbSchema.dealer_product, { dealer_id: cartDetail.dealer_id, product_id: cartDetail.product_id }, { _id: 0 });
                const order_id = await idGeneratorHandler.generateId("COCO");
                requestParam = {
                    ...requestParam,
                    order_id: order_id,
                    customer_name: deliveryDetail.name,
                    phone_number: deliveryDetail.phone_number,
                    email: deliveryDetail.email,
                    shipping_address: deliveryDetail.address,
                    state: deliveryDetail.state,
                    city: deliveryDetail.city,
                    pincode: deliveryDetail.pincode,
                    dealer_id: cartDetail.dealer_id,
                    product_id: cartDetail.product_id,
                    product_qty: cartDetail.qty,
                    product_name: dealerProduct.name,
                    product_price: dealerProduct.price,
                    product_image: dealerProduct.image,
                    product_discount_percentage: dealerProduct.discount_percentage,
                    product_discount_amount: dealerProduct.discount_amount,
                }
                await query.insertSingle(dbConstants.dbSchema.orders, requestParam);
                resolve({ order_id, message: "Order created successfully" });
                return;
            } catch (error) {
                reject(error);
                return;
            }
        }
        main();
    });
};

const orderList = (requestParam) => {
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
                        $match: { customer_id: requestParam.customer_id, payment_method: requestParam.order_type },
                    },
                    {
                        $project: {
                            _id: 0,
                            order_id: "$order_id",
                            cart_id: "$cart_id",
                            quotation_id: "$quotation_id",
                            customer_id: "$customer_id",
                            dealer_id: "$dealer_id",
                            payment_method:"$payment_method",
                            dealer_name: "$dealerDetail.name",
                            name: "$product_name",
                            qty: "$product_qty",
                            image: "$product_image",
                            price: "$product_price",
                            total_price: "$total_price",
                            grand_total: "$grand_total",
                            order_status: "$order_status",
                            order_created: "$created_at",
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
                    dbConstants.dbSchema.orders,
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

module.exports = {
    createOrder,
    orderList
};
