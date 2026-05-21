// js/karigaar.js

let karigaarData = {};
let currentKarigaarName = '';

// --- 1. CORE DATA FUNCTIONS ---

function loadKarigaarData() {
    try {
        const saved = localStorage.getItem('jkKarigaarData');
        if (saved) {
            karigaarData = JSON.parse(saved);
            const names = Object.keys(karigaarData);
            if (names.length > 0) {
                if (!currentKarigaarName || !names.includes(currentKarigaarName)) {
                    currentKarigaarName = names[0];
                }
            }
        }
    } catch (error) {
        console.error("Error loading Karigaar data", error);
        karigaarData = {};
    }
}

function saveKarigaarData() {
    localStorage.setItem('jkKarigaarData', JSON.stringify(karigaarData));
}

// --- 2. UPDATE BIG BLOCK (AUTO-TARGET LATEST SHEET) ---

window.updateBigBlock = function() {
    if (!currentKarigaarName || !karigaarData[currentKarigaarName] || karigaarData[currentKarigaarName].length === 0) {
        return; // Don't do anything if no sheet exists yet
    }

    // ALWAYS apply the Big Block dimensions to the most recent sheet
    const sectionIndex = karigaarData[currentKarigaarName].length - 1;

    const l = parseFloat(document.getElementById('bigBlockL').value) || 0;
    const w = parseFloat(document.getElementById('bigBlockW').value) || 0;
    const h = parseFloat(document.getElementById('bigBlockH').value) || 0;
    
    if (!karigaarData[currentKarigaarName][sectionIndex].bigBlock) {
        karigaarData[currentKarigaarName][sectionIndex].bigBlock = {l:0, w:0, h:0};
    }
    
    karigaarData[currentKarigaarName][sectionIndex].bigBlock = {l, w, h};
    saveKarigaarData();
    renderKarigaarLayers(); 
};

// --- 3. UI REFRESH FUNCTIONS ---

function refreshKarigaarUI() {
    const nameSelect = document.getElementById('karigaarNameSelector');
    if (!nameSelect) return;

    // Refresh Karigaar Names
    nameSelect.innerHTML = '';
    const karigaarNames = Object.keys(karigaarData);
    
    if (karigaarNames.length === 0) {
        nameSelect.innerHTML = `<option disabled selected>No Karigaars Added</option>`;
        currentKarigaarName = '';
        
        // Clear Big Block Inputs
        document.getElementById('bigBlockL').value = '';
        document.getElementById('bigBlockW').value = '';
        document.getElementById('bigBlockH').value = '';
    } else {
        karigaarNames.forEach(name => {
            nameSelect.innerHTML += `<option value="${name}">${name}</option>`;
        });
        nameSelect.value = currentKarigaarName;

        // Auto-fill Big Block Inputs from the LATEST section
        if (karigaarData[currentKarigaarName] && karigaarData[currentKarigaarName].length > 0) {
            const sectionIndex = karigaarData[currentKarigaarName].length - 1;
            const bigBlock = karigaarData[currentKarigaarName][sectionIndex].bigBlock || {l:'', w:'', h:''};
            document.getElementById('bigBlockL').value = bigBlock.l || '';
            document.getElementById('bigBlockW').value = bigBlock.w || '';
            document.getElementById('bigBlockH').value = bigBlock.h || '';
        } else {
            document.getElementById('bigBlockL').value = '';
            document.getElementById('bigBlockW').value = '';
            document.getElementById('bigBlockH').value = '';
        }
    }

    renderKarigaarLayers();
    calculateKarigaarTotals();
}

