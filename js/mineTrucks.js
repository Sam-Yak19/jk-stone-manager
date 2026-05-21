// js/mineTrucks.js

let mineTruckArchive = [];

document.addEventListener('DOMContentLoaded', () => {
    const mineTruckTab = document.getElementById('mineTruckTab');
    const mineTruckPage = document.getElementById('mineTruckPage');
    
    // Set default date to today for the input
    document.getElementById('mineDate').valueAsDate = new Date();
    
    // Set default month to current month
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const monthSelector = document.getElementById('mineMonthSelector');
    if (monthSelector) monthSelector.value = currentMonthStr;

    // Load Database
    loadMineTruckArchive();

    // 1. Tab Navigation Logic
    if (mineTruckTab) {
        mineTruckTab.addEventListener('click', () => {
            // Hide all other pages
            const pages = ['truckLoaderPage', 'karigaarPage', 'summaryPage', 'billBookPage', 'ledgerPage', 'analyticsPage'];
            pages.forEach(p => {
                const el = document.getElementById(p);
                if(el) el.classList.add('hidden');
            });
            
            // Show Mine Truck Page
            mineTruckPage.classList.remove('hidden');
            
            // Update Tab styles
            mineTruckTab.classList.add('border-cyan-600', 'text-cyan-600');
            mineTruckTab.classList.remove('border-transparent', 'text-gray-500');
            
            // Render the dashboard
            renderMineTruckDashboard();
        });
    }

    // 2. Form Submission (Saving a Truck)
    document.getElementById('addMineTruckForm')?.addEventListener('submit', (e) => {
        e.preventDefault();

        const dateInput = document.getElementById('mineDate').value;
        const party = document.getElementById('mineParty').value.trim();
        const stones = parseInt(document.getElementById('mineStones').value);
        const notes = document.getElementById('mineNotes').value.trim();

        const dateObj = new Date(dateInput);
        const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        const displayDate = dateObj.toLocaleDateString('en-IN');

        const newEntry = {
            id: `MINE-${Date.now()}`,
            date: displayDate,
            monthKey: monthKey,
            timestamp: dateObj.getTime(),
            party: party,
            stones: stones,
            notes: notes
        };

        mineTruckArchive.push(newEntry);
        saveMineTruckArchive();
        
        // Reset specific form fields
        document.getElementById('mineStones').value = '';
        document.getElementById('mineNotes').value = '';
        
        // Set the month selector to the month of the truck just added to see it instantly
        if (monthSelector) monthSelector.value = monthKey;
        
        renderMineTruckDashboard();
    });

    // 3. Month Change Listener
    monthSelector?.addEventListener('change', renderMineTruckDashboard);
});

// --- CORE FUNCTIONS ---

function loadMineTruckArchive() {
    const saved = localStorage.getItem('jkMineTruckArchive');
    if (saved) mineTruckArchive = JSON.parse(saved);
}

function saveMineTruckArchive() {
    localStorage.setItem('jkMineTruckArchive', JSON.stringify(mineTruckArchive));
}

function renderMineTruckDashboard() {
    const selectedMonth = document.getElementById('mineMonthSelector')?.value;
    if (!selectedMonth) return;

    // Filter data for the selected month
    const monthlyData = mineTruckArchive.filter(t => t.monthKey === selectedMonth).sort((a, b) => b.timestamp - a.timestamp);
    
    // 1. Calculate Totals and Breakdown
    let totalStones = 0;
    const partyCounts = {};

    monthlyData.forEach(truck => {
        totalStones += truck.stones;
        if (!partyCounts[truck.party]) {
            partyCounts[truck.party] = 0;
        }
        partyCounts[truck.party] += 1;
    });

    // Update Top Widget Numbers
    document.getElementById('totalMineTrucks').textContent = monthlyData.length;
    document.getElementById('totalMineStones').textContent = totalStones;

    // Update Party Breakdown Badges
    const breakdownContainer = document.getElementById('minePartyBreakdown');
    breakdownContainer.innerHTML = '';
    
    if (Object.keys(partyCounts).length > 0) {
        Object.entries(partyCounts).sort((a,b) => b[1] - a[1]).forEach(([party, count]) => {
            breakdownContainer.innerHTML += `
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-cyan-100 text-cyan-800 border border-cyan-200 shadow-sm">
                    ${party}: <span class="ml-1 font-extrabold">${count} Truck(s)</span>
                </span>
            `;
        });
    } else {
        breakdownContainer.innerHTML = `<span class="text-sm text-gray-500 italic">No party data for this month.</span>`;
    }

    // 2. Render the List
    const listContainer = document.getElementById('mineTruckList');
    listContainer.innerHTML = '';

    if (monthlyData.length === 0) {
        listContainer.innerHTML = `<div class="text-center py-8 text-gray-500 italic">No trucks received in this month.</div>`;
        return;
    }

    monthlyData.forEach(truck => {
        const div = document.createElement('div');
        div.className = 'border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50 relative';
        
        div.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="font-bold text-lg text-gray-900">${truck.party}</h3>
                    <p class="text-sm text-cyan-700 font-semibold mb-2">📅 ${truck.date}</p>
                </div>
                <div class="text-right">
                    <span class="bg-gray-800 text-white font-bold px-3 py-1 rounded-md shadow-sm">${truck.stones} Stones</span>
                    <button onclick="deleteMineTruck('${truck.id}')" class="block ml-auto mt-2 text-red-500 hover:text-red-700 text-xs font-bold uppercase transition-colors">Delete</button>
                </div>
            </div>
            ${truck.notes ? `<div class="mt-2 pt-2 border-t border-gray-200 text-sm text-gray-600 bg-white p-2 rounded italic"><span class="font-bold not-italic text-gray-800">Notes:</span> ${truck.notes}</div>` : ''}
        `;
        listContainer.appendChild(div);
    });
}

// Function to delete an entry
window.deleteMineTruck = function(id) {
    if (confirm("Are you sure you want to delete this truck entry?")) {
        mineTruckArchive = mineTruckArchive.filter(t => t.id !== id);
        saveMineTruckArchive();
        renderMineTruckDashboard();
    }
}