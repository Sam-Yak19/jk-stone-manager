// js/truckLoader.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Load data from storage.js when page opens
    loadTruckData(); 
    renderLayers();
    updateLayerDropdown(); // NEW: Fill the dropdown on page load

    const addProductForm = document.getElementById('addProductForm');
    const addNewLayerBtn = document.getElementById('addNewLayerBtn');

    // 2. Handle adding a new stone size
    addProductForm.addEventListener('submit', (e) => {
        e.preventDefault(); 
        
        const qty = parseInt(document.getElementById('productQuantity').value);
        const len = parseFloat(document.getElementById('productLength').value);
        const wid = parseFloat(document.getElementById('productWidth').value);
        
        // NEW: Grab the index from the dropdown instead of forcing the last item
        const noteText = document.getElementById('productNote').value.trim();
        const targetSelect = document.getElementById('targetLayerSelect');
        const currentLayerIndex = parseInt(targetSelect.value);
        
        layers[currentLayerIndex].products.push({ 
            id: Date.now(), 
            length: len, 
            width: wid, 
            quantity: qty,
            note: noteText 
        });

        saveTruckData();
        renderLayers();
        // NEW: Remember the currently selected section
        const keepSection = document.getElementById('targetLayerSelect').value;
        
        // Clear the form (this blanks out the numbers, but resets the dropdown)
        addProductForm.reset(); 
        
        // NEW: Put the dropdown back to the section you were working on
        document.getElementById('targetLayerSelect').value = keepSection;
    });

    // 3. Handle clicking "Start Next Sheet / Up"
    addNewLayerBtn.addEventListener('click', () => {
        const isSheet = layers.length % 2 === 0;
        const number = Math.floor(layers.length / 2) + 1;
        const newName = isSheet ? `Sheet ${number}` : `Up ${number}`;

        layers.push({ name: newName, products: [] });
        saveTruckData();
        renderLayers();
        updateLayerDropdown(); // NEW: Refresh dropdown when new section is added
    });
});

// NEW: Function to keep the dropdown menu updated
function updateLayerDropdown() {
    const select = document.getElementById('targetLayerSelect');
    select.innerHTML = ''; // Clear old options
    
    layers.forEach((layer, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = layer.name;
        select.appendChild(option);
    });
    
    // Automatically select the newest section when a new one is created
    select.value = layers.length - 1;
}

// 4. Function to draw the data on the screen
// Function to draw the data on the screen in Ascending Order (Sheet 1 at the top)
function renderLayers() {
    const container = document.getElementById('layersContainer');
    if (!container) return;
    container.innerHTML = ''; 

    // Loop through layers in their natural ascending order (0, 1, 2...)
    layers.forEach((layer, index) => {
        const layerDiv = document.createElement('div');
        layerDiv.className = 'bg-white p-6 rounded-2xl shadow-lg new-item';
        
        let html = `<div class="flex justify-between items-center w-full">
                    <h3 class="text-xl font-bold text-gray-800">${layer.name}</h3>
                    <button onclick="removeTruckSection(${index})" class="bg-red-100 text-red-700 hover:bg-red-200 hover:text-red-900 px-3 py-1 rounded-md text-xs font-extrabold shadow-sm transition-colors uppercase tracking-wide">Delete</button>
                    </div>`;
        
        if (layer.products.length === 0) {
            html += `<p class="text-gray-500 italic py-2">No stones added yet.</p>`;
        } else {
            html += `<ul class="space-y-3">`;
            layer.products.forEach(product => {
                html += `
                <li class="bg-gray-50 p-3 rounded-md">
                    <div class="flex justify-between items-center">
                        <span class="font-medium text-gray-700">${product.length}ft x ${product.width}ft</span>
                        <span class="font-bold text-indigo-600">${product.quantity} pieces</span>
                        <button onclick="removeProduct(${index}, ${product.id})" class="text-red-500 hover:text-red-700 text-sm font-semibold">Remove</button>
                    </div>
                    
                    ${product.note ? `<p class="text-sm text-gray-600 mt-2 italic border-t border-gray-200 pt-2">📝 Note: ${product.note}</p>` : ''}
                </li>`;
            });
            html += `</ul>`;
        }
        
        layerDiv.innerHTML = html;
        container.appendChild(layerDiv);
    });

    // Call our live dashboard updater instantly
    if (typeof updateLiveSummary === 'function') {
        updateLiveSummary();
    }
}

// 5. Function to delete a mistake
window.removeProduct = function(layerIndex, productId) {
    layers[layerIndex].products = layers[layerIndex].products.filter(p => p.id !== productId);
    saveTruckData();
    renderLayers();
}

// Add this to the absolute bottom of js/truckLoader.js
window.showSummaryPage = function() {
    document.getElementById('truckLoaderPage').classList.add('hidden');
    document.getElementById('karigaarPage').classList.add('hidden');
    document.getElementById('summaryPage').classList.remove('hidden');
    
    // Tell the billing script to gather the data
    if (typeof renderFinalSummary === 'function') renderFinalSummary();
};

