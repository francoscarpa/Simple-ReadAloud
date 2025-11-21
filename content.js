let language = 'it-IT';
let rate = 1.0;

chrome.storage.local.get({ language: 'it-IT', rate: 1 }, (data) => {
    language = data.language;
    rate = data.rate;
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if (changes.language) language = changes.language.newValue;
        if (changes.rate) rate = changes.rate.newValue;
    }
});

let cHeld = false;
let hoverTimeout = null;
let lastReadElement = null;
let currentHoveredElement = null;

function speak(text) {
    window.speechSynthesis.cancel();
    if (!text) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = language;
    utter.rate = rate;
    window.speechSynthesis.speak(utter);
}

function isTextElement(el) {
    const skipTags = ['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'OPTION', 'IMG', 'SVG'];
    if (!el || skipTags.includes(el.tagName)) return false;
    return true;
}

function handleStartRead() {
    if (!cHeld || !currentHoveredElement) return;
    const text = currentHoveredElement.textContent.trim();
    lastReadElement = currentHoveredElement;
    speak(text);
}

document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'c' && !cHeld) {
        cHeld = true;
        // If already hovering an element, start timer
        if (currentHoveredElement && isTextElement(currentHoveredElement)) {
            clearTimeout(hoverTimeout);
            hoverTimeout = setTimeout(handleStartRead, 10);
        }
    }
});

document.addEventListener('keyup', (event) => {
    if (event.key.toLowerCase() === 'c') {
        cHeld = false;
        clearTimeout(hoverTimeout);
        window.speechSynthesis.cancel();
        lastReadElement = null;
    }
});

document.body.addEventListener('mouseover', (event) => {
    let el = event.target;
    if (!isTextElement(el)) return;
    let text = el.textContent.trim();

    currentHoveredElement = el;
    clearTimeout(hoverTimeout);

    // Only act if C/c is currently held and not already reading this element
    if (cHeld && el !== lastReadElement) {
        hoverTimeout = setTimeout(handleStartRead, 10);
    }
});

document.body.addEventListener('mouseout', (event) => {
    clearTimeout(hoverTimeout);
    window.speechSynthesis.cancel();
    lastReadElement = null;
    currentHoveredElement = null;
});

// If you move the mouse while C/c is held, make sure to restart logic accordingly
document.body.addEventListener('mousemove', (event) => {
    // If C/c is held but you rapidly move across elements
    // Forces mouseover/mouseout sequence most of the time, but can help with edge cases
    if (!cHeld) return;
    // No action needed here if mouseover/mouseout are firing appropriately
});