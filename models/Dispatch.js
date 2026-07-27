const mongoose = require('mongoose');

// Blueprint for a single stone entry
const ProductSchema = new mongoose.Schema({
    length: Number,
    width: Number,
    quantity: Number,
    category: { type: String, default: "Fresh", enum: ['Fresh', 'Sal', 'Tender'] }, // NEW: Categorization
    note: { type: String, default: "" }
});

// Blueprint for a Sheet or Up (which holds many stones)
const LayerSchema = new mongoose.Schema({
    name: String,
    products: [ProductSchema]
});

// Blueprint for the whole Truck Loading Session
const DispatchSchema = new mongoose.Schema({
    id: String,        // Keeps your 'TRK-12345' format
    date: String,
    party: String,
    ownerId: { type: String, required: true }, // No more default!,
    layersData: [LayerSchema] // Embeds all the sheets/ups inside the truck!
}, { 
    timestamps: true 
});

module.exports = mongoose.model('Dispatch', DispatchSchema);