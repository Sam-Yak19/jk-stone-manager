// js/mineTrucks.js

let mineTruckArchive = [];
let mineLedgerMetadata = JSON.parse(localStorage.getItem('jk_mine_ledger')) || { payments: {} };

function saveMineLedgerMetadata() {
    localStorage.setItem('jk_mine_ledger', JSON.stringify(mineLedgerMetadata));
}

function loadMineTruckArchive() {
    const saved = localStorage.getItem('jkMineTruckArchive');
    if (saved) mineTruckArchive = JSON.parse(saved);
}

function saveMineTruckArchive() {
    localStorage.setItem('jkMineTruckArchive', JSON.stringify(mineTruckArchive));
}

document.addEventListener('DOMContentLoaded', () => {
    const mineTruckTab = document.getElementById('mineTruckTab');
    const mineTruckPage = document.getElementById('mineTruckPage');
    
    // Set default date
    const dateInput = document.getElementById('mineDate');
    if(dateInput) dateInput.valueAsDate = new Date();
    
    // Load Database
    loadMineTruckArchive();

    // 1. Tab Navigation Logic
    if (mineTruckTab) {
        mineTruckTab.addEventListener('click', () => {
            const pages = ['truckLoaderPage', 'karigaarPage', 'summaryPage', 'billBookPage', 'ledgerPage', 'analyticsPage', 'savedTrucksPage'];
            pages.forEach(p => {
                const el = document.getElementById(p);
                if(el) el.classList.add('hidden');
            });
            
            mineTruckPage.classList.remove('hidden');
            mineTruckTab.classList.add('border-cyan-600', 'text-cyan-600');
            mineTruckTab.classList.remove('border-transparent', 'text-gray-500');
            
            refreshMineLedgerParties();
        });
    }

    // 2. Form Submission (Saving a Truck)
    const addForm = document.getElementById('addMineTruckForm');
    if (addForm) {
        addForm.addEventListener('submit', (e) => {
            e.preventDefault(); // STOP THE PAGE RELOAD

            const dateInput = document.getElementById('mineDate').value;
            const party = document.getElementById('mineParty').value.trim();
            const stones = parseInt(document.getElementById('mineStones').value);
            const sqft = parseFloat(document.getElementById('mineSqFt').value);
            const rate = parseFloat(document.getElementById('mineRate').value);
            const notesElement = document.getElementById('mineNotes');
            const notes = notesElement ? notesElement.value.trim() : "";

            if (!party || isNaN(sqft) || isNaN(rate)) {
                alert("Please fill all required fields correctly.");
                return;
            }

            const cost = sqft * rate; 
            const dateObj = new Date(dateInput);
            const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
            
            const newEntry = {
                id: `MINE-${Date.now()}`,
                date: dateObj.toLocaleDateString('en-IN'),
                monthKey: monthKey,
                timestamp: dateObj.getTime(),
                party: party,
                stones: stones,
                sqft: sqft,
                rate: rate,
                cost: cost,
                notes: notes
            };

            mineTruckArchive.push(newEntry);
            saveMineTruckArchive();
            
            // Reset form
            document.getElementById('mineStones').value = '';
            document.getElementById('mineSqFt').value = '';
            document.getElementById('mineRate').value = '';
            if(notesElement) notesElement.value = '';
            
            const costDisplay = document.getElementById('displayMineCost');
            if(costDisplay) costDisplay.textContent = '₹0.00';
            
            alert(`Successfully saved truck for ${party}!`);
            
            // Select this party automatically in the ledger dropdown so they can see the update instantly
            const selector = document.getElementById('mineLedgerPartySelector');
            if(selector) {
                refreshMineLedgerParties(); 
                selector.value = party;
                renderMineLedger(party);
            }
        });
    }
});

// --- LIVE MATH CALCULATOR ---
window.calculateMineTruckCost = function() {
    const sqft = parseFloat(document.getElementById('mineSqFt').value) || 0;
    const rate = parseFloat(document.getElementById('mineRate').value) || 0;
    const totalCost = sqft * rate;
    
    const display = document.getElementById('displayMineCost');
    if (display) {
        display.textContent = `₹${totalCost.toFixed(2)}`;
    }
}

// --- MINE LEDGER FUNCTIONS ---

window.refreshMineLedgerParties = function() {
    const selector = document.getElementById('mineLedgerPartySelector');
    if (!selector) return;

    // Get unique parties from both trucks and advance payments
    let parties = new Set(mineTruckArchive.map(t => t.party));
    Object.keys(mineLedgerMetadata.payments).forEach(p => parties.add(p));
    parties = [...parties];

    const current = selector.value;
    
    selector.innerHTML = '<option value="">-- Select Mine Owner --</option>';
    parties.sort().forEach(p => {
        selector.innerHTML += `<option value="${p}">${p}</option>`;
    });
    
    if (parties.includes(current)) {
        selector.value = current;
        renderMineLedger(current);
    } else {
        const list = document.getElementById('mineLedgerList');
        if(list) list.innerHTML = '<div class="text-center py-6 text-gray-500 italic">Select a mine owner to view ledger.</div>';
    }
}

