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
                const resData = await query.selectWithAndOne(dbConstants.dbSchema.delivery_detail, { customer_id: requestParam.customer_id }, { _id: 0, delivery_detail_id: 1 });
                await query.updateSingle(dbConstants.dbSchema.delivery_detail, requestParam, { customer_id: requestParam.customer_id });
                resolve({ delivery_detail_id: resData.delivery_detail_id, message: "Delivery detail updated successfully" });
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
