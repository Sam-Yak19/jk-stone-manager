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
            const cat = document.getElementById('productCategory').value; // NEW
            
            const noteText = document.getElementById('productNote').value.trim();
            const targetSelect = document.getElementById('targetLayerSelect');
            const currentLayerIndex = parseInt(targetSelect.value);
            
            layers[currentLayerIndex].products.push({ 
                id: Date.now(), 
                length: len, 
                width: wid, 
                quantity: qty,
                category: cat, // NEW
                note: noteText 
            });

            saveTruckData();
            renderLayers();
            const keepSection = document.getElementById('targetLayerSelect').value;
            addProductForm.reset(); 
            
            // NEW: Keep "Fresh" as default after reset
            document.getElementById('productCategory').value = "Fresh"; 
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
                            <span class="font-medium text-gray-700">${product.length}ft x ${product.width}ft <span class="text-xs font-bold text-indigo-500 ml-1">(${product.category || 'Fresh'})</span></span>
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
    // NEW: Function to instantly calculate SqFt and Section groupings individually
    function updateLiveSummary() {
        const sizeMap = new Map();
        const sectionMap = new Map(); // We now track by individual section, not pairs
        let grandTotalSqFt = 0;
        let grandTotalPieces = 0;

        layers.forEach((layer) => {
            // We use the exact name (e.g., "Sheet 1" or "Up 2") instead of finding a pair
            const sectionKey = layer.name; 

            if (!sectionMap.has(sectionKey)) {
                sectionMap.set(sectionKey, { pieces: 0, sqft: 0 });
            }

            layer.products.forEach(p => {
                const sqft = p.length * p.width * p.quantity;
                const sizeKey = `${p.length}ft x ${p.width}ft (${p.category || 'Fresh'})`;
                
                grandTotalSqFt += sqft;
                grandTotalPieces += p.quantity;
                
                // 1. Calculate Size Totals
                if (!sizeMap.has(sizeKey)) {
                    sizeMap.set(sizeKey, { pieces: 0, sqft: 0 });
                }
                const s = sizeMap.get(sizeKey);
                s.pieces += p.quantity;
                s.sqft += sqft;

                // 2. Calculate Individual Section Totals
                const sec = sectionMap.get(sectionKey);
                sec.pieces += p.quantity;
                sec.sqft += sqft;
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

        // 4. Draw Individual Section Summary on screen
        const pairTbody = document.getElementById('livePairSummaryBody'); // Keeping the ID the same so HTML doesn't break
        if (pairTbody) {
            pairTbody.innerHTML = '';
            if (sectionMap.size === 0) pairTbody.innerHTML = '<tr><td colspan="3" class="px-4 py-2 text-center text-gray-500">No sections added yet.</td></tr>';
            
            sectionMap.forEach((data, section) => {
                pairTbody.innerHTML += `
                    <tr>
                        <td class="px-4 py-2 font-medium text-gray-800">${section}</td>
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
    // ==========================================
    // TRUCK SESSION DATABASE (DRAFTS & ARCHIVE)
    // ==========================================

    let truckSessionArchive = [];

    // 1. Load existing saved trucks when app opens
    function loadTruckSessions() {
        const saved = localStorage.getItem('jkTruckSessions');
        if (saved) truckSessionArchive = JSON.parse(saved);
    }
    loadTruckSessions();

    function saveTruckSessions() {
        localStorage.setItem('jkTruckSessions', JSON.stringify(truckSessionArchive));
    }

    // 2. Save the active screen to the CLOUD database
    window.saveTruckSessionToDatabase = async function() {
        const dateInput = document.getElementById('truckSessionDate').value;
        const partyInput = document.getElementById('truckSessionParty').value.trim();

        if (!partyInput) {
            alert("Please enter a Party Name / Truck No. before saving!");
            return;
        }

        if (layers.length === 0 || layers.every(l => l.products.length === 0)) {
            alert("Cannot save an empty truck. Add some stones first!");
            return;
        }

        // Package the exact data structure our MongoDB schema expects
        const sessionData = {
            id: 'TRK-' + Date.now(),
            date: dateInput,
            party: partyInput,
            layersData: JSON.parse(JSON.stringify(layers)) 
        };

        try {
            // Change the button text so the user knows it's working over the internet
            const btn = document.querySelector('button[onclick="saveTruckSessionToDatabase()"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Saving to Cloud... ☁️';

            // 🚀 THE BRIDGE: Send the data to your Node.js Server!
            const response = await fetch('/api/dispatches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sessionData)
            });

            if (response.ok) {
                // Clear the active whiteboard screen
                layers = [];
                document.getElementById('truckSessionParty').value = '';
                saveTruckData();
                renderLayers();
                updateLayerDropdown();
                
                // Instantly jump to the Saved Trucks page to see it pull from the cloud
                document.getElementById('savedTrucksTab').click();
            } else {
                alert("Failed to save to cloud. Check terminal for errors.");
            }
            
            btn.innerHTML = originalText; // Reset button text
        } catch (error) {
            alert("Could not connect to backend server! Make sure 'node server.js' is running.");
        }
    };

    // 3. Fetch and Draw the Saved Trucks from MongoDB
    // 3. Fetch and Draw the Saved Trucks from MongoDB
    window.renderSavedTrucks = async function() {
        const container = document.getElementById('savedTrucksList');
        if (!container) return;
        
        container.innerHTML = '<div class="col-span-full text-center py-8 text-indigo-600 font-bold animate-pulse">☁️ Fetching live data from MongoDB...</div>';

        try {
            const response = await fetch('/api/dispatches');
            const result = await response.json();
            
            truckSessionArchive = result.data; 

            if (truckSessionArchive.length === 0) {
                container.innerHTML = `<div class="col-span-full text-center py-8 text-gray-500 italic">No saved trucks found in the cloud database.</div>`;
                return;
            }

            container.innerHTML = '';
            truckSessionArchive.forEach(session => {
                let tSqft = 0;
                let tPieces = 0;
                session.layersData.forEach(l => {
                    l.products.forEach(p => {
                        tSqft += (p.length * p.width * p.quantity);
                        tPieces += p.quantity;
                    });
                });

                const card = document.createElement('div');
                card.className = 'border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow bg-gray-50 flex flex-col justify-between';
                card.innerHTML = `
                    <div>
                        <h3 class="font-bold text-xl text-gray-900 mb-1">${session.party}</h3>
                        <p class="text-sm text-indigo-600 font-semibold mb-3">📅 ${session.date}</p>
                        <div class="flex justify-between text-sm text-gray-600 mb-4 bg-white p-2 rounded border border-gray-100">
                            <span>Total: <span class="font-bold text-gray-800">${tPieces} pcs</span></span>
                            <span>Area: <span class="font-bold text-gray-800">${tSqft.toFixed(2)} ft²</span></span>
                        </div>
                    </div>
                    <div class="flex justify-end gap-2 border-t pt-3 mt-2">
                        <button onclick="viewTruckSummary('${session.id}')" class="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 font-bold rounded text-sm transition-colors shadow-sm">Summary</button>
                        <button onclick="resumeTruckSession('${session.id}')" class="px-3 py-1 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-bold rounded text-sm transition-colors shadow-sm">Resume</button>
                        <button onclick="deleteTruckSession('${session.id}')" class="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 font-bold rounded text-sm transition-colors shadow-sm">Delete</button>
                    </div>
                `;
                container.appendChild(card);
            });
        } catch(error) {
            container.innerHTML = `<div class="col-span-full text-center py-8 text-red-500 font-bold">❌ Cannot connect to backend server. Is server.js running?</div>`;
        }
    };

    // NEW: Function to open the detailed Truck Summary Modal
    window.viewTruckSummary = function(id) {
        const session = truckSessionArchive.find(s => s.id === id);
        if (!session) return;

        // 1. Fill in Header Info
        document.getElementById('summaryTruckDate').innerText = session.date;
        document.getElementById('summaryTruckParty').innerText = session.party;

        let totalSqft = 0;
        let totalPieces = 0;
        let layersHtml = '';

        // 2. Build the exact breakdown of Sheets and Ups
        session.layersData.forEach(layer => {
            let layerPieces = 0;
            let layerSqft = 0;
            
            let itemsHtml = layer.products.map(p => {
                const sqft = p.length * p.width * p.quantity;
                layerPieces += p.quantity;
                layerSqft += sqft;
                
                return `
                    <li class="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-200 text-sm">
                        <span class="font-medium text-gray-700">${p.length}ft x ${p.width}ft <span class="text-xs font-bold text-indigo-500 ml-1">(${p.category || 'Fresh'})</span></span>
                        <span class="font-bold text-indigo-600">${p.quantity} pcs</span>
                        <span class="text-gray-600 font-semibold">${sqft.toFixed(2)} ft²</span>
                    </li>
                `;
            }).join('');

            totalPieces += layerPieces;
            totalSqft += layerSqft;

            layersHtml += `
                <div class="bg-white p-4 rounded-lg border border-gray-300 shadow-sm">
                    <div class="flex justify-between items-center border-b pb-2 mb-2">
                        <h4 class="font-bold text-lg text-gray-800">${layer.name}</h4>
                        <span class="text-xs font-bold bg-indigo-100 text-indigo-800 px-2 py-1 rounded border border-indigo-200">${layerPieces} pcs | ${layerSqft.toFixed(2)} ft²</span>
                    </div>
                    ${layer.products.length > 0 ? `<ul class="space-y-2">${itemsHtml}</ul>` : `<p class="text-gray-500 italic text-sm">No stones added.</p>`}
                </div>
            `;
        });

        // 3. Fill in Grand Totals
        document.getElementById('summaryTruckPieces').innerText = totalPieces;
        document.getElementById('summaryTruckArea').innerText = totalSqft.toFixed(2);
        
        // 4. Inject the HTML and Show Modal
        document.getElementById('summaryTruckLayers').innerHTML = layersHtml;
        document.getElementById('truckSummaryModal').classList.remove('hidden');
    };

    // 4. Pull a saved truck back onto the active screen
    window.resumeTruckSession = function(id) {
        if (layers.length > 0 && !layers.every(l => l.products.length === 0)) {
            if(!confirm("Warning: You have active stones on the screen. Resuming a saved truck will overwrite your current screen. Proceed?")) return;
        }

        const session = truckSessionArchive.find(s => s.id === id);
        if (session) {
            // Load data back to the active screen variables
            layers = JSON.parse(JSON.stringify(session.layersData));
            document.getElementById('truckSessionDate').value = session.date;
            document.getElementById('truckSessionParty').value = session.party;
            
            saveTruckData();
            renderLayers();
            updateLayerDropdown();
            
            // Remove it from the archive (since it is now active again)
            truckSessionArchive = truckSessionArchive.filter(s => s.id !== id);
            saveTruckSessions();
            
            // Jump back to the active loading screen
            document.getElementById('truckLoaderTab').click();
        }
    };

    // 4. Delete a truck from the Cloud Database
    window.deleteTruckSession = async function(id) {
        if(confirm("Are you sure you want to permanently delete this saved truck sheet from the cloud?")) {
            try {
                // 🚀 THE BRIDGE: Send a DELETE request to your Node.js Server
                const response = await fetch(`/api/dispatches/${id}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    // If the cloud successfully deleted it, refresh the screen to show it's gone
                    renderSavedTrucks(); 
                } else {
                    alert("Failed to delete from cloud. Check terminal for errors.");
                }
            } catch (error) {
                alert("Could not connect to backend server! Make sure 'node server.js' is running.");
            }
        }
    };

    // Start a brand new truck from the Saved Trucks page
    window.startBrandNewTruck = function() {
        if (confirm("Start a brand new truck? This will clear the active Loading screen only.")) {
            
            // Fix: Use the exact name from storage.js
            localStorage.removeItem('Truck Data'); 
            
            location.reload();
        }
    };

    
    // 5. Make the new Navigation Tab work
    document.addEventListener('DOMContentLoaded', () => {
        const savedTrucksTab = document.getElementById('savedTrucksTab');
        const savedTrucksPage = document.getElementById('savedTrucksPage');
        const truckLoaderPage = document.getElementById('truckLoaderPage');
        const mainTab = document.getElementById('truckLoaderTab');
        
        // A safe list of all pages in your app to easily hide them
        const allPageIds = ['truckLoaderPage', 'savedTrucksPage', 'karigaarPage', 'summaryPage', 'billBookPage', 'ledgerPage', 'analyticsPage', 'mineTruckPage'];

        if (savedTrucksTab) {
            savedTrucksTab.addEventListener('click', () => {
                // Safely hide all pages
                allPageIds.forEach(id => {
                    const page = document.getElementById(id);
                    if (page) page.classList.add('hidden');
                });
                
                // Show ONLY the Saved Trucks page
                if (savedTrucksPage) savedTrucksPage.classList.remove('hidden');
                
                // Style the tabs
                document.querySelectorAll('nav button').forEach(btn => {
                    btn.classList.remove('border-blue-500', 'text-blue-500', 'border-indigo-600', 'text-indigo-600');
                    btn.classList.add('border-transparent', 'text-gray-500');
                });
                savedTrucksTab.classList.remove('border-transparent', 'text-gray-500');
                savedTrucksTab.classList.add('border-blue-500', 'text-blue-500');
                
                // Refresh the data list
                renderSavedTrucks();
            });
        }

        if(mainTab) {
            mainTab.addEventListener('click', () => {
                // Safely hide all pages
                allPageIds.forEach(id => {
                    const page = document.getElementById(id);
                    if (page) page.classList.add('hidden');
                });
                
                // Show ONLY the Active Truck Loader page
                if(truckLoaderPage) truckLoaderPage.classList.remove('hidden');

                // Style the tabs
                document.querySelectorAll('nav button').forEach(btn => {
                    btn.classList.remove('border-blue-500', 'text-blue-500', 'border-indigo-600', 'text-indigo-600');
                    btn.classList.add('border-transparent', 'text-gray-500');
                });
                mainTab.classList.remove('border-transparent', 'text-gray-500');
                mainTab.classList.add('border-indigo-600', 'text-indigo-600');
            });
        }
    });