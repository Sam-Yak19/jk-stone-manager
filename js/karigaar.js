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

// --- 2. UPDATE BIG BLOCK (TARGETS THE DROPDOWN) ---

// --- 2. UPDATE MULTI STONES & CALCULATE TOTALS ---

window.calculateGunFeet = function() {
    if (!currentKarigaarName || !karigaarData[currentKarigaarName] || karigaarData[currentKarigaarName].length === 0) return 0;

    let sumVolumes = 0;
    const stoneRows = document.querySelectorAll('.stone-row');
    const stonesArray = [];
    
    stoneRows.forEach(row => {
        const l = parseFloat(row.querySelector('.stone-l').value) || 0;
        const w = parseFloat(row.querySelector('.stone-w').value) || 0;
        const h = parseFloat(row.querySelector('.stone-h').value) || 0;
        stonesArray.push({l, w, h});
        sumVolumes += (l * w * h);
    });

    const totalGunFeet = Math.floor(sumVolumes / 12);
    const displayEl = document.getElementById('displayTotalGunFeet');
    if (displayEl) displayEl.innerText = totalGunFeet;

    // Auto-save to local state
    const select = document.getElementById('karigaarTargetSheetSelect');
    const sectionIndex = select ? parseInt(select.value) : karigaarData[currentKarigaarName].length - 1;
    
    // FIXED: Instead of looking for the deleted dropdown, we just count the stone groups visually on screen
    const numGroups = document.querySelectorAll('.stone-group').length || 1;
    
    // Ensure the section actually exists before saving to prevent crashes
    if (karigaarData[currentKarigaarName][sectionIndex]) {
        karigaarData[currentKarigaarName][sectionIndex].multiStones = {
            numberOfStones: numGroups,
            stones: stonesArray,
            totalGunFeet: totalGunFeet
        };
        saveKarigaarData();
        renderKarigaarLayers(); 
    }
    
    return totalGunFeet;
};

// --- 3. UI REFRESH FUNCTIONS ---

// NEW: Keeps the Target Sheet Dropdown updated without losing current selection
function updateKarigaarTargetDropdown() {
    const select = document.getElementById('karigaarTargetSheetSelect');
    if (!select) return;

    // 1. Remember the current selection before we clear the dropdown
    const previousSelection = select.value;

    select.innerHTML = ''; // Clear old
    
    if (currentKarigaarName && karigaarData[currentKarigaarName] && karigaarData[currentKarigaarName].length > 0) {
        karigaarData[currentKarigaarName].forEach((sheet, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = sheet.name;
            select.appendChild(option);
        });
        
        // 2. Only go to the newest sheet if there was no previous selection. 
        // Otherwise, stay exactly where the user is working!
        if (previousSelection && karigaarData[currentKarigaarName][previousSelection]) {
            select.value = previousSelection;
        } else {
            select.value = karigaarData[currentKarigaarName].length - 1;
        }
        
        // Auto-fill the multi-stone inputs based on the selected sheet
        updateMultiStoneInputs(select.value);
    } else {
        document.getElementById('dynamicStonesContainer').innerHTML = '';
        document.getElementById('displayTotalGunFeet').innerText = '0';
    }
}

// Helper to fill the multi-stone boxes when you switch target sheets
function updateMultiStoneInputs(index) {
    if (!karigaarData[currentKarigaarName] || !karigaarData[currentKarigaarName][index]) return;
    const multiData = karigaarData[currentKarigaarName][index].multiStones || { numberOfStones: 1, stones: [], totalGunFeet: 0 };
    
    const container = document.getElementById('dynamicStonesContainer');
    container.innerHTML = '';
    stoneCounter = 0; // Reset counter
    
    // Draw the saved stones
    if (multiData.stones && multiData.stones.length > 0) {
        multiData.stones.forEach((stone) => {
            addNewStoneGroup();
            // Fill in the data for the newly created stone group
            const group = document.getElementById(`stone-group-${stoneCounter}`);
            const inputs = group.querySelectorAll('.stone-row input');
            if (inputs.length >= 3) {
                inputs[0].value = stone.l || '';
                inputs[1].value = stone.w || '';
                inputs[2].value = stone.h || '';
            }
        });
    } else {
        // Always start with at least one empty stone group
        addNewStoneGroup();
    }

    const displayEl = document.getElementById('displayTotalGunFeet');
    if (displayEl) displayEl.innerText = multiData.totalGunFeet || 0;
}

