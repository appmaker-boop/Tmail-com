const colors = ['#1a73e8', '#d93025', '#f29900', '#188038', '#9334e6', '#0097a7'];

function getRandomColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

let currentUser = null;
let currentFolder = 'inbox';

window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('tmail_device_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        loadApp(currentUser);
        syncIncomingMail(); // Check server for shared files on load
    }
});

function handleSignup(event) {
    event.preventDefault();
    const username = document.getElementById('username-input').value.trim();
    const password = document.getElementById('password-input').value;

    if (!username || !password) return;

    const lowerUser = username.toLowerCase();
    const secretTmail = `${lowerUser}@tmail.com`;
    const firstLetter = username.charAt(0).toUpperCase();
    const avatarColor = getRandomColor(username);

    currentUser = {
        username: username,
        tmail: secretTmail,
        firstLetter: firstLetter,
        color: avatarColor
    };

    // Initialize local device storage for this account if it doesn't exist
    const storageKey = `tmail_data_${secretTmail}`;
    if (!localStorage.getItem(storageKey)) {
        const initialMailbox = {
            inbox: [
                { id: Date.now(), sender: 'Tmail Team', recipient: secretTmail, subject: 'Welcome to Tmail!', snippet: 'Your device-stored inbox is ready.', body: `Welcome ${username}!\n\nYour emails now live directly on your device storage. When friends send files/messages, sync them from the drop-box.` }
            ],
            sent: [],
            drafts: []
        };
        localStorage.setItem(storageKey, JSON.stringify(initialMailbox));
    }

    localStorage.setItem('tmail_device_user', JSON.stringify(currentUser));
    
    document.getElementById('username-input').value = '';
    document.getElementById('password-input').value = '';

    loadApp(currentUser);
}

function loadApp(user) {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');

    const avatar = document.getElementById('user-avatar');
    avatar.style.backgroundColor = user.color;
    avatar.innerText = user.firstLetter;

    const menuAvatar = document.getElementById('menu-avatar-large');
    menuAvatar.style.backgroundColor = user.color;
    menuAvatar.innerText = user.firstLetter;

    document.getElementById('menu-username-display').innerText = user.username;
    document.getElementById('menu-email-display').innerText = user.tmail;

    renderEmailList();
    updateCounts();
}

function toggleMenu(event) {
    event.stopPropagation();
    const menu = document.getElementById('profile-menu');
    menu.classList.toggle('hidden');
}

window.addEventListener('click', () => {
    const menu = document.getElementById('profile-menu');
    if (menu && !menu.classList.contains('hidden')) {
        menu.classList.add('hidden');
    }
});

function handleLogout() {
    localStorage.removeItem('tmail_device_user');
    currentUser = null;
    
    document.getElementById('app-screen').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('profile-menu').classList.add('hidden');
}

function switchFolder(folder) {
    currentFolder = folder;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`nav-${folder}`).classList.add('active');
    renderEmailList();
}

function getDeviceMailbox() {
    if (!currentUser) return { inbox: [], sent: [], drafts: [] };
    const storageKey = `tmail_data_${currentUser.tmail}`;
    let data = localStorage.getItem(storageKey);
    return data ? JSON.parse(data) : { inbox: [], sent: [], drafts: [] };
}

function saveDeviceMailbox(mailbox) {
    if (!currentUser) return;
    const storageKey = `tmail_data_${currentUser.tmail}`;
    localStorage.setItem(storageKey, JSON.stringify(mailbox));
}

// Sync function: Downloads shared file packages from the server drop-box into device memory
async function syncIncomingMail() {
    if (!currentUser) return;
    try {
        const response = await fetch(`/api/fetch-mail/${currentUser.tmail}`);
        const data = await response.json();
        
        if (data.packages && data.packages.length > 0) {
            let mailbox = getDeviceMailbox();
            data.packages.forEach(pkg => {
                // Avoid duplicate entries
                if (!mailbox.inbox.some(m => m.id === pkg.id)) {
                    mailbox.inbox.push(pkg);
                }
            });
            saveDeviceMailbox(mailbox);
            renderEmailList();
        }
    } catch (e) {
        console.error('Sync failed', e);
    }
}

