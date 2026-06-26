// js/attendance.js

// 1. Maintain a master roster of all Karigaar names (Active + Cloud)
async function getKarigaarRoster() {
    let roster = new Set();
    
    // Grab active ones from your whiteboard
    const localData = localStorage.getItem('jkKarigaarData');
    if (localData) {
        Object.keys(JSON.parse(localData)).forEach(name => roster.add(name));
    }

    // Grab historical ones from the cloud
    try {
        const response = await fetch('/api/karigaars');
        if (response.ok) {
            const result = await response.json();
            result.data.forEach(block => roster.add(block.karigaarName));
        }
    } catch(e) { console.log("Cloud sync skipped for roster."); }

    return Array.from(roster).sort();
}

// 2. Load the Daily Register UI
window.loadDailyAttendance = async function() {
    const dateStr = document.getElementById('attendanceDate').value;
    const listContainer = document.getElementById('attendanceList');
    if (!dateStr) return;

    listContainer.innerHTML = '<p class="text-center text-pink-500 font-bold animate-pulse py-4">Fetching roster...</p>';

    // Get the master list of workers
    const roster = await getKarigaarRoster();
    
    if (roster.length === 0) {
        listContainer.innerHTML = '<p class="text-gray-500 italic text-center py-4">No Karigaars found. Add some in the "Active Work" tab first.</p>';
        return;
    }

    // Fetch today's data from Cloud to see if we already marked them
    let savedRecords = [];
    try {
        const response = await fetch(`/api/attendance/day/${dateStr}`);
        if (response.ok) {
            const result = await response.json();
            if (result.data && result.data.records) {
                savedRecords = result.data.records;
            }
        }
    } catch(e) { console.log("No previous data found for today."); }

    // Build the UI rows
    listContainer.innerHTML = '';
    roster.forEach((name, index) => {
        // Did we save a status for this guy today? Default to 'Present' if not.
        const existingRecord = savedRecords.find(r => r.karigaarName === name);
        const status = existingRecord ? existingRecord.status : 'Present';

        listContainer.innerHTML += `
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 p-3 rounded-lg border border-gray-200" data-karigaar="${name}">
                <span class="font-bold text-gray-800 text-lg mb-2 sm:mb-0">${name}</span>
                <div class="flex gap-2">
                    <label class="cursor-pointer">
                        <input type="radio" name="status_${index}" value="Present" class="peer sr-only" ${status === 'Present' ? 'checked' : ''}>
                        <div class="px-4 py-1 rounded border-2 border-gray-200 peer-checked:bg-green-100 peer-checked:border-green-500 peer-checked:text-green-700 font-bold transition-all">P</div>
                    </label>
                    <label class="cursor-pointer">
                        <input type="radio" name="status_${index}" value="Half" class="peer sr-only" ${status === 'Half' ? 'checked' : ''}>
                        <div class="px-4 py-1 rounded border-2 border-gray-200 peer-checked:bg-yellow-100 peer-checked:border-yellow-500 peer-checked:text-yellow-700 font-bold transition-all">H</div>
                    </label>
                    <label class="cursor-pointer">
                        <input type="radio" name="status_${index}" value="Absent" class="peer sr-only" ${status === 'Absent' ? 'checked' : ''}>
                        <div class="px-4 py-1 rounded border-2 border-gray-200 peer-checked:bg-red-100 peer-checked:border-red-500 peer-checked:text-red-700 font-bold transition-all">A</div>
                    </label>
                </div>
            </div>
        `;
    });
};

// 3. Save the Daily Register to Cloud
window.saveDailyAttendance = async function() {
    const dateStr = document.getElementById('attendanceDate').value;
    if (!dateStr) return alert("Please select a date first.");

    const rows = document.querySelectorAll('#attendanceList > div');
    const records = [];

    rows.forEach(row => {
        const name = row.getAttribute('data-karigaar');
        const selectedRadio = row.querySelector('input[type="radio"]:checked');
        if (selectedRadio) {
            records.push({ karigaarName: name, status: selectedRadio.value });
        }
    });

    if (records.length === 0) return alert("No attendance data to save.");

    try {
        const response = await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: dateStr, records: records })
        });

        if (response.ok) {
            alert(`✅ Attendance for ${dateStr} saved successfully!`);
            generateMonthlyReport(); // Auto-update the report if they are looking at the same month
        } else {
            const err = await response.json();
            alert(`Error: ${err.error}`);
        }
    } catch (error) {
        alert("Failed to connect to the backend server.");
    }
};

// 4. Generate the Monthly Salary Report
window.generateMonthlyReport = async function() {
    const monthStr = document.getElementById('attendanceMonth').value;
    const tbody = document.getElementById('attendanceReportBody');
    if (!monthStr) return;

    tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-8 text-center text-indigo-500 font-bold animate-pulse">Calculating Monthly Data... ☁️</td></tr>';

    try {
        // Fetch all days in that month
        const response = await fetch(`/api/attendance/${monthStr}`);
        const result = await response.json();
        const monthlyData = result.data;

        if (monthlyData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-8 text-center text-gray-500 italic">No attendance records found for this month.</td></tr>';
            return;
        }

        // Aggregate the math
        const stats = {};
        monthlyData.forEach(dayRecord => {
            dayRecord.records.forEach(worker => {
                if (!stats[worker.karigaarName]) {
                    stats[worker.karigaarName] = { P: 0, A: 0, H: 0, TotalDays: 0 };
                }
                
                if (worker.status === 'Present') {
                    stats[worker.karigaarName].P += 1;
                    stats[worker.karigaarName].TotalDays += 1;
                } else if (worker.status === 'Half') {
                    stats[worker.karigaarName].H += 1;
                    stats[worker.karigaarName].TotalDays += 0.5;
                } else if (worker.status === 'Absent') {
                    stats[worker.karigaarName].A += 1;
                }
            });
        });

        // Draw the Table
        tbody.innerHTML = '';
        Object.keys(stats).sort().forEach(name => {
            const data = stats[name];
            tbody.innerHTML += `
                <tr class="hover:bg-indigo-50 transition-colors">
                    <td class="px-4 py-3 font-bold text-gray-800">${name}</td>
                    <td class="px-4 py-3 text-center font-bold text-green-600">${data.P}</td>
                    <td class="px-4 py-3 text-center font-bold text-red-500">${data.A}</td>
                    <td class="px-4 py-3 text-center font-bold text-yellow-600">${data.H}</td>
                    <td class="px-4 py-3 text-right text-lg font-extrabold text-indigo-700">${data.TotalDays}</td>
                </tr>
            `;
        });

    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-8 text-center text-red-500 font-bold">Failed to load monthly data. Is the server running?</td></tr>';
    }
};