// js/ledger.js

// --- 1. LEDGER STATE MANAGEMENT ---
// We need a new storage object for Opening Balances and standalone Payments
let ledgerMetadata = JSON.parse(localStorage.getItem('jk_ledger_metadata')) || {
    openingBalances: {}, 
    payments: {}         
};

function saveLedgerMetadata() {
    localStorage.setItem('jk_ledger_metadata', JSON.stringify(ledgerMetadata));
}

document.addEventListener('DOMContentLoaded', () => {
    const ledgerTab = document.getElementById('ledgerTab');
    const ledgerPage = document.getElementById('ledgerPage');
    const ledgerPartySelector = document.getElementById('ledgerPartySelector');
    
    // Tab Navigation
    if (ledgerTab) {
        ledgerTab.addEventListener('click', () => {
            document.getElementById('truckLoaderPage').classList.add('hidden');
            document.getElementById('karigaarPage').classList.add('hidden');
            document.getElementById('summaryPage').classList.add('hidden');
            document.getElementById('billBookPage').classList.add('hidden');
            
            ledgerPage.classList.remove('hidden');
            
            ledgerTab.classList.add('border-emerald-600', 'text-emerald-600');
            ledgerTab.classList.remove('border-transparent', 'text-gray-500');
            
            document.getElementById('truckLoaderTab').classList.remove('border-indigo-600', 'text-indigo-600');
            document.getElementById('karigaarTab').classList.remove('border-purple-500', 'text-purple-500');
            document.getElementById('billBookTab').classList.remove('border-orange-500', 'text-orange-500');
            
            refreshLedgerPartyList();
        });
    }

    // Party Selection Change
    ledgerPartySelector?.addEventListener('change', (e) => {
        renderPartyLedger(e.target.value);
    });
});

// --- 2. CORE LEDGER FUNCTIONS ---

function refreshLedgerPartyList() {
    const selector = document.getElementById('ledgerPartySelector');
    if (!selector) return;

    // Combine parties from Bills AND parties from opening balances to ensure no one is missed
    let partiesWithHistory = new Set(billArchive.map(bill => bill.partyName));
    Object.keys(ledgerMetadata.openingBalances).forEach(p => partiesWithHistory.add(p));
    
    partiesWithHistory = [...partiesWithHistory];
    
    const currentSelection = selector.value;
    
    selector.innerHTML = '<option value="">-- Choose a Party --</option>';
    partiesWithHistory.sort().forEach(party => {
        selector.innerHTML += `<option value="${party}">${party}</option>`;
    });

    if (partiesWithHistory.includes(currentSelection)) {
        selector.value = currentSelection;
        renderPartyLedger(currentSelection);
    } else {
        document.getElementById('ledgerSummaryStats')?.classList.add('hidden');
        document.getElementById('ledgerBillsList').innerHTML = '<div class="text-center py-10 text-gray-500 italic">Select a party above to view their Credit Book.</div>';
    }
}