window.renderMineLedger = function(partyName) {
    if (!partyName) {
        document.getElementById('mineLedgerList').innerHTML = '<div class="text-center py-6 text-gray-500 italic">Select a mine owner to view ledger.</div>';
        return;
    }

    const payDateInput = document.getElementById('minePayDate');
    if(payDateInput && !payDateInput.value) {
        payDateInput.valueAsDate = new Date();
    }

    const trucks = mineTruckArchive.filter(t => t.party === partyName);
    const payments = mineLedgerMetadata.payments[partyName] || [];
    
    let transactions = [];

    // Trucks = Charges (Debt we owe the mine owner)
    trucks.forEach(t => {
        transactions.push({
            dateStr: t.date,
            timestamp: t.timestamp,
            type: `Truck: ${t.stones} Pcs (${t.sqft} sqft @ ₹${t.rate})`, 
            charge: t.cost || 0,
            credit: 0
        });
    });

    // Payments = Credits (Advance/Deposit we gave them)
    payments.forEach(p => {
        transactions.push({
            dateStr: new Date(p.timestamp).toLocaleDateString('en-IN'),
            timestamp: p.timestamp,
            type: `Payment Sent (${p.method})`,
            charge: 0,
            credit: p.amount
        });
    });

    transactions.sort((a, b) => a.timestamp - b.timestamp);

    let runningBalance = 0;
    let html = `
        <table class="min-w-full text-left border-collapse border border-gray-200">
            <thead class="bg-gray-800 text-white">
                <tr>
                    <th class="px-4 py-2 text-sm">Date</th>
                    <th class="px-4 py-2 text-sm">Details</th>
                    <th class="px-4 py-2 text-sm text-right">Bill Amt (₹)</th>
                    <th class="px-4 py-2 text-sm text-right">Paid (₹)</th>
                    <th class="px-4 py-2 text-sm text-right">Balance Due</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
    `;

    transactions.forEach(tx => {
        runningBalance += tx.charge; // Cost adds to what we owe
        runningBalance -= tx.credit; // Payment subtracts from what we owe

        html += `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-2 text-sm text-gray-600">${tx.dateStr}</td>
                <td class="px-4 py-2 text-sm font-medium text-gray-900">${tx.type}</td>
                <td class="px-4 py-2 text-sm text-right font-semibold text-red-600">${tx.charge > 0 ? tx.charge.toFixed(2) : '-'}</td>
                <td class="px-4 py-2 text-sm text-right font-semibold text-emerald-600">${tx.credit > 0 ? tx.credit.toFixed(2) : '-'}</td>
                <td class="px-4 py-2 text-sm text-right font-bold ${runningBalance > 0 ? 'text-red-600' : 'text-emerald-600'}">
                    ₹${Math.abs(runningBalance).toFixed(2)} ${runningBalance > 0 ? 'To Pay' : 'Adv'}
                </td>
            </tr>
        `;
    });

    html += `
            <tfoot class="bg-gray-100 border-t-2 border-gray-300">
                <tr>
                    <td colspan="4" class="px-4 py-3 text-right font-bold text-gray-700">NET BALANCE:</td>
                    <td class="px-4 py-3 text-right font-bold text-lg ${runningBalance > 0 ? 'text-red-600' : 'text-emerald-600'}">
                        ₹${Math.abs(runningBalance).toFixed(2)} ${runningBalance > 0 ? 'To Pay' : 'Adv'}
                    </td>
                </tr>
            </tfoot>
        </tbody></table>`;
    document.getElementById('mineLedgerList').innerHTML = html;
}

window.recordMinePayment = function() {
    const partyName = document.getElementById('mineLedgerPartySelector').value;
    if (!partyName) {
        // Allow creating a brand new deposit even if they aren't in the dropdown yet
        const newParty = prompt("Enter the name of the new Mine Owner you are depositing money to:");
        if(!newParty || newParty.trim() === "") return;
        
        processPayment(newParty.trim());
    } else {
        processPayment(partyName);
    }
}

function processPayment(partyName) {
    const dateInput = document.getElementById('minePayDate').value;
    const method = document.getElementById('minePayMethod').value;
    const amount = parseFloat(document.getElementById('minePayAmount').value);

    if (isNaN(amount) || amount <= 0) return alert("Enter valid payment amount.");

    if (!mineLedgerMetadata.payments[partyName]) {
        mineLedgerMetadata.payments[partyName] = [];
    }

    mineLedgerMetadata.payments[partyName].push({
        id: `MPAY-${Date.now()}`,
        timestamp: new Date(dateInput).getTime(),
        amount: amount,
        method: method
    });

    saveMineLedgerMetadata();
    document.getElementById('minePayAmount').value = '';
    
    refreshMineLedgerParties();
    
    // Auto-select the party we just paid
    document.getElementById('mineLedgerPartySelector').value = partyName;
    renderMineLedger(partyName); 
}