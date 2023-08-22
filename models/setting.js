"use strict";
const { Schema, model } = require("mongoose");
const settingSchema = new Schema({
    android_customer_version: {
        type: String,
        default: 0,
    },
    android_dealer_version: {
        type: String,
        default: 0,
    },
    ios_customer_version: {
        type: String,
        default: 0,
    },
    ios_dealer_version: {
        type: String,
        default: 0,
    },
    password: {
        type: String,
        default: "yymUc8qhGr",
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
    updated_at: {
        type: Date,
        default: Date.now,
    },
});

const Setting = model("Setting", settingSchema);
module.exports = Setting;