// NEW: Function to instantly calculate SqFt and Pair groupings
function updateLiveSummary() {
    const sizeMap = new Map();
    const pairMap = new Map();
    let grandTotalSqFt = 0;
    let grandTotalPieces = 0;

    layers.forEach((layer) => {
        // Find the number in the name (e.g., gets "1" from "Sheet 1" or "Up 1")
        const match = layer.name.match(/\d+/);
        const pairNumber = match ? match[0] : "Unknown";
        const pairKey = `Pair ${pairNumber} (Sheet ${pairNumber} + Up ${pairNumber})`;

        // Set up empty counters if this is the first time we see this pair
        if (!pairMap.has(pairKey)) {
            pairMap.set(pairKey, { pieces: 0, sqft: 0 });
        }

        layer.products.forEach(p => {
            const sqft = p.length * p.width * p.quantity;
            const sizeKey = `${p.length}ft x ${p.width}ft`;
            
            grandTotalSqFt += sqft;
            grandTotalPieces += p.quantity;
            // 1. Calculate Size Totals
            if (!sizeMap.has(sizeKey)) {
                sizeMap.set(sizeKey, { pieces: 0, sqft: 0 });
            }
            const s = sizeMap.get(sizeKey);
            s.pieces += p.quantity;
            s.sqft += sqft;

            // 2. Calculate Combined Pair Totals
            const pr = pairMap.get(pairKey);
            pr.pieces += p.quantity;
            pr.sqft += sqft;
        });
    });

    const grandTotalEl = document.getElementById('liveGrandTotalSqFt');
    if (grandTotalEl) {
        grandTotalEl.innerHTML = `${grandTotalSqFt.toFixed(2)} <span class="text-lg font-medium text-indigo-700">ft²</span>`;
    }

    const grandTotalPiecesEl = document.getElementById('liveGrandTotalPieces');
    if (grandTotalPiecesEl) {
        grandTotalPiecesEl.textContent = grandTotalPieces;
    }
    // 3. Draw Size Summary on screen
    const sizeTbody = document.getElementById('liveSizeSummaryBody');
    if (sizeTbody) {
        sizeTbody.innerHTML = '';
        if (sizeMap.size === 0) sizeTbody.innerHTML = '<tr><td colspan="3" class="px-4 py-2 text-center text-gray-500">No stones added yet.</td></tr>';
        
        sizeMap.forEach((data, size) => {
            sizeTbody.innerHTML += `
                <tr>
                    <td class="px-4 py-2 font-medium text-gray-800">${size}</td>
                    <td class="px-4 py-2 text-center text-indigo-600 font-bold">${data.pieces}</td>
                    <td class="px-4 py-2 text-right text-gray-600">${data.sqft.toFixed(2)}</td>
                </tr>
            `;
        });
    }

    // 4. Draw Pair Summary on screen
    const pairTbody = document.getElementById('livePairSummaryBody');
    if (pairTbody) {
        pairTbody.innerHTML = '';
        if (pairMap.size === 0) pairTbody.innerHTML = '<tr><td colspan="3" class="px-4 py-2 text-center text-gray-500">No pairs added yet.</td></tr>';
        
        pairMap.forEach((data, pair) => {
            pairTbody.innerHTML += `
                <tr>
                    <td class="px-4 py-2 font-medium text-gray-800">${pair}</td>
                    <td class="px-4 py-2 text-center text-green-600 font-bold">${data.pieces}</td>
                    <td class="px-4 py-2 text-right text-gray-600">${data.sqft.toFixed(2)}</td>
                </tr>
            `;
        });
    }
}

// --- DELETE ENTIRE TRUCK SECTION ---
// --- DELETE ENTIRE TRUCK SECTION ---
window.removeTruckSection = function(sectionIndex) {
    // 1. Safety confirmation
    if (confirm("Are you sure you want to delete this entire section? All stones inside it will be permanently lost.")) {
        
        // 2. Remove the specific sheet/up from the CORRECT array ('layers')
        layers.splice(sectionIndex, 1);
        
        // 3. Rename the remaining sections to keep the "Sheet 1, Up 1, Sheet 2, Up 2" pattern perfect
        layers.forEach((section, index) => {
            const number = Math.floor(index / 2) + 1;
            const type = index % 2 === 0 ? 'Sheet' : 'Up';
            section.name = `${type} ${number}`;
        });
        
        // 4. Save and refresh the screen using your exact function names
        saveTruckData();   
        renderLayers();  
        updateLayerDropdown(); // Refresh the dropdown so the deleted sheet disappears from there too
        
        // 5. Reset the Target Section dropdown using your exact ID
        const sectionSelector = document.getElementById('targetLayerSelect');
        if (sectionSelector) {
            if (layers.length > 0) {
                sectionSelector.value = "0"; 
            }
        }
    }
}