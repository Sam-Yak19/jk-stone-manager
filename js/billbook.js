// js/billBook.js

document.addEventListener('DOMContentLoaded', () => {
    const billBookTab = document.getElementById('billBookTab');
    const billBookPage = document.getElementById('billBookPage');
    
    // Set default month to current month (Format: YYYY-MM)
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const monthSelector = document.getElementById('monthSelector');
    if (monthSelector) monthSelector.value = currentMonthStr;

    // 1. Tab Navigation
    if (billBookTab) {
        billBookTab.addEventListener('click', () => {
            // Hide all other pages
            document.getElementById('truckLoaderPage').classList.add('hidden');
            document.getElementById('karigaarPage').classList.add('hidden');
            document.getElementById('summaryPage').classList.add('hidden');
            
            // Show Bill Book
            billBookPage.classList.remove('hidden');
            
            // Update Tab styles
            billBookTab.classList.add('border-orange-500', 'text-orange-500');
            billBookTab.classList.remove('border-transparent', 'text-gray-500');
            
            // Reset other tabs
            document.getElementById('truckLoaderTab').classList.remove('border-indigo-600', 'text-indigo-600');
            document.getElementById('karigaarTab').classList.remove('border-purple-500', 'text-purple-500');
            
            renderMonthlyBills();
        });
    }

    // 2. Button Event Listeners
    document.getElementById('saveBillBtn')?.addEventListener('click', saveCurrentBill);
    monthSelector?.addEventListener('change', renderMonthlyBills);
    document.getElementById('downloadMonthlyPDFBtn')?.addEventListener('click', generateMonthlyPDF);
});

// --- CORE FUNCTIONS ---

function saveCurrentBill() {
    const partyName = document.getElementById('partySelector').value;
    if (!partyName || partyName === "No parties added") {
        return alert("Please select or add a Party Name before saving.");
    }

    // Generate strict date formats for sorting
    const now = new Date();
    const exactDate = now.toLocaleDateString('en-IN'); 
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Gather all rows from the bill table
    const items = [];
    document.querySelectorAll('#billTableBody tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length > 0) {
            items.push({
                size: cells[0].textContent.trim(),
                qty: cells[1].textContent.trim(),
                sqft: cells[2].textContent.trim(),
                rate: cells[3].querySelector('input').value || "0",
                subtotal: cells[4].textContent.replace('₹', '').trim()
            });
        }
    });

    // Get the grand total
    const grandTotalStr = document.getElementById('billGrandTotal').textContent.replace('₹', '').replace(/,/g, '');
    const grandTotal = parseFloat(grandTotalStr) || 0;

    // Build the Bill Object (Future-proofed with payment tracking fields)
    const newBill = {
        id: `BILL-${Date.now()}`,
        date: exactDate,
        monthKey: monthKey,
        timestamp: now.getTime(),
        partyName: partyName,
        saleLocation: document.getElementById('saleLocation').value,
        billType: document.getElementById('billTypeSelector').value,
        items: items,
        stoneSubtotal: document.getElementById('billSubtotal').textContent,
        bharai: document.getElementById('billBharaiCharge').textContent,
        taxDetails: document.getElementById('taxBreakdown').innerHTML,
        grandTotal: grandTotal,
        
        // FUTURE PHASE: Payment Ledger Foundations
        amountPaid: 0,
        balance: grandTotal,
        paymentHistory: [],
        status: 'Unpaid' 
    };

    // Save to database array
    if (typeof billArchive === 'undefined') {
        return alert("Database not loaded. Please refresh the page.");
    }
    
    billArchive.push(newBill);
    saveBillArchive();
    
    alert(`Bill for ${partyName} saved successfully to the Bill Book!`);
    document.getElementById('billModal').classList.add('hidden');
    
    // Prompt to clear the truck for the next load
    if (confirm("Bill saved! Do you want to clear the Truck Loading data to start a new truck?")) {
        localStorage.removeItem('truckLoaderData');
        localStorage.removeItem('truckLoaderBharaiCosts');
        location.reload();
    }
}

