// Import the tools we installed
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Dispatch = require('./models/Dispatch');
const Karigaar = require('./models/Karigaar');
const MineTruck = require('./models/MineTruck');
const Attendance = require('./models/Attendance');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const path = require('path'); // Import the new User model

// Set up the Express app
const app = express();

// Middleware (Allows your frontend to talk to this backend)
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ Successfully connected to MongoDB Atlas!');
    })
    .catch((error) => {
        console.error('❌ MongoDB Connection Error:', error.message);
    });

// A simple test route
app.get('/', (req, res) => {
    res.send('JK Stone Manager API is running!');
});

// ==========================================
// REAL API ROUTES
// ==========================================

// ==========================================
// AUTHENTICATION ROUTES (LOGIN / REGISTER)
// ==========================================

// Register a New User
app.post('/api/auth/register', async (req, res) => {
    try {
        const { companyName, username, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Username already taken.' });
        }

        // Encrypt the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create the user
        const newUser = new User({
            companyName,
            username,
            password: hashedPassword
        });

        await newUser.save();
        res.status(201).json({ success: true, message: 'Account created successfully!' });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Login an Existing User
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find the user
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Check the password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid password.' });
        }

        // Generate a digital ID Card (Token) valid for 7 days
        const token = jwt.sign(
            { userId: user._id, companyName: user.companyName, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json({
            success: true,
            token: token,
            user: { id: user._id, companyName: user.companyName, username: user.username }
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// 1. CREATE: Save a new truck dispatch from the frontend
app.post('/api/dispatches', async (req, res) => {
    try {
        // req.body contains the exact data sent from your HTML website
        const newDispatch = new Dispatch(req.body);
        
        // Save it to MongoDB
        const savedDispatch = await newDispatch.save();
        
        // Send a success response back to the website
        res.status(201).json({
            success: true,
            message: 'Dispatch saved successfully!',
            data: savedDispatch
        });
    } catch (error) {
        console.error("Save Error:", error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// 2. READ: Get all dispatches to show in the Bill Book / Dashboard
app.get('/api/dispatches', async (req, res) => {
    try {
        // Fetch all dispatches, sorted by newest first
        const allDispatches = await Dispatch.find().sort({ createdAt: -1 });
        
        res.status(200).json({
            success: true,
            data: allDispatches
        });
    } catch (error) {
        console.error("Fetch Error:", error);
        res.status(500).json({ success: false, error: 'Server error fetching data' });
    }
});

// 3. DELETE: Remove a truck from the database securely
app.delete('/api/dispatches/:id', async (req, res) => {
    try {
        // Find the truck using your custom ID (e.g., 'TRK-12345') and delete it
        const deletedDispatch = await Dispatch.findOneAndDelete({ id: req.params.id });
        
        if (!deletedDispatch) {
            return res.status(404).json({ success: false, message: 'Truck not found in cloud' });
        }
        
        res.status(200).json({ success: true, message: 'Truck permanently deleted' });
    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ success: false, error: 'Server error deleting data' });
    }
});

// ==========================================
// KARIGAAR API ROUTES
// ==========================================

// Save a finalized Karigaar Work Sheet
app.post('/api/karigaars', async (req, res) => {
    try {
        const newWork = new Karigaar(req.body);
        const savedWork = await newWork.save();
        res.status(201).json({ success: true, data: savedWork });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Fetch all Karigaar Work Sheets
app.get('/api/karigaars', async (req, res) => {
    try {
        const allWork = await Karigaar.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: allWork });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete a Karigaar Work Sheet
app.delete('/api/karigaars/:id', async (req, res) => {
    try {
        await Karigaar.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Work deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// MINE TRUCK API ROUTES
// ==========================================

// Log a new incoming Mine Truck
app.post('/api/minetrucks', async (req, res) => {
    try {
        const newTruck = new MineTruck(req.body);
        const savedTruck = await newTruck.save();
        res.status(201).json({ success: true, data: savedTruck });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Fetch all Mine Trucks
app.get('/api/minetrucks', async (req, res) => {
    try {
        const allTrucks = await MineTruck.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: allTrucks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// ==========================================
// ATTENDANCE API ROUTES
// ==========================================

// Save or Update a Daily Register
app.post('/api/attendance', async (req, res) => {
    try {
        const { date, records } = req.body;
        // This will find the existing date and update it, or create a new one if it doesn't exist
        const updatedRegister = await Attendance.findOneAndUpdate(
            { date: date }, 
            { date: date, records: records },
            { new: true, upsert: true } // upsert = Create if not found
        );
        res.status(200).json({ success: true, data: updatedRegister });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Fetch Attendance for a specific Month (Format: YYYY-MM)
app.get('/api/attendance/:month', async (req, res) => {
    try {
        const monthQuery = req.params.month; // e.g., "2026-06"
        // Find all dates that start with this month
        const monthlyData = await Attendance.find({ date: { $regex: `^${monthQuery}` } });
        res.status(200).json({ success: true, data: monthlyData });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Fetch a single day's attendance (to load previous marks)
app.get('/api/attendance/day/:date', async (req, res) => {
    try {
        const dailyData = await Attendance.findOne({ date: req.params.date });
        res.status(200).json({ success: true, data: dailyData });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Serve all HTML, CSS, and JS files from the main folder
app.use(express.static(__dirname));

// If someone visits the main link, send them the index.html page
  app.get('/{*splat}', (req, res) => {
      res.sendFile(path.join(__dirname, 'index.html'));
  });

// Turn the server on
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
}); 