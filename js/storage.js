// js/storage.js

// This global variable will hold all your Sheets and Ups
let layers = []; 

// Function to load saved data when you open the app
function loadTruckData() {
    const savedData = localStorage.getItem('Truck Data');
    // If there is saved data, use it. Otherwise, start with "Sheet 1"
    layers = savedData ? JSON.parse(savedData) : [{ name: 'Sheet 1', products: [] }];
}

// Function to save data every time you add or remove a stone
function saveTruckData() {
    localStorage.setItem('Truck Data', JSON.stringify(layers));
}

// --- BILL BOOK DATABASE ---
let billArchive = [];

function loadBillArchive() {
    const saved = localStorage.getItem('jkBillArchive');
    if (saved) {
        billArchive = JSON.parse(saved);
    }
}

function saveBillArchive() {
    localStorage.setItem('jkBillArchive', JSON.stringify(billArchive));
}

// Call this immediately so the archive is ready when the app loads
loadBillArchive();