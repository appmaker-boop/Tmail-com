const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

// In-memory database object (stores all user mailboxes globally on the server)
let globalMailboxes = {};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API: Register or check account
app.post('/api/login', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });
    
    const tmail = `${username.toLowerCase().trim()}@tmail.com`;
    
    if (!globalMailboxes[tmail]) {
        globalMailboxes[tmail] = {
            inbox: [
                { id: Date.now(), sender: 'Tmail Team', recipient: tmail, subject: 'Welcome to Tmail!', snippet: 'Your server-backed inbox is ready.', body: `Welcome ${username}!\n\nYour live Tmail address is ${tmail}. Messages sent from other devices will now arrive here successfully.` }
            ],
            sent: [],
            drafts: []
        };
    }
    res.json({ tmail, mailbox: globalMailboxes[tmail] });
});

// API: Get mailbox data
app.get('/api/mailbox/:tmail', (req, res) => {
    const tmail = req.params.tmail;
    if (globalMailboxes[tmail]) {
        res.json(globalMailboxes[tmail]);
    } else {
        res.json({ inbox: [], sent: [], drafts: [] });
    }
});

// API: Send email between users
app.post('/api/send', (req, res) => {
    const { sender, recipient, subject, body } = req.body;
    const cleanRecipient = recipient ? recipient.toLowerCase().trim() : '';

    if (!cleanRecipient || !globalMailboxes[cleanRecipient]) {
        return res.status(404).json({ error: 'Recipient Tmail address does not exist.' });
    }

    const newEmail = {
        id: Date.now(),
        sender,
        recipient: cleanRecipient,
        subject: subject || '(No Subject)',
        snippet: (body || '').substring(0, 60) + '...',
        body: body || ''
    };

    // Push to recipient inbox
    globalMailboxes[cleanRecipient].inbox.push(newEmail);

    // Push to sender sent folder
    if (globalMailboxes[sender]) {
        globalMailboxes[sender].sent.push(newEmail);
    }

    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Tmail server running on port ${PORT}`);
});