function updateCounts() {
    const mailbox = getDeviceMailbox();
    document.getElementById('inbox-count').innerText = mailbox.inbox.length;
    document.getElementById('sent-count').innerText = mailbox.sent.length;
    document.getElementById('drafts-count').innerText = mailbox.drafts.length;
}

function renderEmailList() {
    syncIncomingMail(); // Auto check for incoming shared files when rendering
    const container = document.getElementById('main-content-area');
    const mailbox = getDeviceMailbox();
    const folderList = mailbox[currentFolder] || [];

    if (folderList.length === 0) {
        container.innerHTML = `<div class="email-list"><div class="empty-folder">Your ${currentFolder} is empty</div></div>`;
        updateCounts();
        return;
    }

    let html = '<div class="email-list">';
    folderList.forEach((email, index) => {
        const displaySender = currentFolder === 'sent' ? `To: ${email.recipient}` : email.sender;
        html += `
            <div class="email-item" onclick="openEmail('${currentFolder}', ${index})">
                <span class="email-sender">${displaySender}</span>
                <span class="email-snippet"><b>${email.subject}</b> — ${email.snippet}</span>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
    updateCounts();
}

function openEmail(folder, index) {
    const mailbox = getDeviceMailbox();
    const email = mailbox[folder][index];
    const container = document.getElementById('main-content-area');

    container.innerHTML = `
        <button class="btn-back" onclick="renderEmailList()">← Back</button>
        <div class="email-reader">
            <div class="reader-header">
                <div>
                    <h2 style="font-size: 18px; margin-bottom: 4px;">${email.subject}</h2>
                    <p style="color: #5f6368; font-size: 12px; word-break: break-all;">From: ${email.sender}<br>To: ${email.recipient}</p>
                </div>
            </div>
            <div style="white-space: pre-line; font-size: 14px; line-height: 1.5; color: #202124;">${email.body}</div>
        </div>
    `;
}

function openCompose() {
    document.getElementById('compose-modal').classList.remove('hidden');
}

function closeCompose() {
    document.getElementById('compose-modal').classList.add('hidden');
    document.getElementById('compose-to').value = '';
    document.getElementById('compose-subject').value = '';
    document.getElementById('compose-body-text').value = '';
}

async function sendEmail() {
    const recipient = document.getElementById('compose-to').value.trim().toLowerCase();
    const subject = document.getElementById('compose-subject').value.trim() || '(No Subject)';
    const body = document.getElementById('compose-body-text').value.trim();

    if (!recipient) {
        alert('Please specify a recipient address.');
        return;
    }

    const emailPackage = {
        id: Date.now(),
        sender: currentUser.tmail,
        recipient: recipient,
        subject: subject,
        snippet: body.substring(0, 60) + '...',
        body: body
    };

    try {
        // Share the file package to the server drop-box
        const response = await fetch('/api/send-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipient, emailPackage })
        });

        const result = await response.json();
        if (!response.ok) {
            alert(result.error || 'Failed to send file package.');
            return;
        }

        // Save a copy to local device 'sent' folder
        let mailbox = getDeviceMailbox();
        mailbox.sent.push(emailPackage);
        saveDeviceMailbox(mailbox);

        closeCompose();
        renderEmailList();
        alert('Message file shared successfully!');
    } catch (e) {
        alert('Network error while sharing file.');
    }
}

function saveDraft() {
    const recipient = document.getElementById('compose-to').value.trim();
    const subject = document.getElementById('compose-subject').value.trim() || '(No Subject)';
    const body = document.getElementById('compose-body-text').value.trim();

    const draftEmail = {
        id: Date.now(),
        sender: currentUser.tmail,
        recipient: recipient || 'Draft recipient',
        subject: subject,
        snippet: body.substring(0, 60) + '...',
        body: body
    };

    let mailbox = getDeviceMailbox();
    mailbox.drafts.push(draftEmail);
    saveDeviceMailbox(mailbox);

    closeCompose();
    renderEmailList();
    alert('Draft saved locally!');
}
