// js/ledger.js

let activeBillForPayment = null;

document.addEventListener('DOMContentLoaded', () => {
    const ledgerTab = document.getElementById('ledgerTab');
    const ledgerPage = document.getElementById('ledgerPage');
    const ledgerPartySelector = document.getElementById('ledgerPartySelector');
    
    // 1. Tab Navigation
    if (ledgerTab) {
        ledgerTab.addEventListener('click', () => {
            // Hide others
            document.getElementById('truckLoaderPage').classList.add('hidden');
            document.getElementById('karigaarPage').classList.add('hidden');
            document.getElementById('summaryPage').classList.add('hidden');
            document.getElementById('billBookPage').classList.add('hidden');
            
            // Show Ledger
            ledgerPage.classList.remove('hidden');
            
            // Update Tab styles
            ledgerTab.classList.add('border-emerald-600', 'text-emerald-600');
            ledgerTab.classList.remove('border-transparent', 'text-gray-500');
            
            // Reset other tabs
            document.getElementById('truckLoaderTab').classList.remove('border-indigo-600', 'text-indigo-600');
            document.getElementById('karigaarTab').classList.remove('border-purple-500', 'text-purple-500');
            document.getElementById('billBookTab').classList.remove('border-orange-500', 'text-orange-500');
            
            refreshLedgerPartyList();
        });
    }

    // 2. Party Selection Change
    ledgerPartySelector?.addEventListener('change', (e) => {
        renderPartyLedger(e.target.value);
    });

    // 3. Payment Modal Controls
    document.getElementById('cancelPaymentBtn')?.addEventListener('click', closePaymentModal);
    document.getElementById('confirmPaymentBtn')?.addEventListener('click', processPayment);
});

// --- CORE FUNCTIONS ---

function refreshLedgerPartyList() {
    const selector = document.getElementById('ledgerPartySelector');
    if (!selector) return;

    // Get unique parties that actually have bills in the archive
    const partiesWithBills = [...new Set(billArchive.map(bill => bill.partyName))];
    
    // Keep currently selected party if it still exists
    const currentSelection = selector.value;
    
    selector.innerHTML = '<option value="">-- Choose a Party --</option>';
    partiesWithBills.sort().forEach(party => {
        selector.innerHTML += `<option value="${party}">${party}</option>`;
    });

    if (partiesWithBills.includes(currentSelection)) {
        selector.value = currentSelection;
        renderPartyLedger(currentSelection);
    } else {
        document.getElementById('ledgerSummaryStats').classList.add('hidden');
        document.getElementById('ledgerBillsList').innerHTML = '<div class="text-center py-10 text-gray-500 italic">Select a party above to view their ledger.</div>';
    }
}