function renderPartyLedger(partyName) {
    if (!partyName) {
        document.getElementById('ledgerBillsList').innerHTML = '<div class="text-center py-10 text-gray-500 italic">Select a party above to view their Credit Book.</div>';
        return;
    }

    // Hide old summary stats if they exist in HTML
    document.getElementById('ledgerSummaryStats')?.classList.add('hidden');

    const container = document.getElementById('ledgerBillsList');
    
    // Fetch data
    const partyBills = billArchive.filter(bill => bill.partyName === partyName);
    const openingBalance = ledgerMetadata.openingBalances[partyName] || 0;
    const partyPayments = ledgerMetadata.payments[partyName] || [];

    // --- COMPILE TRANSACTIONS CHRONOLOGICALLY ---
    let transactions = [];

    // 1. Add Bills (Debits / Dues)
    partyBills.forEach(bill => {
        transactions.push({
            dateStr: bill.date,
            timestamp: bill.timestamp || new Date().getTime(), // Fallback if missing
            type: `Bill #${bill.id.split('-')[1] || 'Auto'}`,
            badge: bill.billType === 'pakka' ? 'PAKKA' : 'KACHA',
            charge: bill.grandTotal, // Bill amount added to dues
            credit: 0
        });
    });

    // 2. Add Payments (Credits)
    partyPayments.forEach(pay => {
        transactions.push({
            id: pay.id, // <-- Added this!
            dateStr: new Date(pay.timestamp).toLocaleDateString('en-IN'),
            timestamp: pay.timestamp,
            type: `Payment Received`,
            badge: pay.method, 
            charge: 0,
            credit: pay.amount 
        });
    });

    // Sort by oldest first to calculate running balance accurately
    transactions.sort((a, b) => a.timestamp - b.timestamp);

    // --- RENDER UI ---
    
    // Top Controls (Opening Balance & Add Payment)
    let html = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div class="bg-amber-50 p-4 border border-amber-200 rounded-lg shadow-sm">
                <h3 class="text-sm font-bold text-amber-800 mb-2">Previous Old Dues (Opening Balance)</h3>
                <div class="flex gap-2">
                    <span class="bg-white border border-gray-300 rounded-l px-3 py-2 text-gray-600">₹</span>
                    <input type="number" id="openingBalInput" value="${openingBalance}" class="w-full border border-gray-300 px-3 py-2 rounded-r focus:outline-none focus:border-amber-500">
                    <button onclick="saveOpeningBalance('${partyName}')" class="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded font-bold transition">Save</button>
                </div>
            </div>

            <div class="bg-emerald-50 p-4 border border-emerald-200 rounded-lg shadow-sm">
                <h3 class="text-sm font-bold text-emerald-800 mb-2">Add New Payment</h3>
                <div class="flex flex-wrap gap-2">
                    <input type="date" id="payDate" class="border border-gray-300 px-2 py-2 rounded flex-1" value="${new Date().toISOString().split('T')[0]}">
                    <select id="payMethod" class="border border-gray-300 px-2 py-2 rounded flex-1">
                        <option value="PhonePe">PhonePe</option>
                        <option value="RTGS">RTGS</option>
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                    </select>
                    <input type="number" id="payAmount" placeholder="₹ Amount" class="border border-gray-300 px-2 py-2 rounded w-32 flex-1">
                    <button onclick="recordPayment('${partyName}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded font-bold w-full mt-2 transition">Record Payment</button>
                </div>
            </div>
        </div>

        <div class="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <table class="min-w-full text-left border-collapse">
                <thead class="bg-gray-800 text-white">
                    <tr>
                        <th class="px-4 py-3 text-sm">Date</th>
                        <th class="px-4 py-3 text-sm">Details</th>
                        <th class="px-4 py-3 text-sm text-right">Charge (₹)</th>
                        <th class="px-4 py-3 text-sm text-right">Paid (₹)</th>
                        <th class="px-4 py-3 text-sm text-right">Balance (₹)</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    <tr class="bg-gray-50">
                        <td class="px-4 py-3 text-sm text-gray-500">---</td>
                        <td class="px-4 py-3 text-sm font-bold text-gray-700">Opening Balance</td>
                        <td class="px-4 py-3 text-sm text-right font-semibold text-red-500">${openingBalance > 0 ? openingBalance.toFixed(2) : '-'}</td>
                        <td class="px-4 py-3 text-sm text-right text-gray-400">-</td>
                        <td class="px-4 py-3 text-sm text-right font-bold text-gray-800">${openingBalance.toFixed(2)}</td>
                    </tr>
    `;

    // Render Rows & Calculate Running Balance
    let runningBalance = openingBalance;
    
    // Start the total billed counter with the old dues included
    let totalBilled = openingBalance; 
    let totalPaid = 0;

    transactions.forEach(tx => {
        runningBalance += tx.charge;
        runningBalance -= tx.credit;
        totalBilled += tx.charge;
        totalPaid += tx.credit;

        // Badge styling
        let badgeColor = 'bg-gray-100 text-gray-600 border-gray-200';
        if (tx.badge === 'PAKKA') badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
        if (tx.badge === 'KACHA') badgeColor = 'bg-yellow-100 text-yellow-800 border-yellow-200';
        if (tx.credit > 0) badgeColor = 'bg-green-100 text-green-800 border-green-200';

        // NEW: Check if this row is a Payment, and if so, add Action Buttons
        let actionButtons = '';
        // We know it's a payment if it has a 'credit' amount and isn't the opening balance
        if (tx.credit > 0 && tx.type === 'Payment Received') {
            actionButtons = `
                <div class="inline-flex gap-2 ml-3">
                    <button onclick="editPayment('${partyName}', '${tx.id}')" class="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded transition" title="Edit Amount">✏️ Edit</button>
                    <button onclick="deletePayment('${partyName}', '${tx.id}')" class="text-xs bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-2 py-1 rounded transition" title="Delete Payment">🗑️</button>
                </div>
            `;
        }

        html += `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3 text-sm text-gray-600">${tx.dateStr}</td>
                <td class="px-4 py-3 text-sm font-medium text-gray-900">
                    ${tx.type} 
                    <span class="ml-2 text-xs px-2 py-0.5 rounded border ${badgeColor}">${tx.badge}</span>
                    ${actionButtons} </td>
                <td class="px-4 py-3 text-sm text-right font-semibold text-red-500">${tx.charge > 0 ? tx.charge.toFixed(2) : '-'}</td>
                <td class="px-4 py-3 text-sm text-right font-semibold text-emerald-500">${tx.credit > 0 ? tx.credit.toFixed(2) : '-'}</td>
                <td class="px-4 py-3 text-sm text-right font-bold ${runningBalance > 0 ? 'text-red-600' : 'text-emerald-600'}">
                    ${Math.abs(runningBalance).toFixed(2)} ${runningBalance > 0 ? 'Dr' : 'Cr'}
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
                <tfoot class="bg-gray-100 border-t-2 border-gray-300">
                    <tr>
                        <td colspan="2" class="px-4 py-3 text-right font-bold text-gray-700">GRAND TOTAL:</td>
                        <td class="px-4 py-3 text-right font-bold text-red-600">₹${totalBilled.toFixed(2)}</td>
                        <td class="px-4 py-3 text-right font-bold text-emerald-600">₹${totalPaid.toFixed(2)}</td>
                        <td class="px-4 py-3 text-right font-bold text-xl ${runningBalance > 0 ? 'text-red-600' : 'text-emerald-600'}">
                            ₹${Math.abs(runningBalance).toFixed(2)} ${runningBalance > 0 ? 'DUE' : 'ADVANCE'}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;

    container.innerHTML = html;
}

