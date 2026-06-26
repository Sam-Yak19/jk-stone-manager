// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    companyName: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' } // You will be 'admin', others will be 'user'
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);