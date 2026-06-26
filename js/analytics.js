// js/analytics.js

document.addEventListener('DOMContentLoaded', () => {
    const analyticsTab = document.getElementById('analyticsTab');
    const analyticsPage = document.getElementById('analyticsPage');
    
    // 1. Tab Navigation
    if (analyticsTab) {
        analyticsTab.addEventListener('click', () => {
            // Hide all other pages
            document.getElementById('truckLoaderPage').classList.add('hidden');
            document.getElementById('karigaarPage').classList.add('hidden');
            document.getElementById('summaryPage').classList.add('hidden');
            document.getElementById('billBookPage').classList.add('hidden');
            document.getElementById('ledgerPage').classList.add('hidden');
            
            // Show Analytics
            analyticsPage.classList.remove('hidden');
            
            // Update Tab styles
            analyticsTab.classList.add('border-rose-600', 'text-rose-600');
            analyticsTab.classList.remove('border-transparent', 'text-gray-500');
            
            // Reset other tabs
            document.getElementById('truckLoaderTab').classList.remove('border-indigo-600', 'text-indigo-600');
            document.getElementById('karigaarTab').classList.remove('border-purple-500', 'text-purple-500');
            document.getElementById('billBookTab').classList.remove('border-orange-500', 'text-orange-500');
            document.getElementById('ledgerTab').classList.remove('border-emerald-600', 'text-emerald-600');
            
            generateAnalytics();
        });
    }
});

//// --- CORE ANALYTICS FUNCTION ---

function generateAnalytics() {
    const tableBody = document.getElementById('analyticsTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    // 1. Fetch the new Credit Book Metadata (Opening Balances & Payments)
    const ledgerMetadata = JSON.parse(localStorage.getItem('jk_ledger_metadata')) || {
        openingBalances: {}, 
        payments: {}         
    };

    // 2. Get all unique parties (from Bills, Opening Balances, and Payments)
    let parties = new Set(billArchive.map(b => b.partyName));
    Object.keys(ledgerMetadata.openingBalances).forEach(p => parties.add(p));
    Object.keys(ledgerMetadata.payments).forEach(p => parties.add(p));
    parties = [...parties];

    if (parties.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500 italic">No business data available yet. Start saving bills to see analytics.</td></tr>';
        return;
    }

    // 3. Calculate accurate totals for each party
    const partyStats = {};

    parties.forEach(party => {
        // Get Opening Balance
        const openingBalance = ledgerMetadata.openingBalances[party] || 0;
        
        // Get all Bills for this party
        const partyBills = billArchive.filter(b => b.partyName === party);
        const sumBills = partyBills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
        
        // Get all Payments for this party
        const partyPayments = ledgerMetadata.payments[party] || [];
        const sumPayments = partyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        // MATHEMATICS EXACTLY LIKE THE LEDGER
        const totalBilled = openingBalance + sumBills; // Total Charge (Dues)
        const totalPaid = sumPayments;                 // Total Received (Credits)
        const totalBalance = totalBilled - totalPaid;  // Net Balance

        partyStats[party] = {
            name: party,
            billCount: partyBills.length,
            totalBilled: totalBilled,
            totalPaid: totalPaid,
            totalBalance: totalBalance
        };
    });

    // 4. Convert object to an array and sort by Market Balance (Highest Debt first)
    const sortedParties = Object.values(partyStats).sort((a, b) => b.totalBalance - a.totalBalance);

    // 5. Draw the Table
    sortedParties.forEach(stats => {
        // Calculate Clearance Rate (%)
        let clearanceRate = 0;
        if (stats.totalBilled > 0) {
            clearanceRate = (stats.totalPaid / stats.totalBilled) * 100;
        }

        // Determine color logic for the badge
        let badgeColor = 'bg-red-100 text-red-800 border-red-200'; // Poor
        if (clearanceRate >= 99) badgeColor = 'bg-green-100 text-green-800 border-green-200'; // Perfect
        else if (clearanceRate >= 50) badgeColor = 'bg-yellow-100 text-yellow-800 border-yellow-200'; // Okay

        const row = document.createElement('tr');
        row.className = "hover:bg-gray-50 transition-colors";
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-lg font-bold text-gray-900">${stats.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-center text-gray-600">${stats.billCount}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right font-medium text-blue-600">₹${stats.totalBilled.toFixed(2)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right font-medium text-emerald-600">₹${stats.totalPaid.toFixed(2)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right font-bold ${stats.totalBalance > 0 ? 'text-red-600' : 'text-emerald-600'}">
                ₹${Math.abs(stats.totalBalance).toFixed(2)} ${stats.totalBalance > 0 ? 'Due' : 'Adv'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-center">
                <span class="px-3 py-1 text-sm font-bold rounded-full border ${badgeColor}">
                    ${clearanceRate.toFixed(1)}%
                </span>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}