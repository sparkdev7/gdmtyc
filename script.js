// Tab handling
const tabs = document.querySelectorAll('.tab');
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.getElementById(tab.dataset.tab).style.display = 'block';
  });
});

// Variables for temporary email
let currentEmail = '';

// Generate random email for 1secmail
function generateRandomEmail() {
  const domains = ['1secmail.com', '1secmail.org', '1secmail.net'];
  const randomName = Math.random().toString(36).substring(2, 10);
  return `${randomName}@${domains[Math.floor(Math.random() * domains.length)]}`;
}

// Get messages from the email inbox
async function getMessages(email) {
  const [user, domain] = email.split('@');
  const res = await fetch(`https://www.1secmail.com/api/v1/?action=getMessages&login=${user}&domain=${domain}`);
  return await res.json();
}

// Get content of a specific message
async function getMessageContent(email, id) {
  const [user, domain] = email.split('@');
  const res = await fetch(`https://www.1secmail.com/api/v1/?action=readMessage&login=${user}&domain=${domain}&id=${id}`);
  return await res.json();
}

// Refresh inbox and display emails
async function refreshInbox() {
  if (!currentEmail) return alert('Please generate a temporary email first.');
  const inboxList = document.getElementById('inboxList');
  inboxList.innerHTML = 'Loading...';
  const messages = await getMessages(currentEmail);
  inboxList.innerHTML = '';
  if (messages.length === 0) {
    inboxList.innerHTML = '<li>No new emails.</li>';
    document.getElementById('mailContent').innerHTML = '';
    return;
  }
  messages.forEach(msg => {
    const li = document.createElement('li');
    li.textContent = `From: ${msg.from} | Subject: ${msg.subject} | Date: ${msg.date}`;
    li.style.cursor = 'pointer';
    li.onclick = async () => {
      const mail = await getMessageContent(currentEmail, msg.id);
      document.getElementById('mailContent').innerHTML = `
        <h3>${mail.subject}</h3>
        <p><b>From:</b> ${mail.from}</p>
        <p><b>To:</b> ${mail.to}</p>
        <p><b>Date:</b> ${mail.date}</p>
        <hr/>
        <pre>${mail.textBody || mail.htmlBody || '(No content)'}</pre>
      `;
    };
    inboxList.appendChild(li);
  });
}

// Button to generate temporary email
document.getElementById('genMailBtn').onclick = () => {
  currentEmail = generateRandomEmail();
  document.getElementById('emailGenerated').textContent = `Generated email: ${currentEmail}`;
  document.getElementById('inboxList').innerHTML = '';
  document.getElementById('mailContent').innerHTML = '';
};

// Button to refresh inbox
document.getElementById('refreshInboxBtn').onclick = refreshInbox;

// Generate a secure random password
function generatePassword(length = 16) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+{}[]";
  let pass = "";
  for (let i = 0; i < length; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

// SHA1 hashing using Web Crypto API
async function sha1Hash(str) {
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// Check password against Have I Been Pwned API using k-anonymity
async function checkHIBP(password) {
  const sha1 = await sha1Hash(password);
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
  const text = await res.text();
  const lines = text.split('\n');
  for (const line of lines) {
    const [hashSuffix, count] = line.split(':');
    if (hashSuffix === suffix) return parseInt(count);
  }
  return 0;
}

// Save email + password data in localStorage
function saveData(page, email, password) {
  let data = JSON.parse(localStorage.getItem('mailPassList') || '[]');
  data.push({ page, email, password });
  localStorage.setItem('mailPassList', JSON.stringify(data));
  loadSavedList();
}

// Load saved data list from localStorage
function loadSavedList() {
  const list = document.getElementById('list');
  list.innerHTML = '';
  const savedData = JSON.parse(localStorage.getItem('mailPassList') || '[]');
  for (const item of savedData) {
    const li = document.createElement('li');
    li.textContent = `[${item.page}] ${item.email} — ${item.password}`;
    list.appendChild(li);
  }
}

// Button to generate password
document.getElementById('generateBtn').onclick = () => {
  const pass = generatePassword();
  document.getElementById('password').value = pass;
  const result = document.getElementById('result');
  result.textContent = 'Password generated.';
  result.className = 'result safe';
};

// Button to check password on Have I Been Pwned
document.getElementById('checkBtn').onclick = async () => {
  const pass = document.getElementById('password').value;
  if (!pass) {
    alert('Please generate or enter a password first.');
    return;
  }
  const result = document.getElementById('result');
  result.textContent = 'Checking Have I Been Pwned...';
  const count = await checkHIBP(pass);
  if (count > 0) {
    result.textContent = `⚠️ Password found ${count} times. Not safe.`;
    result.className = 'result pwned';
  } else {
    result.textContent = '✔️ Password not found, safe to use.';
    result.className = 'result safe';
  }
};

// Button to save page + email + password
document.getElementById('saveBtn').onclick = () => {
  const page = document.getElementById('page').value.trim();
  const email = document.getElementById('email').value.trim();
  const pass = document.getElementById('password').value.trim();
  if (!page || !email || !pass) {
    alert('Please fill out all fields.');
    return;
  }
  saveData(page, email, pass);
  const result = document.getElementById('result');
  result.textContent = 'Saved successfully.';
  result.className = 'result safe';

  // Clear inputs
  document.getElementById('page').value = '';
  document.getElementById('email').value = '';
  document.getElementById('password').value = '';
};

// Load saved list on page load
window.onload = () => {
  loadSavedList();
};
