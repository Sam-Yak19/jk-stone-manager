const mongoose = require('mongoose');

// Blueprint for an incoming raw material truck
const MineTruckSchema = new mongoose.Schema({
    date: { type: String, required: true },
    party: { type: String, required: true },
    ownerId: { type: String, required: true }, // Company Tag
    totalStones: { type: Number, required: true },
    notes: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model('MineTruck', MineTruckSchema);