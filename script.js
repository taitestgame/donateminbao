let socket;
let isRunning = false;

// DOM Elements
const logList = document.getElementById('log-list');
const hostIdInput = document.getElementById('host-id');
const toggleBtn = document.getElementById('toggle-btn');
const statusText = document.getElementById('status-text');
const statusDot = document.getElementById('status-dot');
const vipGrid = document.getElementById('vip-grid');
const vipModal = document.getElementById('vip-modal');
const vipForm = document.getElementById('vip-form');
const addVipBtn = document.getElementById('add-vip-btn');
const closeModal = document.querySelector('.close');

// Initialize
async function init() {
    const res = await fetch('/api/config');
    const config = await res.json();
    
    hostIdInput.value = config.host_id;
    updateStatus(config.running);
    renderVips(config.vips);
    
    connectWebSocket();
}

function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

    socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'init') {
            msg.logs.forEach(addLog);
        } else if (msg.type === 'join') {
            addLog(msg);
        } else if (msg.type === 'status') {
            statusText.innerText = msg.data;
        } else if (msg.type === 'error') {
            alert('Error: ' + msg.data);
        }
    };

    socket.onclose = () => {
        setTimeout(connectWebSocket, 3000);
    };
}

function updateStatus(running) {
    isRunning = running;
    if (running) {
        toggleBtn.innerHTML = '<i class="fas fa-stop"></i> <span>Stop Monitoring</span>';
        toggleBtn.classList.replace('btn-primary', 'btn-danger');
        statusDot.classList.add('active');
        statusText.innerText = 'Running';
    } else {
        toggleBtn.innerHTML = '<i class="fas fa-play"></i> <span>Start Monitoring</span>';
        toggleBtn.classList.replace('btn-danger', 'btn-primary');
        statusDot.classList.remove('active');
        statusText.innerText = 'Stopped';
    }
}

function addLog(data) {
    const item = document.createElement('div');
    item.className = 'log-item';
    const time = new Date().toLocaleTimeString();
    item.innerHTML = `
        <span class="user">@${data.user}</span> 
        <span class="nickname">${data.nickname || ''}</span> joined
        <span class="time">${time}</span>
    `;
    logList.prepend(item);
    if (logList.children.length > 50) logList.lastChild.remove();
}

function renderVips(vips) {
    vipGrid.innerHTML = '';
    vips.forEach(vip => {
        const card = document.createElement('div');
        card.className = 'vip-card';
        card.innerHTML = `
            <div class="user-info">
                <div class="avatar"><i class="fas fa-user"></i></div>
                <div class="details">
                    <h4>${vip.nickname || vip.id}</h4>
                    <p>@${vip.id}</p>
                </div>
            </div>
            <div class="actions">
                <button class="btn-danger" onclick="deleteVip('${vip.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        vipGrid.appendChild(card);
    });
}

// Event Listeners
toggleBtn.onclick = async () => {
    const endpoint = isRunning ? '/api/stop' : '/api/start';
    const body = isRunning ? {} : { host_id: hostIdInput.value };
    
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    
    if (res.ok) {
        updateStatus(!isRunning);
    }
};

addVipBtn.onclick = () => {
    vipModal.style.display = 'block';
    vipForm.reset();
};

closeModal.onclick = () => vipModal.style.display = 'none';

window.onclick = (event) => {
    if (event.target == vipModal) vipModal.style.display = 'none';
};

vipForm.onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('user_id', document.getElementById('vip-id').value);
    formData.append('nickname', document.getElementById('vip-nickname').value);
    const audioFile = document.getElementById('vip-audio').files[0];
    if (audioFile) formData.append('audio', audioFile);

    const res = await fetch('/api/vips/add', {
        method: 'POST',
        body: formData
    });

    if (res.ok) {
        const data = await res.json();
        vipModal.style.display = 'none';
        // Refresh VIP list
        const configRes = await fetch('/api/config');
        const config = await configRes.json();
        renderVips(config.vips);
    }
};

async function deleteVip(id) {
    if (!confirm(`Delete VIP @${id}?`)) return;
    const res = await fetch(`/api/vips/${id}`, { method: 'DELETE' });
    if (res.ok) {
        const configRes = await fetch('/api/config');
        const config = await configRes.json();
        renderVips(config.vips);
    }
}

document.getElementById('vip-audio').onchange = function() {
    const fileName = this.files[0]?.name || 'Choose File';
    this.nextElementSibling.querySelector('span').innerText = fileName;
};

init();
