const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'dropbox.json');

// Helper to load drop-box from disk
function loadDropBox() {
    try {
        if (fs.existsSync(DB_FILE)) {
            return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Error reading drop-box file', e);
    }
    return {};
}

// Helper to save drop-box to disk
function saveDropBox(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error writing drop-box file', e);
    }
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API: Send a message package to the persistent drop-box
app.post('/api/send-file', (req, res) => {
    const { recipient, emailPackage } = req.body;
    const cleanRecipient = recipient ? recipient.toLowerCase().trim() : '';

    if (!cleanRecipient) {
        return res.status(400).json({ error: 'Recipient address required.' });
    }

    let dropBox = loadDropBox();
    if (!dropBox[cleanRecipient]) {
        dropBox[cleanRecipient] = [];
    }

    // Drop the package into their queue
    dropBox[cleanRecipient].push(emailPackage);
    saveDropBox(dropBox);

    res.json({ success: true });
});

// API: Check and pull incoming message packages
app.get('/api/fetch-mail/:tmail', (req, res) => {
    const tmail = req.params.tmail.toLowerCase().trim();
    let dropBox = loadDropBox();
    const incomingPackages = dropBox[tmail] || [];

    // Clear them from the drop-box once downloaded to the device
    if (incomingPackages.length > 0) {
        dropBox[tmail] = [];
        saveDropBox(dropBox);
    }

    res.json({ packages: incomingPackages });
});

app.listen(PORT, () => {
    console.log(`Tmail Persistent Drop-Box server running on port ${PORT}`);
});
            
