// Import the tools we installed
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Dispatch = require('./models/Dispatch');
const Karigaar = require('./models/Karigaar');
const MineTruck = require('./models/MineTruck');
const Attendance = require('./models/Attendance');
const Bill = require('./models/Bill');
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
//app.get('/', (req, res) => {
//   res.send('JK Stone Manager API is running!');
//});

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
        const { ownerId } = req.query; // Grab the logged-in user's ID
        let query = {};
        if (ownerId) query.ownerId = ownerId; // ONLY find trucks for this user!

        const dispatches = await Dispatch.find(query).sort({ timestamp: -1 });
        res.status(200).json({ success: true, data: dispatches });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
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
        const { ownerId } = req.query;
        let query = {};
        if (ownerId) query.ownerId = ownerId;

        const karigaarWork = await Karigaar.find(query).sort({ timestamp: -1 });
        res.status(200).json({ success: true, data: karigaarWork });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
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
        const { ownerId } = req.query;
        let query = {};
        if (ownerId) query.ownerId = ownerId;

        const minetrucks = await minetrucks.find(query).sort({ timestamp: -1 });
        res.status(200).json({ success: true, data: minetrucks });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// SAVE A NEW MINE TRUCK
app.post('/api/minetrucks', async (req, res) => {
    try {
        const newMineTruck = new MineTruck(req.body);
        const savedTruck = await newMineTruck.save();
        res.status(201).json({ success: true, data: savedTruck });
    } catch (error) {
        console.error('Error saving mine truck:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


// ==========================================
// ATTENDANCE API ROUTES
// ==========================================

// ==========================================
// 4. ATTENDANCE ROUTES
// ==========================================

// A. SAVE OR UPDATE DAILY ATTENDANCE
app.post('/api/attendance', async (req, res) => {
    try {
        const { date, records, ownerId } = req.body;
        
        // Find if this specific company already saved attendance for this date.
        // If yes, update it. If no, create a new one (upsert: true).
        const updatedAttendance = await Attendance.findOneAndUpdate(
            { date: date, ownerId: ownerId }, 
            { records: records },
            { new: true, upsert: true } 
        );
        
        res.status(200).json({ success: true, data: updatedAttendance });
    } catch (error) {
        console.error('Error saving attendance:', error);
        res.status(500).json({ error: 'Server error saving attendance' });
    }
});

// B. GET SINGLE DAY ATTENDANCE (To load the UI checkboxes)
app.get('/api/attendance/day/:date', async (req, res) => {
    try {
        const { ownerId } = req.query;
        // Find attendance matching BOTH the exact date and the company ID
        const attendance = await Attendance.findOne({ date: req.params.date, ownerId: ownerId });
        
        res.status(200).json({ success: true, data: attendance });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// C. GET MONTHLY ATTENDANCE (For the Salary Report)
app.get('/api/attendance/month/:monthStr', async (req, res) => {
    try {
        const { ownerId } = req.query;
        
        // Find all records where the date STARTS WITH the month (e.g., "2026-06") AND matches company
        const attendance = await Attendance.find({ 
            date: { $regex: '^' + req.params.monthStr },
            ownerId: ownerId
        });
        
        res.status(200).json({ success: true, data: attendance });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});


// ==========================================
// BILLING API ROUTES
// ==========================================

// 1. SAVE A NEW BILL
app.post('/api/bills', async (req, res) => {
    try {
        const newBill = new Bill(req.body);
        const savedBill = await newBill.save();
        
        res.status(201).json({ 
            success: true, 
            message: 'Bill saved successfully', 
            bill: savedBill 
        });
    } catch (error) {
        console.error('Error saving bill:', error);
        
        // Check if it's a duplicate bill ID error
        if (error.code === 11000) {
            return res.status(400).json({ 
                success: false, 
                message: 'A bill with this ID already exists!' 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Server error while saving the bill' 
        });
    }
});

// 2. FETCH BILLS (With optional filters for Analytics later)
app.get('/api/bills', async (req, res) => {
    try {
        // We can filter by the user logged in (ownerId) or specific month
        const { ownerId, monthKey } = req.query;
        let query = {};
        
        if (ownerId) query.ownerId = ownerId;
        if (monthKey) query.monthKey = monthKey;

        // Fetch bills and sort them by newest first
        const bills = await Bill.find(query).sort({ timestamp: -1 });
        
        res.status(200).json({ success: true, bills });
    } catch (error) {
        console.error('Error fetching bills:', error);
        res.status(500).json({ success: false, message: 'Server error fetching bills' });
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

// Middleware to protect routes
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user; // This attaches the user's ID to the request!
        next();
    });
};

app.post('/api/bills', authenticateToken, async (req, res) => {
    const newBill = new Bill({
        ...req.body,
        ownerId: req.user.userId // The security guard automatically stamps the owner!
    });
    await newBill.save();
    res.json({ success: true });
});