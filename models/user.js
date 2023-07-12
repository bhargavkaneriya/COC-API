"use strict";
const { Schema, model } = require('mongoose');

const userSchema = new Schema({
    user_id: {
        type: String,
        default: '',
    },
    role_name: {
        type: String,
        default: ''
    },
    name: {
        type: String,
        default: ""
    },
    email: {
        type: String,
        default: ''
    },
    phone_number: {
        type: String,
        default: ''
    },
    password: {
        type: String,
        default: ''
    },
    access_token: {
        type: String,
        default: ''
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