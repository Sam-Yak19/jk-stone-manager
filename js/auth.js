// js/auth.js

const API_BASE_URL = '/api'; // We will change this later for AWS

function toggleAuthMode(mode) {
    if (mode === 'register') {
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('registerForm').classList.remove('hidden');
        document.getElementById('authSubtitle').textContent = 'Create a new company account';
    } else {
        document.getElementById('registerForm').classList.add('hidden');
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('authSubtitle').textContent = 'Sign in to your account';
    }
}

// 1. Check if user is already logged in when the page loads
function checkAuth() {
    const token = localStorage.getItem('jk_auth_token');
    const authPage = document.getElementById('authPage');
    
    if (token) {
        // Logged in! Hide the auth screen.
        authPage.classList.add('hidden');
        
        // Show the user's company name in the header
        const userData = JSON.parse(localStorage.getItem('jk_user_data') || '{}');
        const companyDisplay = document.getElementById('companyNameDisplay');
        if (companyDisplay && userData.companyName) {
            companyDisplay.textContent = userData.companyName;
        }
    } else {
        // Not logged in! Show the auth screen and block the app.
        authPage.classList.remove('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();

    // 2. Handle Login Submit
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;

            try {
                const res = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();
                
                if (data.success) {
                    // Save Token & User Info
                    localStorage.setItem('jk_auth_token', data.token);
                    localStorage.setItem('jk_user_data', JSON.stringify(data.user));
                    
                    alert(`Welcome back, ${data.user.companyName}!`);
                    window.location.reload(); // Refresh the page to load the app
                } else {
                    alert(data.message || 'Login failed. Please check your credentials.');
                }
            } catch (err) {
                alert('Server error. Please make sure your backend server is running.');
            }
        });
    }

    // 3. Handle Register Submit
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const companyName = document.getElementById('regCompany').value;
            const username = document.getElementById('regUsername').value;
            const password = document.getElementById('regPassword').value;

            try {
                const res = await fetch(`${API_BASE_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ companyName, username, password })
                });
                const data = await res.json();
                
                if (data.success) {
                    alert('Account created successfully! You can now log in.');
                    toggleAuthMode('login'); // Switch back to login view
                    document.getElementById('loginUsername').value = username;
                    document.getElementById('loginPassword').value = '';
                } else {
                    alert(data.message || 'Registration failed.');
                }
            } catch (err) {
                alert('Server error. Please make sure your backend server is running.');
            }
        });
    }
});

// 4. Global Logout Function
window.logoutUser = function() {
    if (!confirm('Are you sure you want to log out?')) return;
    
    // Clear security tokens
    localStorage.removeItem('jk_auth_token');
    localStorage.removeItem('jk_user_data');
    
    // Clear user-specific app data from local storage so the next person can't see it
    localStorage.removeItem('jkMineTruckArchive');
    localStorage.removeItem('jk_mine_ledger');
    localStorage.removeItem('jk_ledger_metadata');
    
    window.location.reload(); // Send back to login screen
};