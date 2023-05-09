"use strict";
const { Schema, model } = require('mongoose');

const userSchema = new Schema({
    user_id: {
        type: String,
        default: '',
    },
    role_id: {
        type: String,
        default: ''
    },
    name: {
        type: Object,
        default: {}
    },
    photo: {
        type: String,
        default: ''
    },
    email: {
        type: String,
        default: ''
    },
    mobile_country_code: {
        type: String,
        default: ''
    },
    mobile: {
        type: String,
        default: ''
    },
    otp: {
        type: Number,
        default: 0
    },
    last_login_date: {
        type: Date,
        default: Date.now
    },
    password: {
        type: String,
        default: ''
    },
    profile_type: {
        type: String,
        enum: ['personal', 'business'],
        default: 'personal'
    },
    user_type: {
        type: String,
        enum: ['appUser', 'Administrator'],
        default: 'appUser'
    },
    personal_data:{
        type: Object,
        default: {}
    },
    business_data:{
        type: Object,
        default: {}
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
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
    location: {
        type: String,
        default: "",
    },
    bio: {
        type: String,
        default: "",
    },
    cover_image: {
        type: String,
        default: ''
    },
    ref_code: {
        type: String,
        default: ''
    },
    profile_link: {
        type: String,
        default: ''
    },
    register_type: {
        type: String,
        enum: ["regular", "social", "email", "mobile"],
        default: "regular",
    },
    social_id: {
        type: String,
        default: "",
    },
    social_type: {
        type: String,
        enum: ["facebook", "google", "apple"],
        default: "google"
    },
    job_title: {
        type: String,
        default: "",
    },
    company_name: {
        type: String,
        default: "",
    },
    favourite_connections: {
        type: Array,
        default: [],
    },
    qr_code_image: {
        type: String,
        default: ''
    },
    is_direct: {
        type: Boolean,
        default: false
    },
    nfc_id: {
        type: String,
        default: '',
    },
    is_nfc_tag_activate:{
        type: Boolean,
        default: false
    },
    web_view_count: {
        type: Number,
        default: 0
    },
    link_taps_count: {
        type: Number,
        default: 0
    },
    share_type: {
        type: String,
        enum: ["personal", "business"],
        default: "personal"
    },
    active_lang_code:{
        type: String,
        default: 'ES',
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


const User = model('User', userSchema);
module.exports = User;