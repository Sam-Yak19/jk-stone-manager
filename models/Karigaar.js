const mongoose = require('mongoose');

// Blueprint for individual cut stones
const KarigaarProductSchema = new mongoose.Schema({
    id: Number,
    length: Number,
    width: Number,
    quantity: Number
});

// Blueprint for the multi-stone input
const MultiStoneSchema = new mongoose.Schema({
    numberOfStones: { type: Number, default: 1 },
    stones: [{
        l: { type: Number, default: 0 },
        w: { type: Number, default: 0 },
        h: { type: Number, default: 0 }
    }],
    totalGunFeet: { type: Number, default: 0 }
});

const karigaarWorkSchema = new mongoose.Schema({
    karigaarName: { type: String, required: true },
    sheetName: { type: String },
    date: { type: String },
    
    // The new fields we added
    multiStones: MultiStoneSchema,
    products: [KarigaarProductSchema],
    
    // CRITICAL: Required to link the data to the logged-in user!
    ownerId: { type: String, required: true } 
}, { timestamps: true });

module.exports = mongoose.model('Karigaar', karigaarWorkSchema);