function renderKarigaarLayers() {
    const container = document.getElementById('karigaarLayersContainer');
    if (!container) return;
    container.innerHTML = '';

    if (!currentKarigaarName || !karigaarData[currentKarigaarName]) return;

    // We clone the array and reverse it so the newest sheet is always at the top!
    const sections = [...karigaarData[currentKarigaarName]].reverse();

    sections.forEach((layer) => {
        const originalIndex = karigaarData[currentKarigaarName].indexOf(layer);
        
        // --- YIELD MATH ---
        const totalSqFt = layer.products.reduce((sum, p) => sum + (p.length * p.width * p.quantity), 0);
        const bigBlock = layer.bigBlock || {l:0, w:0, h:0};
        const volume = bigBlock.l * bigBlock.w * bigBlock.h;
        const yieldVal = (volume > 0) ? (totalSqFt / volume).toFixed(2) : "0.00";

        const div = document.createElement('div');
        div.className = 'bg-white p-6 rounded-2xl shadow-lg new-item';
        
        div.innerHTML = `
            <div class="flex flex-col mb-4 border-b pb-2">
                <div class="flex justify-between items-center mb-1">
                    <h3 class="text-xl font-bold text-purple-800">${layer.name}</h3>
                        <div class="flex items-center gap-2">
                            <span class="text-sm font-bold text-gray-500 mr-2">${currentKarigaarName}</span>
                            <button onclick="archiveKarigaarSection(${originalIndex})" class="bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-900 px-3 py-1 rounded-md text-xs font-extrabold shadow-sm transition-colors uppercase tracking-wide">Finalize & Save</button>
                            <button onclick="removeKarigaarSection(${originalIndex})" class="bg-red-100 text-red-700 hover:bg-red-200 hover:text-red-900 px-3 py-1 rounded-md text-xs font-extrabold shadow-sm transition-colors uppercase tracking-wide">Delete</button>
                        </div>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-xs text-gray-500">Block: ${bigBlock.l}x${bigBlock.w}x${bigBlock.h} | Total SqFt: ${totalSqFt.toFixed(2)}</span>
                    <span class="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded">Yield: ${yieldVal} ft²/ft³</span>
                </div>
            </div>
            
            <ul class="space-y-3">
                ${layer.products.length === 0 ? `<li class="text-gray-500 italic text-sm">No stones added yet.</li>` : ''}
                ${layer.products.map(p => `
                    <li class="flex justify-between items-center bg-purple-50 p-3 rounded-md">
                        <span class="font-medium text-gray-700">${p.length}ft x ${p.width}ft</span>
                        <span class="font-bold text-purple-700">${p.quantity} pcs</span>
                        <button onclick="removeKarigaarWork(${originalIndex}, ${p.id})" class="text-red-500 text-sm font-semibold hover:text-red-700">Remove</button>
                    </li>
                `).join('')}
            </ul>
        `;
        container.appendChild(div);
    });
}

function calculateKarigaarTotals() {
    let badiTotal = 0;
    let chotiTotal = 0;

    if (currentKarigaarName && karigaarData[currentKarigaarName]) {
        karigaarData[currentKarigaarName].forEach(layer => {
            layer.products.forEach(p => {
                const sqft = p.length * p.width * p.quantity;
                if (p.length > 3.5) {
                    badiTotal += sqft;
                } else {
                    chotiTotal += sqft;
                }
            });
        });
    }

    const badiEl = document.getElementById('karigaarBadiTotal');
    const chotiEl = document.getElementById('karigaarChotiTotal');
    
    if (badiEl) badiEl.textContent = `${badiTotal.toFixed(2)} ft²`;
    if (chotiEl) chotiEl.textContent = `${chotiTotal.toFixed(2)} ft²`;
}

window.removeKarigaarWork = function(sectionIndex, productId) {
    if (!currentKarigaarName || !karigaarData[currentKarigaarName]) return;
    
    karigaarData[currentKarigaarName][sectionIndex].products = 
        karigaarData[currentKarigaarName][sectionIndex].products.filter(p => p.id !== productId);
    
    saveKarigaarData();
    refreshKarigaarUI();
}

window.removeKarigaarSection = function(sectionIndex) {
    if (!currentKarigaarName || !karigaarData[currentKarigaarName]) return;
    
    if (confirm("Are you sure you want to delete this entire Work Sheet? All stones and dimensions inside it will be permanently lost.")) {
        karigaarData[currentKarigaarName].splice(sectionIndex, 1);
        
        // Rename remaining sheets so they stay in order
        karigaarData[currentKarigaarName].forEach((section, index) => {
            section.name = `Work Sheet ${index + 1}`;
        });
        
        saveKarigaarData();
        refreshKarigaarUI();
    }
}

// --- 4. INITIALIZATION & EVENT LISTENERS ---

