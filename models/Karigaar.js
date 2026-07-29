// Add/update these fields in your existing Schema
const mongoose = require('mongoose');


const karigaarWorkSchema = new mongoose.Schema({
    // ... existing fields (karigaarName, targetWorkSheet, etc.) keep them as is ...

    numberOfStones: {
        type: Number,
        required: true,
        default: 1
    },
    stones: [{
        L: { type: Number, default: 0 },
        W: { type: Number, default: 0 },
        H: { type: Number, default: 0 }
    }],
    totalGunFeet: {
        type: Number,
        required: true,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('Karigaar', karigaarWorkSchema);
// Note: If your backend route strictly destructures req.body (e.g., const { L, W, H } = req.body), 
// update the route in server.js to destructure { numberOfStones, stones, totalGunFeet } instead.