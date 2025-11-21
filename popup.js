document.addEventListener('DOMContentLoaded', async () => {
    let { language, rate } = await chrome.storage.local.get({ language: 'it-IT', rate: 1 });
    document.getElementById('language').value = language;
    document.getElementById('speed').value = rate;
    document.getElementById('speedValue').textContent = rate;
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