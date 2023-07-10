"use strict";
const { Schema, model } = require("mongoose");
const settingSchema = new Schema({
    android_app_version: {
        type: Number,
        default: 0,
    },
    ios_app_version: {
        type: Number,
        default: 0,
    },
    password: {
        type: String,
        default: "",
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