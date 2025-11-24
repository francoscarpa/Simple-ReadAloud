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

document.addEventListener('DOMContentLoaded', async () => {
    let { language, rate } = await chrome.storage.local.get({ language: 'it-IT', rate: 2.4 });
    document.getElementById('language').value = language;
    document.getElementById('speed').value = rate;
    document.getElementById('speedValue').textContent = rate;
    // Query current tab for read aloud state
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getReadAloudState' }, function (response) {
            updateToggleButton(response && response.enabled);
        });
    });

    document.getElementById('speed').addEventListener('input', function () {
        document.getElementById('speedValue').textContent = this.value;
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