function refreshKarigaarUI() {
    const nameSelect = document.getElementById('karigaarNameSelector');
    if (!nameSelect) return;

    // Refresh Karigaar Names
    nameSelect.innerHTML = '';
    const karigaarNames = Object.keys(karigaarData);
    
    if (karigaarNames.length === 0) {
        nameSelect.innerHTML = `<option disabled selected>No Karigaars Added</option>`;
        currentKarigaarName = '';
    } else {
        karigaarNames.forEach(name => {
            nameSelect.innerHTML += `<option value="${name}">${name}</option>`;
        });
        nameSelect.value = currentKarigaarName;
    }

    updateKarigaarTargetDropdown(); // Call the new dropdown function
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
        // --- YIELD MATH ---
        const totalSqFt = layer.products.reduce((sum, p) => sum + (p.length * p.width * p.quantity), 0);
        const multi = layer.multiStones || { numberOfStones: 1, stones: [], totalGunFeet: 0 };
        
        let yieldVal = "0.00";
        if (multi.totalGunFeet > 0) {
            yieldVal = (totalSqFt / multi.totalGunFeet).toFixed(2);
        }

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
                    <span class="text-xs text-gray-500">Stones: ${multi.numberOfStones} | Total Gun Feet: ${multi.totalGunFeet} | Total SqFt: ${totalSqFt.toFixed(2)}</span>
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
                karigaarData[name] = [{ name: "Work Sheet 1", products: [], multiStones: { numberOfStones: 1, stones: [{l:'', w:'', h:''}], totalGunFeet: 0 } }];
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
            karigaarData[currentKarigaarName].push({ name: `Work Sheet ${number}`, products: [], multiStones: { numberOfStones: 1, stones: [{l:'', w:'', h:''}], totalGunFeet: 0 } });
            saveKarigaarData();
            
            // Force the dropdown to forget its previous place so it jumps to the new sheet
            const select = document.getElementById('karigaarTargetSheetSelect');
            if(select) select.value = ""; 
            
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
                karigaarData[currentKarigaarName].push({ name: "Work Sheet 1", products: [], multiStones: { numberOfStones: 1, stones: [{l:'', w:'', h:''}], totalGunFeet: 0 } });
            }

            const qty = parseInt(document.getElementById('karigaarProductQuantity').value);
            const len = parseFloat(document.getElementById('karigaarProductLength').value);
            const wid = parseFloat(document.getElementById('karigaarProductWidth').value);
            
            // 1. Grab target from dropdown
            const select = document.getElementById('karigaarTargetSheetSelect');
            const targetSectionIndex = select ? parseInt(select.value) : karigaarData[currentKarigaarName].length - 1;

            karigaarData[currentKarigaarName][targetSectionIndex].products.push({
                id: Date.now(), length: len, width: wid, quantity: qty
            });

            saveKarigaarData();
            
            // 2. Remember where we were
            const keepSection = select ? select.value : "0";
            
            refreshKarigaarUI();
            
            // 3. Reset input boxes and put the dropdown back
            document.getElementById('karigaarProductQuantity').value = '';
            document.getElementById('karigaarProductLength').value = '';
            document.getElementById('karigaarProductWidth').value = '';
            if (select) select.value = keepSection;
        });
    }

    // Make the dropdown clickable so big blocks instantly update
    const karigaarTargetSheetSelect = document.getElementById('karigaarTargetSheetSelect');
    if (karigaarTargetSheetSelect) {
        karigaarTargetSheetSelect.addEventListener('change', (e) => {
            updateMultiStoneInputs(e.target.value);
        });
    }

    refreshKarigaarUI();
    const dateEl = document.getElementById('karigaarPageDate');
    if (dateEl) {
        dateEl.textContent = `Date: ${new Date().toLocaleDateString('en-IN')}`;
    }
});

