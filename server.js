const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

// Temporary drop-box: stores outgoing messages waiting for pickup by target tmail
let dropBox = {};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API: Send a message package to the drop-box
app.post('/api/send-file', (req, res) => {
    const { recipient, emailPackage } = req.body;
    const cleanRecipient = recipient ? recipient.toLowerCase().trim() : '';

    if (!cleanRecipient) {
        return res.status(400).json({ error: 'Recipient address required.' });
    }

    if (!dropBox[cleanRecipient]) {
        dropBox[cleanRecipient] = [];
    }

    // Drop the package into their queue
    dropBox[cleanRecipient].push(emailPackage);
    res.json({ success: true });
});

// API: Check and pull incoming message packages for a specific account
app.get('/api/fetch-mail/:tmail', (req, res) => {
    const tmail = req.params.tmail.toLowerCase().trim();
    const incomingPackages = dropBox[tmail] || [];

    // Clear them from the drop-box once downloaded to the device
    if (incomingPackages.length > 0) {
        dropBox[tmail] = [];
    }

    res.json({ packages: incomingPackages });
});

app.listen(PORT, () => {
    console.log(`Tmail Drop-Box server running on port ${PORT}`);
});
