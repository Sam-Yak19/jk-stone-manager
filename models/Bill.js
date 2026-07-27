// models/Bill.js
const mongoose = require('mongoose');

// Blueprint for individual items inside a bill
const BillItemSchema = new mongoose.Schema({
    size: { type: String, required: true },
    qty: { type: Number, required: true },
    sqft: { type: Number, required: true },
    rate: { type: Number, required: true },
    subtotal: { type: Number, required: true }
});

// Blueprint for the final Bill
const BillSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // e.g., BILL-123456789
    date: { type: String, required: true },
    monthKey: { type: String, required: true },
    timestamp: { type: Number, required: true },
    
    partyName: { type: String, required: true },
    ownerId: { type: String, required: true }, // To track which user created the bill
    
    saleLocation: { type: String, default: 'local' },
    billType: { type: String, enum: ['kacha', 'pakka'], default: 'kacha' },
    
    items: [BillItemSchema], // Array of stones sold
    
    stoneSubtotal: { type: String },
    bharai: { type: String },
    taxDetails: { type: String },
    grandTotal: { type: Number, required: true },
    
    // Payment Ledger Tracking
    amountPaid: { type: Number, default: 0 },
    balance: { type: Number, required: true },
    status: { type: String, default: 'Unpaid' }
}, { timestamps: true });

module.exports = mongoose.model('Bill', BillSchema);