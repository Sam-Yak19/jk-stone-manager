const mongoose = require('mongoose');

// Blueprint for a single cut stone
const CutStoneSchema = new mongoose.Schema({
    length: Number,
    width: Number,
    quantity: Number
});

// Blueprint for a finalized Karigaar Work Sheet
const KarigaarSchema = new mongoose.Schema({
    karigaarName: { type: String, required: true },
    ownerId: { type: String, default: 'JK_Stones_HQ' }, // Company Tag
    sheetName: String,
    date: String,
    bigBlock: {
        l: { type: Number, default: 0 },
        w: { type: Number, default: 0 },
        h: { type: Number, default: 0 }
    },
    products: [CutStoneSchema]
}, { timestamps: true });

module.exports = mongoose.model('Karigaar', KarigaarSchema);