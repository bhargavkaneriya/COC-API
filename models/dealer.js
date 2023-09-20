"use strict";
const { Schema, model } = require("mongoose");
const dealerSchema = new Schema({
  dealer_id: {
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
    enum: ["active", "inactive", "pending", "approved", "rejected"],
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
  products: {
    type: Array,
    default: [],
  },
  is_verified: {
    type: Boolean,
    default: false
  },
  business_name: {
    type: String,
    default: "",
  },
  business_address: {
    type: String,
    default: "",
  },
  state: {
    type: String,
    default: "",
  },
  city: {
    type: String,
    default: "",
  },
  pincode: {
    type: String,
    default: "",
  },
  business_profile_status: {
    type: String,
    default: "not_added",
  },
  gst_certificate: {
    type: String,
    default: "",
  },
  company_pan: {
    type: String,
    default: "",
  },
  company_registration: {
    type: String,
    default: "",
  },
  company_payment_details: {
    type: String,
    default: "",
  },
  dealer_agreement_with_COC: {
    type: String,
    default: "",
  },
  aadhar_card_of_director: {
    type: String,
    default: "",
  },
  access_token: {
    type: String,
    default: "",
  },
  rejected_reason: {
    type: String,
    default: "",
  },
  location: {
    type: {
      type: String,
      default: "Point",
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
    },
  },
});

const Dealer = model("Dealer", dealerSchema);
module.exports = Dealer;