// --- 3. ACTIONS ---

window.saveOpeningBalance = function(partyName) {
    const amt = parseFloat(document.getElementById('openingBalInput').value) || 0;
    ledgerMetadata.openingBalances[partyName] = amt;
    saveLedgerMetadata();
    renderPartyLedger(partyName); // Refresh UI
}

window.recordPayment = function(partyName) {
    const dateInput = document.getElementById('payDate').value; // YYYY-MM-DD format
    const method = document.getElementById('payMethod').value;
    const amount = parseFloat(document.getElementById('payAmount').value);

    if (isNaN(amount) || amount <= 0) {
        return alert("Please enter a valid payment amount greater than 0.");
    }
    if (!dateInput) {
        return alert("Please select a valid date.");
    }

    // Initialize array if this is the first payment
    if (!ledgerMetadata.payments[partyName]) {
        ledgerMetadata.payments[partyName] = [];
    }

    // Add payment
    ledgerMetadata.payments[partyName].push({
        id: `PAY-${Date.now()}`,
        timestamp: new Date(dateInput).getTime(),
        amount: amount,
        method: method
    });

    saveLedgerMetadata();
    renderPartyLedger(partyName); // Instantly refresh
}

// --- EDIT & DELETE PAYMENTS ---

window.editPayment = function(partyName, paymentId) {
    // 1. Find the exact payment
    const payments = ledgerMetadata.payments[partyName];
    const payment = payments.find(p => p.id === paymentId);
    
    if (!payment) return;
    
    // 2. Ask the user for the new amount using a simple prompt
    const newAmountStr = prompt(`Edit Payment Amount for ${partyName}:\nEnter the correct amount (₹):`, payment.amount);
    
    // 3. If they cancel the prompt, do nothing
    if (newAmountStr === null) return; 
    
    const newAmount = parseFloat(newAmountStr);
    
    // 4. Validate and save
    if (isNaN(newAmount) || newAmount <= 0) {
        alert("Invalid amount entered. Update cancelled.");
        return;
    }
    
    payment.amount = newAmount;
    saveLedgerMetadata();
    
    // 5. Instantly refresh the screen to show the updated math
    renderPartyLedger(partyName);
};

window.deletePayment = function(partyName, paymentId) {
    if (!confirm("Are you sure you want to permanently delete this payment entry?")) return;
    
    // Filter out the deleted payment
    ledgerMetadata.payments[partyName] = ledgerMetadata.payments[partyName].filter(p => p.id !== paymentId);
    
    saveLedgerMetadata();
    renderPartyLedger(partyName); // Refresh the screen
};