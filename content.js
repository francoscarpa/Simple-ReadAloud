let language = 'it-IT';
let rate = 2.4;

chrome.storage.local.get({ language: 'it-IT', rate: 2.4 }, (data) => {
    language = data.language;
    rate = data.rate;
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if (changes.language) language = changes.language.newValue;
        if (changes.rate) rate = changes.rate.newValue;
    }
});

let hoverTimeout = null;
let lastReadElement = null;
let currentHoveredElement = null;
let readAloudEnabled = true;

function speak(text) {
    window.speechSynthesis.cancel();
    if (!text) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = language;
    utter.rate = rate;
    window.speechSynthesis.speak(utter);
}

function isReadableTextElement(el) {
    const readableTags = ['P', 'A', 'BUTTON', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'LABEL', 'STRONG', 'EM', 'FIGCAPTION', 'B', 'I', 'TIME'];
    return readableTags.includes(el.tagName);
}

function handleStartRead() {
    if (!readAloudEnabled || !currentHoveredElement) return;
    const text = currentHoveredElement.textContent.trim();
    lastReadElement = currentHoveredElement;
    speak(text);
}

document.body.addEventListener('mouseover', (event) => {
    let el = event.target;
    if (!isReadableTextElement(el)) return;
    let text = el.textContent.trim();
    if (!text) return;

    currentHoveredElement = el;
    clearTimeout(hoverTimeout);

    // Start read timer when hovering for 2 seconds
    if (el !== lastReadElement) {
        hoverTimeout = setTimeout(handleStartRead, 1);
    }
});


document.body.addEventListener('mouseout', (event) => {
    clearTimeout(hoverTimeout);
    window.speechSynthesis.cancel();
    lastReadElement = null;
    currentHoveredElement = null;
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleReadAloud') {
        readAloudEnabled = !readAloudEnabled;
        if (!readAloudEnabled) {
            window.speechSynthesis.cancel();
        }
        sendResponse && sendResponse({ enabled: readAloudEnabled });
    } else if (request.action === 'getReadAloudState') {
        sendResponse && sendResponse({ enabled: readAloudEnabled });
    }
});