function renderMonthlyBills() {
    const container = document.getElementById('monthlyBillsList');
    if (!container) return;
    
    const selectedMonth = document.getElementById('monthSelector').value;
    
    const monthlyBills = billArchive
        .filter(bill => bill.monthKey === selectedMonth)
        .sort((a, b) => b.timestamp - a.timestamp);

    container.innerHTML = '';

    if (monthlyBills.length === 0) {
        container.innerHTML = `<div class="text-center py-8 text-gray-500 italic">No bills recorded for this month.</div>`;
        return;
    }

    let totalMonthSales = 0;

    monthlyBills.forEach(bill => {
        totalMonthSales += bill.grandTotal;
        
        // Determine Kacha/Pakka Badge
        const typeBadge = (bill.billType === 'pakka') 
            ? `<span class="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded ml-2 border border-blue-200">PAKKA</span>`
            : `<span class="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded ml-2 border border-yellow-200">KACHA</span>`;

        const billDiv = document.createElement('div');
        billDiv.className = 'border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4';
        
        billDiv.innerHTML = `
            <div>
                <p class="text-xl font-bold text-gray-800">${bill.date} - ${bill.partyName} ${typeBadge}</p>
                <p class="text-sm text-gray-500 mt-1">ID: ${bill.id}</p>
            </div>
            <div class="flex items-center gap-6 w-full md:w-auto justify-end">
                <div class="text-right">
                    <p class="text-2xl font-bold text-teal-600">₹${bill.grandTotal.toFixed(2)}</p>
                    <span class="inline-block mt-1 px-3 py-1 text-xs font-semibold rounded ${bill.status === 'Cleared' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} border border-red-200">${bill.status}</span>
                </div>
                <button onclick="deleteBillFromArchive('${bill.id}')" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors border border-red-100" title="Delete Bill">
                    <svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        `;
        container.appendChild(billDiv);
    });

    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'mb-6 p-5 bg-orange-50 border-l-4 border-orange-500 rounded-r-lg flex justify-between items-center';
    summaryDiv.innerHTML = `
        <div>
            <p class="text-sm text-orange-600 font-semibold uppercase tracking-wider">Monthly Revenue</p>
            <p class="text-2xl font-bold text-orange-800">₹${totalMonthSales.toFixed(2)}</p>
        </div>
        <div class="text-right">
            <p class="text-sm text-orange-600 font-semibold uppercase tracking-wider">Total Bills</p>
            <p class="text-2xl font-bold text-orange-800">${monthlyBills.length}</p>
        </div>
    `;
    container.prepend(summaryDiv);
}

// NEW FUNCTION: Delete a bill completely
window.deleteBillFromArchive = function(billId) {
    if (confirm("WARNING: Are you sure you want to permanently delete this bill? This will also remove it from the Party Ledger and Analytics.")) {
        // Filter out the deleted bill
        billArchive = billArchive.filter(bill => bill.id !== billId);
        
        // Save the updated array back to storage
        saveBillArchive();
        
        // Refresh the screen
        renderMonthlyBills();
    }
}

function generateMonthlyPDF() {
    const selectedMonth = document.getElementById('monthSelector').value;
    const monthlyBills = billArchive.filter(bill => bill.monthKey === selectedMonth).sort((a, b) => a.timestamp - b.timestamp);
    
    if (monthlyBills.length === 0) return alert("No bills to export for this month.");

    const pdfContainer = document.getElementById('pdfExportContainer');
    pdfContainer.innerHTML = '';
    pdfContainer.classList.remove('hidden'); 

    let html = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 30px;">
            <div style="text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px;">
                <h1 style="color: #111827; margin: 0; font-size: 28px;">JkStonExports</h1>
                <h2 style="color: #4b5563; margin: 10px 0 0 0; font-size: 18px;">Monthly Sales Report: ${selectedMonth}</h2>
            </div>
    `;

    let grandTotal = 0;

    monthlyBills.forEach(bill => {
        grandTotal += bill.grandTotal;
        html += `
            <div style="margin-bottom: 30px; page-break-inside: avoid; border: 1px solid #d1d5db; padding: 20px; border-radius: 8px; background-color: #f9fafb;">
                <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 15px;">
                    <div style="font-size: 16px;"><strong>Date:</strong> ${bill.date}</div>
                    <div style="font-size: 16px; color: #4338ca;"><strong>Party:</strong> ${bill.partyName}</div>
                </div>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 13px;">
                    <thead>
                        <tr style="background-color: #e5e7eb; color: #374151;">
                            <th style="padding: 10px; text-align: left;">Size</th>
                            <th style="padding: 10px; text-align: center;">Qty</th>
                            <th style="padding: 10px; text-align: right;">Rate</th>
                            <th style="padding: 10px; text-align: right;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        bill.items.forEach(item => {
            html += `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.size}</td>
                    <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e5e7eb;">${item.qty}</td>
                    <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e5e7eb;">₹${item.rate}</td>
                    <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e5e7eb;">₹${item.subtotal}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
                <div style="display: flex; justify-content: flex-end;">
                    <table style="width: 250px; font-size: 14px;">
                        <tr><td style="padding: 4px; color: #4b5563;">Subtotal:</td><td style="padding: 4px; text-align: right;">${bill.stoneSubtotal}</td></tr>
                        <tr><td style="padding: 4px; color: #4b5563;">Bharai:</td><td style="padding: 4px; text-align: right;">${bill.bharai}</td></tr>
                        <tr style="font-weight: bold; font-size: 16px; border-top: 1px solid #d1d5db;">
                            <td style="padding: 8px 4px 0 4px;">Grand Total:</td>
                            <td style="padding: 8px 4px 0 4px; text-align: right; color: #047857;">₹${bill.grandTotal.toFixed(2)}</td>
                        </tr>
                    </table>
                </div>
            </div>
        `;
    });

    html += `
            <div style="margin-top: 50px; text-align: right; border-top: 3px solid #111827; padding-top: 20px;">
                <h3 style="color: #4b5563; margin: 0; font-size: 18px;">Total Monthly Revenue</h3>
                <h2 style="color: #ea580c; margin: 5px 0 0 0; font-size: 32px;">₹${grandTotal.toFixed(2)}</h2>
            </div>
        </div>
    `;

    pdfContainer.innerHTML = html;

    const opt = {
        margin:       0.4,
        filename:     `JkStonExports_${selectedMonth}_Report.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(pdfContainer).save().then(() => {
        pdfContainer.classList.add('hidden'); 
    });
}