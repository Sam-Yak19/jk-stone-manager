// js/billing.js

let partyNames = [];

document.addEventListener('DOMContentLoaded', () => {

    // 5. WhatsApp Export Controls
    document.getElementById('copyBharaiBtn')?.addEventListener('click', () => copyToClipboard('bharai'));
    document.getElementById('copyBillBtn')?.addEventListener('click', () => copyToClipboard('bill'));
    // 1. Modal Controls
    document.getElementById('bharaiBtn')?.addEventListener('click', () => openModal('bharai'));
    document.getElementById('closeBharaiModal')?.addEventListener('click', () => document.getElementById('bharaiModal').classList.add('hidden'));

    document.getElementById('billBtn')?.addEventListener('click', () => openModal('bill'));
    document.getElementById('closeBillModal')?.addEventListener('click', () => document.getElementById('billModal').classList.add('hidden'));

    // 2. Print Controls
    document.getElementById('printBtn')?.addEventListener('click', () => window.print());
    document.getElementById('printBillBtn')?.addEventListener('click', () => window.print());
    // Database Save Control
    document.getElementById('saveBillBtn')?.addEventListener('click', () => window.saveFinalBill());

    // 3. Clear Application Data
    document.getElementById('startNewLoadBtn')?.addEventListener('click', () => {
        if (confirm("Are you sure you want to start a new truck load? (Your Karigaar work will NOT be affected.)")) {
            
            // Fix: Use the exact name from storage.js
            localStorage.removeItem('Truck Data');
            
            location.reload();
        }
    });

    // 4. Party Name Management
    loadPartyNames();
    
    document.getElementById('addPartyBtn')?.addEventListener('click', () => {
        const name = document.getElementById('newPartyName').value.trim();
        if (name && !partyNames.includes(name)) {
            partyNames.push(name);
            savePartyNames();
            renderPartySelector();
            document.getElementById('newPartyName').value = '';
            document.getElementById('partySelector').value = name;
        }
    });

    document.getElementById('removePartyBtn')?.addEventListener('click', () => {
        const selected = document.getElementById('partySelector').value;
        if (selected && confirm(`Remove party: ${selected}?`)) {
            partyNames = partyNames.filter(p => p !== selected);
            savePartyNames();
            renderPartySelector();
        }
    });
});

// --- CORE FUNCTIONS ---

