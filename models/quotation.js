"use strict";
const { Schema, model } = require('mongoose');
const quotationSchema = new Schema({
    quotation_id: {
        type: String,
        default: '',
    },
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
    dealer_product_id: {
        type: String,
        default: '',
    },
    product_price: {
        type: Number,
        default: 0
    },
    qty: {
        type: Number,
        default: 0
    },
    total_price: {
        type: Number,
        default: 0
    },
    grand_total: {
        type: Number,
        default: 0
    },
    delete_allowed: {
        type: Boolean,
        default: true
    },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "inactive"
    },
    is_deleted: {
        type: Boolean,
        default: false
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


const Quotation = model('Quotation', quotationSchema);
module.exports = Quotation;