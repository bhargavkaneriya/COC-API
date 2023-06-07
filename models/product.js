"use strict";
const { Schema, model } = require("mongoose");
const productSchema = new Schema({
  product_id: {
    type: String,
    default: "",
  },
  name: {
    type: String,
    default: "",
  },
  image: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
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

const Product = model("Product", productSchema);
module.exports = Product;