window.renderFinalSummary = function() {
    const dimMap = new Map();
    // Assuming 'layers' is globally available from storage.js/truckLoader.js
    if (typeof layers !== 'undefined') {
        layers.forEach(layer => {
            layer.products.forEach(p => {
                const key = `${p.length}ft x ${p.width}ft (${p.category || 'Fresh'})`;
                dimMap.set(key, (dimMap.get(key) || 0) + p.quantity);
            });
        });
    }

    const container = document.getElementById('finalDimensionSummaryContainer');
    if (!container) return;

    let html = `<table class="min-w-full text-left"><thead class="bg-gray-50 border-b"><tr><th class="px-4 py-3">Dimensions</th><th class="px-4 py-3">Total Quantity</th></tr></thead><tbody class="bg-white">`;
    
    dimMap.forEach((qty, dim) => {
        html += `<tr class="border-b"><td class="px-4 py-3">${dim}</td><td class="px-4 py-3 font-bold text-indigo-600">${qty}</td></tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
};

function openModal(type) {
    const modal = document.getElementById(type === 'bharai' ? 'bharaiModal' : 'billModal');
    const tbody = document.getElementById(type === 'bharai' ? 'bharaiTableBody' : 'billTableBody');
    tbody.innerHTML = '';

    const dimMap = new Map();
    if (typeof layers !== 'undefined') {
        layers.forEach(layer => layer.products.forEach(p => {
            // STEP 1: Update the key to include the category
            const key = `${p.length}ft x ${p.width}ft (${p.category || 'Fresh'})`;
            
            dimMap.set(key, { 
                qty: (dimMap.get(key)?.qty || 0) + p.quantity,
                sqft: (dimMap.get(key)?.sqft || 0) + (p.length * p.width * p.quantity)
            });
        }));
    }

    dimMap.forEach((data, dim) => {
        const fn = type === 'bharai' ? 'calculateBharai()' : 'calculateBill()';
        tbody.innerHTML += `
            <tr class="border-b">
                <td class="px-4 py-3 font-medium">${dim}</td>
                <td class="px-4 py-3">${data.qty}</td>
                <td class="px-4 py-3 text-gray-600">${data.sqft.toFixed(2)}</td>
                <td class="px-4 py-3"><input type="number" data-sqft="${data.sqft}" oninput="${fn}" class="w-24 border border-gray-300 rounded px-2 py-1 text-right" placeholder="₹"></td>
                <td class="px-4 py-3 subtotal-cell font-bold text-gray-800">₹0.00</td>
            </tr>
        `;
    });

    if (type === 'bill') calculateBill();
    modal.classList.remove('hidden');
}   

// --- MATH CALCULATIONS ---

window.calculateBharai = function() {
    let total = 0;
    document.querySelectorAll('#bharaiTableBody input').forEach(input => {
        const sqft = parseFloat(input.dataset.sqft);
        const rate = parseFloat(input.value) || 0;
        const sub = sqft * rate;
        input.closest('tr').querySelector('.subtotal-cell').textContent = `₹${sub.toFixed(2)}`;
        total += sub;
    });
    document.getElementById('bharaiTotal').textContent = `₹${total.toFixed(2)}`;
    calculateBill(); 
};

// Show/Hide GST based on Bill Type
window.toggleGSTInputs = function() {
    const billType = document.getElementById('billTypeSelector').value;
    const gstGroup = document.getElementById('gstInputGroup');
    if (billType === 'pakka') {
        gstGroup.classList.remove('hidden');
    } else {
        gstGroup.classList.add('hidden');
    }
}

window.calculateBill = function() {
    let subtotal = 0;
    document.querySelectorAll('#billTableBody input').forEach(input => {
        const sqft = parseFloat(input.dataset.sqft);
        const rate = parseFloat(input.value) || 0;
        const sub = sqft * rate;
        input.closest('tr').querySelector('.subtotal-cell').textContent = `₹${sub.toFixed(2)}`;
        subtotal += sub;
    });
    
    // Grab the calculated Bharai and strip any text/symbols from it
    const bharaiText = document.getElementById('bharaiTotal')?.textContent || '₹0';
    const bharai = parseFloat(bharaiText.replace(/[^0-9.]/g, '')) || 0;
    
    const billType = document.getElementById('billTypeSelector')?.value || 'kacha';
    const isLocal = document.getElementById('saleLocation')?.value === 'local';
    const gstRate = parseFloat(document.getElementById('gstRateInput')?.value) || 0;
    
    // NEW: Get the custom taxable amount
    const taxableInput = document.getElementById('gstTaxableAmount');
    let taxableAmount = subtotal; // Default to taxing the full subtotal
    
    if (taxableInput && taxableInput.value !== "") {
        taxableAmount = parseFloat(taxableInput.value) || 0;
    } else if (taxableInput) {
        // Show the user what the full amount is in the background of the input
        taxableInput.placeholder = Math.round(subtotal);
    }
    
    let cgst = 0, sgst = 0, igst = 0;
    let breakdownHTML = '';

    // Calculate GST based ONLY on the Taxable Amount, not the full subtotal
    if (billType === 'pakka' && gstRate > 0) {
        if (isLocal) {
            cgst = taxableAmount * ((gstRate / 2) / 100);
            sgst = taxableAmount * ((gstRate / 2) / 100);
            breakdownHTML = `<span class="text-xs text-gray-400">Tax applied on: ₹${taxableAmount.toFixed(2)}</span><br>CGST (${gstRate/2}%): ₹${cgst.toFixed(2)} <br> SGST (${gstRate/2}%): ₹${sgst.toFixed(2)}`;
        } else {
            igst = taxableAmount * (gstRate / 100);
            breakdownHTML = `<span class="text-xs text-gray-400">Tax applied on: ₹${taxableAmount.toFixed(2)}</span><br>IGST (${gstRate}%): ₹${igst.toFixed(2)}`;
        }
    }

    const taxContainer = document.getElementById('taxBreakdown');
    if (taxContainer) taxContainer.innerHTML = breakdownHTML;

    // GRAND TOTAL: Stone Subtotal + Tax - Bharai Deduction
    let grandTotal = subtotal + cgst + sgst + igst - bharai;
    if (grandTotal < 0) grandTotal = 0; // Prevents the bill from showing a negative total

    // Update UI with calculated numbers
    document.getElementById('billSubtotal').textContent = `₹${subtotal.toFixed(2)}`;
    document.getElementById('billBharaiCharge').textContent = `-₹${bharai.toFixed(2)}`;
    document.getElementById('billGrandTotal').textContent = `₹${Math.round(grandTotal).toFixed(2)}`;
};

// --- PARTY DATA MANAGEMENT ---

function loadPartyNames() {
    const saved = localStorage.getItem('jkPartyNames');
    if (saved) partyNames = JSON.parse(saved);
    renderPartySelector();
}

function savePartyNames() {
    localStorage.setItem('jkPartyNames', JSON.stringify(partyNames));
}

function renderPartySelector() {
    const selector = document.getElementById('partySelector');
    if (!selector) return;
    selector.innerHTML = '';
    
    if (partyNames.length === 0) {
        selector.innerHTML = `<option disabled selected>No parties added</option>`;
    } else {
        partyNames.forEach(name => {
            selector.innerHTML += `<option value="${name}">${name}</option>`;
        });
    }
}
// --- EXPORT TO CLIPBOARD / WHATSAPP ---

function copyToClipboard(type) {
    const isBharai = type === 'bharai';
    const tbody = document.getElementById(isBharai ? 'bharaiTableBody' : 'billTableBody');
    const date = new Date().toLocaleDateString('en-IN');
    
    let textOutput = "";
    
    if (isBharai) {
        textOutput += `*Bharai Calculation* - ${date}\n`;
        textOutput += `------------------------\n`;
    } else {
        const party = document.getElementById('partySelector')?.value || "Cash";
        textOutput += `*Bill For: ${party}* - ${date}\n`;
        textOutput += `------------------------\n`;
    }

    textOutput += "Size | Qty | SqFt | Rate | Subtotal\n";
    textOutput += `------------------------\n`;
    
    // Grab all rows from the table
    tbody.querySelectorAll('tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        const size = cells[0].textContent.trim();
        const qty = cells[1].textContent.trim();
        const sqft = cells[2].textContent.trim();
        const rate = cells[3].querySelector('input').value || "0";
        const subtotal = cells[4].textContent.trim();
        
        textOutput += `${size} | ${qty} | ${sqft} | ₹${rate} | ${subtotal}\n`;
    });

    textOutput += `------------------------\n`;
    
    // Add the final totals
    if (isBharai) {
        const total = document.getElementById('bharaiTotal').textContent;
        textOutput += `*Total Labour Charge: ${total}*\n`;
    } else {
        const subtotal = document.getElementById('billSubtotal').textContent;
        const bharai = document.getElementById('billBharaiCharge').textContent;
        const grandTotal = document.getElementById('billGrandTotal').textContent;
        
        // Check for GST text if it exists
        const taxText = document.getElementById('taxBreakdown').innerText || "";
        
        textOutput += `Stone Subtotal: ${subtotal}\n`;
        textOutput += `Bharai Deducted: ${bharai}\n`; // Now correctly says Deducted
        
        if (taxText.trim() !== "") {
            // Clean up the HTML breaks in the tax string for plain text
            textOutput += `Taxes: ${taxText.replace(/\n/g, ' ')}\n`; 
        }
        
        textOutput += `------------------------\n`;
        textOutput += `*GRAND TOTAL: ${grandTotal}*\n`;
    }

    // Use the modern clipboard API
    navigator.clipboard.writeText(textOutput).then(() => {
        // Flash the success message
        const msgId = isBharai ? 'copyBharaiSuccessMsg' : 'copyBillSuccessMsg';
        const msgEl = document.getElementById(msgId);
        
        msgEl.classList.remove('opacity-0');
        setTimeout(() => {
            msgEl.classList.add('opacity-0');
        }, 2000);
    }).catch(err => {
        console.error("Could not copy text: ", err);
        alert("Failed to copy. Please check browser permissions.");
    });
}

async function finalizeBill() {
    const token = localStorage.getItem('jk_auth_token'); // Get their digital ID
    const billData = { /* gather your bill numbers here */ };

    const response = await fetch('/api/bills', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // Send the ID card to the server
        },
        body: JSON.stringify(billData)
    });
}

// ==========================================
// DATABASE SAVE FUNCTION
// ==========================================

window.saveFinalBill = async function() {
    // 1. Check if a party is selected
    const partyName = document.getElementById('partySelector')?.value;
    if (!partyName || partyName === 'No parties added') {
        alert('Please select a party name before saving the bill.');
        return;
    }

    // 2. Gather Bill Settings
    const billType = document.getElementById('billTypeSelector')?.value || 'kacha';
    const saleLocation = document.getElementById('saleLocation')?.value || 'local';

    // 3. Gather all stone items with their rates
    const items = [];
    document.querySelectorAll('#billTableBody tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        const size = cells[0].textContent.trim();
        const qty = parseInt(cells[1].textContent.trim());
        const sqft = parseFloat(cells[2].textContent.trim());
        const rate = parseFloat(cells[3].querySelector('input').value) || 0;
        const subtotal = parseFloat(cells[4].textContent.replace(/[^0-9.]/g, ''));

        // Only save items that actually have a rate applied
        if (qty > 0 && rate > 0) { 
            items.push({ size, qty, sqft, rate, subtotal });
        }
    });

    if (items.length === 0) {
        alert('Please enter rates for the stones before saving.');
        return;
    }

    // 4. Gather Totals
    const stoneSubtotal = document.getElementById('billSubtotal').textContent;
    const bharai = document.getElementById('billBharaiCharge').textContent;
    const taxDetails = document.getElementById('taxBreakdown').innerText || 'No Tax';
    const grandTotalText = document.getElementById('billGrandTotal').textContent;
    const grandTotal = parseFloat(grandTotalText.replace(/[^0-9.]/g, ''));

    // 5. Generate System Data (ID, Date, Month for Analytics)
    const timestamp = Date.now();
    const id = 'BILL-' + timestamp;
    const dateObj = new Date();
    const date = dateObj.toLocaleDateString('en-IN');
    const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`; // e.g., "2026-06"
    
    // Get the logged-in user's company ID (fallback to HQ if not found)
    const currentUser = JSON.parse(localStorage.getItem('jk_user')) || { companyId: 'JK_Stones_HQ' };

    // 6. Build the final payload to send to database
    const billData = {
        id, date, monthKey, timestamp,
        partyName, ownerId: currentUser.companyId,
        saleLocation, billType,
        items,
        stoneSubtotal, bharai, taxDetails, grandTotal,
        balance: grandTotal // Initially, balance is the full amount since it's unpaid
    };

    // 7. Send to the API
    try {
        const btn = document.getElementById('saveBillBtn');
        if(btn) btn.textContent = "Saving...";

        const response = await fetch('/api/bills', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(billData)
        });

        const result = await response.json();
        
        if (result.success) {
            alert('✅ Bill saved successfully to Database!');
            if(btn) btn.textContent = "Saved ✓";
            
            // Optional: You can auto-print here by calling window.print()
        } else {
            alert('❌ Failed to save bill: ' + result.message);
            if(btn) btn.textContent = "Save Bill";
        }
    } catch (error) {
        console.error('Error saving bill:', error);
        alert('Error connecting to the server. Check your internet connection.');
        if(btn) btn.textContent = "Save Bill";
    }
};