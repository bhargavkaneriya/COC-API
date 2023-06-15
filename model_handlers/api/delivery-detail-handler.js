"use strict";
const dbConstants = require("./../../constants/db-constants");
const responseCodes = require("./../../helpers/response-codes");
const query = require("./../../utils/query-creator");
const labels = require("./../../utils/labels.json");
require("./../../models/delivery_detail");
const _ = require("underscore");
const { errorHandler, idGeneratorHandler } = require("xlcoreservice");
const errors = errorHandler;

const updateDeliveryDetail = (requestParam) => {
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
                const delivery_detail_id = await idGeneratorHandler.generateId("COCDD");
                let updateData = {
                    delivery_detail_id: delivery_detail_id,
                    customer_id: requestParam.customer_id,
                    name: requestParam.name,
                    email: requestParam.email,
                    address: requestParam.address,
                    state: requestParam.state,
                    city: requestParam.city,
                    pincode: requestParam.pincode
                }

                await query.insertSingle(dbConstants.dbSchema.delivery_detail, updateData, { customer_id: requestParam.customer_id });
                const response = await query.selectWithAndOne(dbConstants.dbSchema.delivery_detail, { delivery_detail_id}, {_id: 0})
                resolve({ delivery_detail_id, message: "Detail updated successfully" });
                return;
            } catch (error) {
                reject(error);
                return;
            }
        }
        main();
    });
};

const getDeliveryDetail = (requestParam) => {
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
                let response = await query.selectWithAndOne(dbConstants.dbSchema.delivery_detail, { customer_id: requestParam.customer_id }, { _id: 0 });
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
    updateDeliveryDetail,
    getDeliveryDetail,
};