document.addEventListener('DOMContentLoaded', () => {
    loadKarigaarData();

    const addKarigaarBtn = document.getElementById('addKarigaarBtn');
    const newKarigaarName = document.getElementById('newKarigaarName');
    const removeKarigaarBtn = document.getElementById('removeKarigaarBtn');
    const karigaarNameSelector = document.getElementById('karigaarNameSelector');
    const addNewKarigaarSectionBtn = document.getElementById('addNewKarigaarSectionBtn');
    const addKarigaarProductForm = document.getElementById('addKarigaarProductForm');

    // Add a new Karigaar
    if (addKarigaarBtn) {
        addKarigaarBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            const name = newKarigaarName.value.trim();
            
            if (name && !karigaarData[name]) {
                karigaarData[name] = [{ name: "Work Sheet 1", products: [], bigBlock: {l:0, w:0, h:0} }];
                currentKarigaarName = name;
                saveKarigaarData();
                refreshKarigaarUI();
                newKarigaarName.value = '';
            } else if (karigaarData[name]) {
                alert("This Karigaar already exists!");
            }
        });
    }

    // Remove a Karigaar
    if (removeKarigaarBtn) {
        removeKarigaarBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!currentKarigaarName) return;
            
            if (confirm(`Are you sure you want to remove ${currentKarigaarName}?`)) {
                delete karigaarData[currentKarigaarName];
                const remainingNames = Object.keys(karigaarData);
                currentKarigaarName = remainingNames.length > 0 ? remainingNames[0] : '';
                saveKarigaarData();
                refreshKarigaarUI();
            }
        });
    }

    // Switch between Karigaars (Dropdown change)
    if (karigaarNameSelector) {
        karigaarNameSelector.addEventListener('change', (e) => {
            currentKarigaarName = e.target.value;
            refreshKarigaarUI();
        });
    }

    // Add a new Section (Work Sheet 2, etc.)
    if (addNewKarigaarSectionBtn) {
        addNewKarigaarSectionBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!currentKarigaarName || !karigaarData[currentKarigaarName]) return;
            
            const number = karigaarData[currentKarigaarName].length + 1;
            karigaarData[currentKarigaarName].push({ name: `Work Sheet ${number}`, products: [], bigBlock: {l:0, w:0, h:0} });
            saveKarigaarData();
            refreshKarigaarUI();
        });
    }

    // Add stones to a Karigaar's CURRENT sheet
    if (addKarigaarProductForm) {
        addKarigaarProductForm.addEventListener('submit', (e) => {
            e.preventDefault(); 
            
            if (!currentKarigaarName || !karigaarData[currentKarigaarName]) {
                return alert("Please add or select a Karigaar first.");
            }

            // Auto-create a Work Sheet if none exist
            if (karigaarData[currentKarigaarName].length === 0) {
                karigaarData[currentKarigaarName].push({ name: "Work Sheet 1", products: [], bigBlock: {l:0, w:0, h:0} });
            }

            const qty = parseInt(document.getElementById('karigaarProductQuantity').value);
            const len = parseFloat(document.getElementById('karigaarProductLength').value);
            const wid = parseFloat(document.getElementById('karigaarProductWidth').value);
            
            // ALWAYS target the most recent section
            const targetSectionIndex = karigaarData[currentKarigaarName].length - 1;

            karigaarData[currentKarigaarName][targetSectionIndex].products.push({
                id: Date.now(), length: len, width: wid, quantity: qty
            });

            saveKarigaarData();
            refreshKarigaarUI();
            
            // Reset input boxes
            document.getElementById('karigaarProductQuantity').value = '';
            document.getElementById('karigaarProductLength').value = '';
            document.getElementById('karigaarProductWidth').value = '';
        });
    }

    refreshKarigaarUI();
    const dateEl = document.getElementById('karigaarPageDate');
    if (dateEl) {
        dateEl.textContent = `Date: ${new Date().toLocaleDateString('en-IN')}`;
    }
});

// --- KARIGAAR PERMANENT ARCHIVE SYSTEM ---

let karigaarArchive = [];

// 1. Load the Archive when the file runs
function loadKarigaarArchive() {
    const saved = localStorage.getItem('jkKarigaarArchive');
    if (saved) karigaarArchive = JSON.parse(saved);
}
loadKarigaarArchive();

function saveKarigaarArchive() {
    localStorage.setItem('jkKarigaarArchive', JSON.stringify(karigaarArchive));
}

// 2. The Finalize Function
window.archiveKarigaarSection = function(sectionIndex) {
    if (!currentKarigaarName || !karigaarData[currentKarigaarName]) return;
    
    if (confirm("Are you sure you want to finalize this block? This will save it to the permanent Karigaar Ledger and clear it from your active screen.")) {
        
        // Grab the exact sheet you are archiving
        const sectionToArchive = karigaarData[currentKarigaarName][sectionIndex];
        
        // Add timestamps and the Karigaar's name so we know whose work it is
        sectionToArchive.karigaarName = currentKarigaarName;
        sectionToArchive.archiveDate = new Date().toLocaleDateString('en-IN');
        sectionToArchive.timestamp = Date.now();
        
        // Push to the permanent archive database
        karigaarArchive.push(sectionToArchive);
        saveKarigaarArchive();
        
        // Remove it from the active "whiteboard" screen
        karigaarData[currentKarigaarName].splice(sectionIndex, 1);
        
        // Rename remaining active sheets so they stay in order
        karigaarData[currentKarigaarName].forEach((section, index) => {
            section.name = `Work Sheet ${index + 1}`;
        });
        
        saveKarigaarData();
        refreshKarigaarUI();
        alert(`Block successfully finalized and saved for ${currentKarigaarName}!`);
    }
}