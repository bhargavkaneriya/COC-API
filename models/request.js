"use strict";
const { Schema, model } = require('mongoose');
const requestSchema = new Schema({
    request_id: {
        type: String,
        default: '',
    },
    customer_id: {
        type: String,
        default: '',
    },
    dealer_id: {
        type: String,
        default: '',
    },
    product_id: {
        type: String,
        default: '',
    },
    qty: {
        type: Number,
        default: ''
    },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "inactive"
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});


const Request = model('Request', requestSchema);
module.exports = Request;