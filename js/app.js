// js/app.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Grab Main Tabs
    const mainTruck = document.getElementById('mainTabTruck');
    const mainKarigaar = document.getElementById('mainTabKarigaar');
    const mainMine = document.getElementById('mainTabMine');

    // 2. Grab Sub Nav Bars
    const subTruck = document.getElementById('subNavTruck');
    const subKarigaar = document.getElementById('subNavKarigaar');

    // 3. Define all page containers (NEW: Added attendancePage here)
    const allPages = [
        'truckLoaderPage', 'savedTrucksPage', 'billBookPage', 'ledgerPage', 
        'analyticsPage', 'summaryPage', 'karigaarPage', 'savedKarigaarPage', 'mineTruckPage', 'attendancePage'
    ];

    function hideAllPages() {
        allPages.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.classList.add('hidden');
        });
    }

    function resetMainTabStyles() {
        [mainTruck, mainKarigaar, mainMine].forEach(tab => {
            if(tab) {
                tab.classList.remove('border-indigo-500', 'text-indigo-400', 'border-purple-500', 'text-purple-400', 'border-cyan-500', 'text-cyan-400');
                tab.classList.add('border-transparent', 'text-gray-300');
            }
        });
    }

    // --- MAIN TAB CLICK EVENTS ---

    if(mainTruck) {
        mainTruck.addEventListener('click', () => {
            resetMainTabStyles();
            mainTruck.classList.remove('border-transparent', 'text-gray-300');
            mainTruck.classList.add('border-indigo-500', 'text-indigo-400');
            
            if(subTruck) subTruck.classList.remove('hidden');
            if(subKarigaar) subKarigaar.classList.add('hidden');
            
            // Auto-click the first sub-tab to load the page
            const truckLoaderTab = document.getElementById('truckLoaderTab');
            if(truckLoaderTab) truckLoaderTab.click();
        });
    }

    if(mainKarigaar) {
        mainKarigaar.addEventListener('click', () => {
            resetMainTabStyles();
            mainKarigaar.classList.remove('border-transparent', 'text-gray-300');
            mainKarigaar.classList.add('border-purple-500', 'text-purple-400');
            
            if(subTruck) subTruck.classList.add('hidden');
            if(subKarigaar) subKarigaar.classList.remove('hidden');
            
            // Auto-click the first sub-tab to load the page
            const karigaarTab = document.getElementById('karigaarTab');
            if(karigaarTab) karigaarTab.click();
        });
    }

    if(mainMine) {
        mainMine.addEventListener('click', () => {
            resetMainTabStyles();
            mainMine.classList.remove('border-transparent', 'text-gray-300');
            mainMine.classList.add('border-cyan-500', 'text-cyan-400');
            
            if(subTruck) subTruck.classList.add('hidden');
            if(subKarigaar) subKarigaar.classList.add('hidden');
            
            hideAllPages();
            const minePage = document.getElementById('mineTruckPage');
            if(minePage) minePage.classList.remove('hidden');
        });
    }

    // --- TRUCK LOADING SUB-TABS ---
    const truckSubTabs = [
        { tabId: 'truckLoaderTab', pageId: 'truckLoaderPage' },
        { tabId: 'savedTrucksTab', pageId: 'savedTrucksPage' },
        { tabId: 'billBookTab', pageId: 'billBookPage' },
        { tabId: 'ledgerTab', pageId: 'ledgerPage' },
        { tabId: 'analyticsTab', pageId: 'analyticsPage' }
    ];

    truckSubTabs.forEach(item => {
        const tab = document.getElementById(item.tabId);
        if (tab) {
            tab.addEventListener('click', (e) => {
                hideAllPages();
                const page = document.getElementById(item.pageId);
                if (page) page.classList.remove('hidden');

                // Reset all truck sub-tab styles
                truckSubTabs.forEach(t => {
                    const el = document.getElementById(t.tabId);
                    if(el) {
                        el.classList.remove('border-indigo-600', 'text-indigo-600', 'border-blue-500', 'text-blue-500', 'border-orange-500', 'text-orange-500', 'border-emerald-600', 'text-emerald-600', 'border-rose-600', 'text-rose-600');
                        el.classList.add('border-transparent', 'text-gray-500');
                    }
                });

                // Apply active style based on which tab was clicked
                e.target.classList.remove('border-transparent', 'text-gray-500');
                if(item.tabId === 'truckLoaderTab') e.target.classList.add('border-indigo-600', 'text-indigo-600');
                if(item.tabId === 'savedTrucksTab') e.target.classList.add('border-blue-500', 'text-blue-500');
                if(item.tabId === 'billBookTab') e.target.classList.add('border-orange-500', 'text-orange-500');
                if(item.tabId === 'ledgerTab') e.target.classList.add('border-emerald-600', 'text-emerald-600');
                if(item.tabId === 'analyticsTab') e.target.classList.add('border-rose-600', 'text-rose-600');
                
                // If special render functions exist, call them
                if (item.tabId === 'savedTrucksTab' && typeof renderSavedTrucks === 'function') renderSavedTrucks();
                if (item.tabId === 'billBookTab' && typeof renderBillBook === 'function') renderBillBook();
                if (item.tabId === 'ledgerTab' && typeof renderLedgerParties === 'function') renderLedgerParties();
                if (item.tabId === 'analyticsTab' && typeof renderAnalytics === 'function') renderAnalytics();
            });
        }
    });

    // --- KARIGAAR SUB-TABS (NEW ATTENDANCE LOGIC ADDED HERE) ---
    const karigaarSubTabs = [
        { tabId: 'karigaarTab', pageId: 'karigaarPage', color: 'purple' },
        { tabId: 'savedKarigaarTab', pageId: 'savedKarigaarPage', color: 'purple' },
        { tabId: 'attendanceTab', pageId: 'attendancePage', color: 'pink' } // New Attendance Tab
    ];

    karigaarSubTabs.forEach(item => {
        const tab = document.getElementById(item.tabId);
        if (tab) {
            tab.addEventListener('click', (e) => {
                hideAllPages();
                const page = document.getElementById(item.pageId);
                if (page) page.classList.remove('hidden');

                // Reset all Karigaar sub-tab styles
                karigaarSubTabs.forEach(t => {
                    const el = document.getElementById(t.tabId);
                    if(el) {
                        el.classList.remove('border-purple-600', 'text-purple-600', 'border-pink-500', 'text-pink-500');
                        el.classList.add('border-transparent', 'text-gray-500');
                    }
                });

                // Apply active style
                e.target.classList.remove('border-transparent', 'text-gray-500');
                e.target.classList.add(`border-${item.color}-600`, `text-${item.color}-600`);
                if(item.color === 'pink') e.target.classList.add('border-pink-500', 'text-pink-500');

                // Auto-load today's date if opening attendance
                if (item.tabId === 'attendanceTab') {
                    if (!document.getElementById('attendanceDate').value) {
                        // Creates a date string formatted as YYYY-MM-DD that uses the local timezone (IST)
                        const today = new Date();
                        const year = today.getFullYear();
                        const month = String(today.getMonth() + 1).padStart(2, '0');
                        const day = String(today.getDate()).padStart(2, '0');
                        document.getElementById('attendanceDate').value = `${year}-${month}-${day}`;
                        
                        if (typeof loadDailyAttendance === 'function') loadDailyAttendance();
                    }
                }
            });
        }
    });
});