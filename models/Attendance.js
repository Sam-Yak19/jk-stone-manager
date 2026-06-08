const mongoose = require('mongoose');

// Blueprint for a single Karigaar's daily status
const WorkerStatusSchema = new mongoose.Schema({
    karigaarName: { type: String, required: true },
    status: { type: String, enum: ['Present', 'Absent', 'Half'], default: 'Present' }
});

// Blueprint for the Daily Register
const AttendanceSchema = new mongoose.Schema({
    date: { type: String, required: true, unique: true }, // Format: YYYY-MM-DD so we only have one register per day
    records: [WorkerStatusSchema]
}, { timestamps: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);