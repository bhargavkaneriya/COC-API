"use strict";
const { Schema, model } = require('mongoose');
const quotationSchema = new Schema({
    quotation_id: {
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
    product_price: {
        type: Object,
        default: {}
    },
    qty: {
        type: String,
        default: ''
    },
    total: {
        type: String,
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


const Quotation = model('Quotation', quotationSchema);
module.exports = Quotation;