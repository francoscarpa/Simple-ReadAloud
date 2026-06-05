function updateToggleButton(enabled) {
    const btn = document.getElementById('toggleReadAloudBtn');
    if (enabled) {
        btn.textContent = 'Read Aloud: ON';
        btn.style.backgroundColor = '#4caf50';
        btn.style.color = 'white';
    } else {
        btn.textContent = 'Read Aloud: OFF';
        btn.style.backgroundColor = '#f44336';
        btn.style.color = 'white';
    }
}

function updateHoverInfoToggle(enabled) {
    document.getElementById('hoverInfoEnabled').checked = enabled;
}

function setSpeedValue(value) {
    document.getElementById('speed').value = value;
    document.getElementById('speedValue').textContent = value;
}

document.addEventListener('DOMContentLoaded', async () => {
    let { language, rate } = await chrome.storage.local.get({ language: 'it-IT', rate: 2.4 });
    document.getElementById('language').value = language;
    setSpeedValue(rate);
    updateHoverInfoToggle(true);
    // Query current tab for read aloud state
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getReadAloudState' }, function (response) {
            updateToggleButton(response && response.enabled);
        });
    });

    document.getElementById('speed').addEventListener('input', function () {
        setSpeedValue(this.value);
    });

    document.querySelectorAll('.speedPresetBtn').forEach((button) => {
        button.addEventListener('click', function () {
            setSpeedValue(this.dataset.speed);
        });
    });

    document.getElementById('hoverInfoEnabled').addEventListener('change', function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'setHoverInfoEnabled', enabled: document.getElementById('hoverInfoEnabled').checked });
        });
    });

    document.getElementById('saveBtn').addEventListener('click', async () => {
        const language = document.getElementById('language').value;
        const rate = parseFloat(document.getElementById('speed').value);
        await chrome.storage.local.set({ language, rate });
        window.close();
    });

    document.getElementById('toggleReadAloudBtn').addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleReadAloud' }, function (response) {
                updateToggleButton(response && response.enabled);
            });
        });
    });
});