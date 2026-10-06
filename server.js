const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, 'db.json');

// Helper to introduce delay
const delayResponse = (req, res, next) => {
    const delay = parseInt(req.query.delay) || 0;
    if (delay > 0) {
        setTimeout(next, delay);
    } else {
        next();
    }
};

app.use(delayResponse);

// Read DB helper
const readDb = () => {
    const data = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(data);
};

// Write DB helper
const writeDb = (db) => {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
};

// Login API
app.post('/api/login', (req, res) => {
    const { userId, password } = req.body;
    const db = readDb();
    const user = db.users.find(u => u.userId === userId && u.password === password);

    if (user) {
        // Omitting password from response
        const { password, ...userInfo } = user;
        res.json({ success: true, user: userInfo });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// Get Records API (with role check conceptually via user profile)
app.get('/api/records', (req, res) => {
    const userId = parseInt(req.query.userId);
    const db = readDb();
    const user = db.users.find(u => u.id === userId);

    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'Admin') {
        // Admin gets all records
        res.json({ success: true, records: db.records });
    } else {
        // General User gets their own records
        const userRecords = db.records.filter(r => r.userId === userId);
        res.json({ success: true, records: userRecords });
    }
});

// Users Management API
app.get('/api/users', (req, res) => {
    const db = readDb();
    const usersList = db.users.map(({ password, ...u }) => u);
    res.json({ success: true, users: usersList });
});

// Users Management API - Update Role (Dummy Admin functionality)
app.put('/api/users/:id', (req, res) => {
    const { role } = req.body;
    const id = parseInt(req.params.id);
    const db = readDb();
    const userIndex = db.users.findIndex(u => u.id === id);

    if (userIndex !== -1) {
        db.users[userIndex].role = role;
        writeDb(db);
        res.json({ success: true, message: 'User updated successfully' });
    } else {
        res.status(404).json({ success: false, message: 'User not found' });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