// ==========================================
// KARIGAAR PERMANENT ARCHIVE (CLOUD DATABASE)
// ==========================================

let cloudKarigaarArchive = [];

// 1. The Finalize Function (Send to Node.js / MongoDB)
// 1. The Finalize Function (Send to Node.js / MongoDB)
window.archiveKarigaarSection = async function(sectionIndex) {
    if (!currentKarigaarName || !karigaarData[currentKarigaarName]) return;
    
    if (confirm("Are you sure you want to finalize this block? It will be permanently saved to the Cloud Database.")) {
        
        const sectionToArchive = karigaarData[currentKarigaarName][sectionIndex];
        
       // FIXED: Grab the logged-in user details using the correct properties from your Auth system
        const currentUser = JSON.parse(localStorage.getItem('jk_user')) || {};
        const actualOwnerId = currentUser.id || currentUser.companyName || 'JK_Stones_HQ';
        
        // Structure the data to match your MongoDB Schema perfectly
        const payload = {
            karigaarName: currentKarigaarName,
            sheetName: sectionToArchive.name,
            date: new Date().toLocaleDateString('en-IN'),
            multiStones: sectionToArchive.multiStones,
            products: sectionToArchive.products,
            ownerId: actualOwnerId // Uses the correct ID now!
        };
        
        try {
            // 🚀 THE BRIDGE: Send data to MongoDB
            const response = await fetch('/api/karigaars', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                // Remove it from the active "whiteboard" screen
                karigaarData[currentKarigaarName].splice(sectionIndex, 1);
                
                // Rename remaining active sheets so they stay in order
                karigaarData[currentKarigaarName].forEach((section, index) => {
                    section.name = `Work Sheet ${index + 1}`;
                });
                
                saveKarigaarData();
                refreshKarigaarUI();
                alert(`✅ Block successfully saved to the Cloud for ${currentKarigaarName}!`);
            } else {
                alert("Failed to save to cloud database. Check terminal.");
            }
        } catch (error) {
            alert("Could not connect to backend server! Make sure 'node server.js' is running.");
        }
    }
}

