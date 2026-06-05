function updateToggleButton(enabled) {
    const btn = document.getElementById('toggleReadAloudBtn');
    if (enabled) {
        btn.textContent = 'Read Aloud: ON';
        btn.style.backgroundColor = '#1f7a6d';
        btn.style.color = '#f8fbf9';
    } else {
        btn.textContent = 'Read Aloud: OFF';
        btn.style.backgroundColor = '#9f3f37';
        btn.style.color = '#fff7f2';
    }
}

function updateHoverInfoToggle(enabled) {
    document.getElementById('hoverInfoEnabled').checked = enabled;
}

function setSpeedValue(value) {
    document.getElementById('speed').value = value;
    document.getElementById('speedValue').textContent = value;
}

function setLanguageValue(value) {
    const select = document.getElementById('language');
    const selectedOption = select.querySelector(`option[value="${value}"]`) || select.querySelector('option[value="it-IT"]');
    select.value = selectedOption.value;
    document.getElementById('languageText').textContent = selectedOption.textContent;

    document.querySelectorAll('.languageOption').forEach((option) => {
        const selected = option.dataset.language === selectedOption.value;
        option.classList.toggle('selected', selected);
        option.setAttribute('aria-selected', selected);
    });
}

function setLanguageMenuOpen(open) {
    document.getElementById('languageSelect').classList.toggle('open', open);
    document.getElementById('languageTrigger').setAttribute('aria-expanded', open);
}

document.addEventListener('DOMContentLoaded', async () => {
    let { language, rate } = await chrome.storage.local.get({ language: 'it-IT', rate: 2.4 });
    setLanguageValue(language);
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

    document.getElementById('languageTrigger').addEventListener('click', function () {
        setLanguageMenuOpen(!document.getElementById('languageSelect').classList.contains('open'));
    });

    document.querySelectorAll('.languageOption').forEach((option) => {
        option.addEventListener('click', function () {
            setLanguageValue(this.dataset.language);
            setLanguageMenuOpen(false);
        });
    });

    document.addEventListener('click', function (event) {
        if (!document.getElementById('languageSelect').contains(event.target)) {
            setLanguageMenuOpen(false);
        }
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            setLanguageMenuOpen(false);
        }
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