function renderPartyLedger(partyName) {
    if (!partyName) {
        document.getElementById('ledgerSummaryStats').classList.add('hidden');
        document.getElementById('ledgerBillsList').innerHTML = '<div class="text-center py-10 text-gray-500 italic">Select a party above to view their ledger.</div>';
        return;
    }

    const container = document.getElementById('ledgerBillsList');
    container.innerHTML = '';

    // Filter bills for this specific party
    const partyBills = billArchive.filter(bill => bill.partyName === partyName).sort((a, b) => b.timestamp - a.timestamp);

    let totalBilled = 0;
    let totalReceived = 0;
    let totalBalance = 0;

    partyBills.forEach(bill => {
        // Ensure legacy bills have the required fields
        if (bill.balance === undefined) bill.balance = bill.grandTotal;
        if (bill.amountPaid === undefined) bill.amountPaid = 0;
        if (bill.paymentHistory === undefined) bill.paymentHistory = [];
        if (bill.status === undefined) bill.status = 'Unpaid';

        totalBilled += bill.grandTotal;
        totalReceived += bill.amountPaid;
        totalBalance += bill.balance;

        const isCleared = bill.balance <= 0;
        const statusColor = isCleared ? 'bg-green-100 text-green-800 border-green-200' : (bill.amountPaid > 0 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-red-100 text-red-800 border-red-200');

        // Format Payment History
        let historyHTML = '';
        if (bill.paymentHistory.length > 0) {
            historyHTML = `<div class="mt-4 pt-3 border-t border-gray-200 bg-gray-50 rounded p-3">
                <p class="text-xs font-bold text-gray-500 uppercase mb-2">Payment History</p>
                <ul class="space-y-1">
                    ${bill.paymentHistory.map(pay => `<li class="text-sm text-gray-700 flex justify-between"><span>✓ ${pay.date}</span><span class="font-bold text-green-700">+ ₹${pay.amount.toFixed(2)}</span></li>`).join('')}
                </ul>
            </div>`;
        }

        const billCard = document.createElement('div');
        billCard.className = `border rounded-xl p-5 shadow-sm transition-all ${isCleared ? 'border-green-300 bg-green-50/30' : 'border-gray-200 bg-white hover:shadow-md'}`;
        
        billCard.innerHTML = `
            <div class="flex flex-col md:flex-row justify-between gap-4">
                <div class="flex-1">
                    <div class="flex items-center gap-3 mb-1">
                        <span class="text-lg font-bold text-gray-800">Date: ${bill.date}</span>
                        <span class="px-2 py-0.5 text-xs font-bold rounded border ${statusColor}">${bill.status}</span>
                    </div>
                    <p class="text-sm text-gray-500 font-mono mb-2">ID: ${bill.id}</p>
                    <div class="grid grid-cols-2 max-w-sm gap-y-1 text-sm mt-3">
                        <span class="text-gray-600">Bill Total:</span><span class="font-bold text-gray-900 text-right">₹${bill.grandTotal.toFixed(2)}</span>
                        <span class="text-gray-600">Paid:</span><span class="font-bold text-green-600 text-right">₹${bill.amountPaid.toFixed(2)}</span>
                        <span class="text-gray-900 font-bold mt-1 pt-1 border-t">Balance:</span><span class="font-bold text-red-600 text-right mt-1 pt-1 border-t">₹${bill.balance.toFixed(2)}</span>
                    </div>
                </div>
                
                <div class="flex flex-col justify-center min-w-[140px]">
                    ${!isCleared ? `<button onclick="openPaymentModal('${bill.id}')" class="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-colors mb-2">Add Payment</button>` : `<div class="text-center font-bold text-green-600 border-2 border-green-500 rounded-lg py-2 bg-white flex items-center justify-center gap-2"><span class="text-xl">✓</span> CLEARED</div>`}
                </div>
            </div>
            ${historyHTML}
        `;
        container.appendChild(billCard);
    });

    // Update Top Summary
    document.getElementById('ledgerSummaryStats').classList.remove('hidden');
    document.getElementById('ledgerTotalBilled').textContent = `₹${totalBilled.toFixed(2)}`;
    document.getElementById('ledgerTotalReceived').textContent = `₹${totalReceived.toFixed(2)}`;
    document.getElementById('ledgerTotalBalance').textContent = `₹${totalBalance.toFixed(2)}`;
}

// --- PAYMENT PROCESSING ---

window.openPaymentModal = function(billId) {
    const bill = billArchive.find(b => b.id === billId);
    if (!bill) return;
    
    activeBillForPayment = bill;
    
    document.getElementById('payBillId').textContent = bill.id;
    document.getElementById('payCurrentBalance').textContent = `₹${bill.balance.toFixed(2)}`;
    
    // Default date to today
    document.getElementById('paymentDateInput').valueAsDate = new Date();
    document.getElementById('paymentAmountInput').value = '';
    
    document.getElementById('paymentModal').classList.remove('hidden');
    document.getElementById('paymentAmountInput').focus();
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.add('hidden');
    activeBillForPayment = null;
}

function processPayment() {
    if (!activeBillForPayment) return;

    const amountInput = document.getElementById('paymentAmountInput').value;
    const paymentAmount = parseFloat(amountInput);
    const dateInput = document.getElementById('paymentDateInput').value;

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
        return alert("Please enter a valid payment amount.");
    }
    if (paymentAmount > activeBillForPayment.balance) {
        return alert(`Amount cannot exceed the current balance of ₹${activeBillForPayment.balance.toFixed(2)}`);
    }
    if (!dateInput) {
        return alert("Please select a payment date.");
    }

    // Format the date nicely (YYYY-MM-DD to DD/MM/YYYY)
    const dateObj = new Date(dateInput);
    const formattedDate = dateObj.toLocaleDateString('en-IN');

    // Update the Bill Data
    activeBillForPayment.amountPaid += paymentAmount;
    activeBillForPayment.balance -= paymentAmount;
    
    activeBillForPayment.paymentHistory.push({
        date: formattedDate,
        amount: paymentAmount,
        timestamp: dateObj.getTime()
    });

    if (activeBillForPayment.balance <= 0) {
        activeBillForPayment.status = 'Cleared';
    } else {
        activeBillForPayment.status = 'Partial';
    }

    // Save globally
    saveBillArchive();
    
    // Close modal and refresh UI
    closePaymentModal();
    renderPartyLedger(activeBillForPayment.partyName);
}