// 2. Fetch and Draw the Saved Karigaar Work from MongoDB
// 2. Fetch and Draw the Saved Karigaar Work from MongoDB
window.renderSavedKarigaarArchive = async function() {
    const container = document.getElementById('savedKarigaarList');
    const filterSelect = document.getElementById('savedKarigaarFilter');
    if (!container) return;

    container.innerHTML = '<div class="text-center py-8 text-purple-600 font-bold animate-pulse">☁️ Fetching live data from MongoDB...</div>';

    try {
// FIXED: Grab the logged-in user details using the correct properties
        const currentUser = JSON.parse(localStorage.getItem('jk_user')) || {};
        const actualOwnerId = currentUser.id || currentUser.companyName || 'JK_Stones_HQ';
        
        // Fetch only THIS company's Karigaar work
        const response = await fetch(`/api/karigaars?ownerId=${actualOwnerId}`);
        const result = await response.json();

        // NEW: Check if the backend actually succeeded before trying to render!
        if (!result.success) {
            console.error("Backend rejected the request:", result.message);
            container.innerHTML = `<div class="text-center py-8 text-red-500 font-bold">❌ Database Error: ${result.message}</div>`;
            return;
        }

        // Add fallback to empty array to prevent crashes
        cloudKarigaarArchive = result.data || []; 

        if (cloudKarigaarArchive.length === 0) {
            container.innerHTML = `<div class="text-center py-10 bg-white rounded-xl shadow-sm text-gray-500 italic">No finalized Karigaar work found in the database.</div>`;
            return;
        }

        // Populate the Dropdown with Unique Karigaar Names
        const uniqueNames = [...new Set(cloudKarigaarArchive.map(item => item.karigaarName))];
        const currentFilter = filterSelect.value;
        
        filterSelect.innerHTML = '<option value="ALL">-- Show All Work --</option>';
        uniqueNames.forEach(name => {
            filterSelect.innerHTML += `<option value="${name}">${name}</option>`;
        });
        filterSelect.value = uniqueNames.includes(currentFilter) ? currentFilter : "ALL";

        // Filter the data based on selection
        const filteredData = filterSelect.value === "ALL" 
            ? cloudKarigaarArchive 
            : cloudKarigaarArchive.filter(item => item.karigaarName === filterSelect.value);

        container.innerHTML = '';
        
        filteredData.forEach(block => {
            // Calculate Totals for this block
            const totalSqFt = block.products.reduce((sum, p) => sum + (p.length * p.width * p.quantity), 0);
            const totalGunFeet = block.multiStones ? block.multiStones.totalGunFeet : 0;
            const yieldVal = (totalGunFeet > 0) ? (totalSqFt / totalGunFeet).toFixed(2) : "0.00";

            const card = document.createElement('div');
            card.className = 'bg-white p-6 rounded-2xl shadow-md border border-purple-100 flex flex-col md:flex-row gap-6 items-start';
            
            // Generate list of cut stones
            const stonesListHtml = block.products.map(p => `
                <li class="flex justify-between items-center bg-gray-50 p-2 rounded text-sm border border-gray-100">
                    <span class="font-medium text-gray-700">${p.length}ft x ${p.width}ft</span>
                    <span class="font-bold text-purple-700">${p.quantity} pcs</span>
                </li>
            `).join('');

            card.innerHTML = `
                <div class="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-purple-100 pb-4 md:pb-0 md:pr-6">
                    <h3 class="text-2xl font-black text-purple-900">${block.karigaarName}</h3>
                    <p class="text-sm text-purple-600 font-bold mb-3">📅 ${block.date} | ${block.sheetName}</p>
                    
                    <div class="bg-purple-50 p-3 rounded-lg border border-purple-100 mb-4 max-h-40 overflow-y-auto">
                        <p class="text-xs text-purple-800 uppercase font-bold tracking-wider mb-1">Stone Dimensions (${block.multiStones?.numberOfStones || 0} Stones)</p>
                        <ul class="text-sm font-medium text-gray-800 space-y-1">
                            ${block.multiStones?.stones.map((s, i) => `<li>Stone ${i+1}: ${s.l || 0} x ${s.w || 0} x ${s.h || 0}</li>`).join('') || '<li>No stones attached</li>'}
                        </ul>
                    </div>

                    <div class="flex justify-between items-center bg-gray-900 text-white p-3 rounded-lg">
                        <div>
                            <p class="text-xs text-gray-400 uppercase font-bold">Total Gun Feet</p>
                            <p class="text-xl font-bold text-purple-400">${totalGunFeet}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-xs text-gray-400 uppercase font-bold">Total SqFt</p>
                            <p class="text-xl font-bold text-green-400">${totalSqFt.toFixed(2)}</p>
                        </div>
                    </div>
                    
                    <button onclick="deleteCloudKarigaarBlock('${block._id}')" class="mt-4 w-full py-2 bg-red-50 text-red-600 hover:bg-red-100 font-bold rounded-lg text-sm transition-colors border border-red-200">Delete Record</button>
                </div>
                
                <div class="w-full md:w-2/3">
                    <h4 class="font-bold text-gray-800 mb-3 border-b pb-2">Cut Stones Inventory</h4>
                    ${block.products.length > 0 ? `<ul class="space-y-2 grid grid-cols-1 sm:grid-cols-2 gap-2">${stonesListHtml}</ul>` : `<p class="text-gray-500 italic text-sm">No stones recorded for this block.</p>`}
                </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        container.innerHTML = `<div class="text-center py-8 text-red-500 font-bold">❌ Cannot connect to backend server.</div>`;
    }
}

// 3. Delete a Karigaar record from Cloud
window.deleteCloudKarigaarBlock = async function(id) {
    if(confirm("Permanently delete this Karigaar record from the cloud?")) {
        try {
            const response = await fetch(`/api/karigaars/${id}`, { method: 'DELETE' });
            if (response.ok) {
                renderSavedKarigaarArchive(); // Refresh the list
            } else {
                alert("Failed to delete record.");
            }
        } catch (error) {
            alert("Server error.");
        }
    }
}

// Hook the render function to the Navigation Tab!
document.addEventListener('DOMContentLoaded', () => {
    const savedKarigaarTab = document.getElementById('savedKarigaarTab');
    if(savedKarigaarTab) {
        savedKarigaarTab.addEventListener('click', () => {
            renderSavedKarigaarArchive();
        });
    }
});

let stoneCounter = 0;

window.addNewStoneGroup = function() {
    stoneCounter++;
    const container = document.getElementById('dynamicStonesContainer');
    
    const stoneGroup = document.createElement('div');
    stoneGroup.className = 'stone-group bg-white p-3 rounded-lg border border-purple-200 shadow-sm relative';
    stoneGroup.id = `stone-group-${stoneCounter}`;
    
    stoneGroup.innerHTML = `
        <div class="flex justify-between items-center mb-3 border-b pb-2">
            <span class="font-bold text-gray-800 text-sm">Stone ${stoneCounter}</span>
            <div class="flex gap-2">
                <button type="button" onclick="addSubPart('${stoneGroup.id}')" class="text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-1 rounded border border-indigo-200 hover:bg-indigo-100 transition-colors">+ Add Part</button>
                <button type="button" onclick="removeStoneGroup('${stoneGroup.id}')" class="text-xs bg-red-50 text-red-600 font-bold px-2 py-1 rounded border border-red-200 hover:bg-red-100 transition-colors">Delete</button>
            </div>
        </div>
        
        <div class="sub-parts-container space-y-2">
            <div class="stone-row flex gap-2">
                <input type="number" class="stone-l w-full px-2 py-1 rounded border border-gray-300 focus:ring-purple-500" placeholder="L" oninput="calculateGunFeet()">
                <input type="number" class="stone-w w-full px-2 py-1 rounded border border-gray-300 focus:ring-purple-500" placeholder="W" oninput="calculateGunFeet()">
                <input type="number" class="stone-h w-full px-2 py-1 rounded border border-gray-300 focus:ring-purple-500" placeholder="H" oninput="calculateGunFeet()">
            </div>
        </div>
    `;
    
    container.appendChild(stoneGroup);
    calculateGunFeet();
}

window.addSubPart = function(groupId) {
    const group = document.getElementById(groupId);
    const partsContainer = group.querySelector('.sub-parts-container');
    
    const row = document.createElement('div');
    row.className = 'stone-row flex gap-2 relative items-center mt-2';
    row.innerHTML = `
        <span class="text-gray-400 font-bold text-lg mr-1 pl-1">↳</span>
        <input type="number" class="stone-l w-full px-2 py-1 rounded border border-gray-300 focus:ring-purple-500" placeholder="L" oninput="calculateGunFeet()">
        <input type="number" class="stone-w w-full px-2 py-1 rounded border border-gray-300 focus:ring-purple-500" placeholder="W" oninput="calculateGunFeet()">
        <input type="number" class="stone-h w-full px-2 py-1 rounded border border-gray-300 focus:ring-purple-500" placeholder="H" oninput="calculateGunFeet()">
        <button type="button" onclick="this.parentElement.remove(); calculateGunFeet();" class="text-red-500 hover:text-red-700 font-black px-2 ml-1 text-lg leading-none">&times;</button>
    `;
    
    partsContainer.appendChild(row);
}

window.removeStoneGroup = function(groupId) {
    const group = document.getElementById(groupId);
    if (group) {
        group.remove();
        calculateGunFeet();
    }
}