"use strict";
const { Schema, model } = require("mongoose");
const customerSchema = new Schema({
  customer_id: {
    type: String,
    default: "",
  },
  role_id: {
    type: String,
    default: "",
  },
  name: {
    type: String,
    default: "",
  },
  email: {
    type: String,
    default: "",
  },
  phone_number: {
    type: String,
    default: "",
  },
  otp: {
    type: Number,
    default: 0,
  },
  password: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    enum: ["active", "inactive", "pending"],
    default: "inactive",
  },
  device_id: {
    type: String,
    default: "",
  },
  device_type: {
    type: String,
    enum: ["ios", "android", ""],
    default: "",
  },
  device_token: {
    type: String,
    default: "",
  },
  device_name: {
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
  gst_no: {
    type: String,
    default: "",
  },
  pan_no: {
    type: String,
    default: "",
  },
  is_company:{
    type: Boolean,
    default: false
  },
  company_name: {
    type: String,
    default: "",
  },
  pincode: {
    type: String,
    default: "",
  },
});

const Customer = model("Customer", customerSchema);
module.exports = Customer;