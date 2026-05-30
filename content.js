let language = 'it-IT';
let rate = 2.4;
let hoverInfoEnabled = false;

chrome.storage.local.get({ language: 'it-IT', rate: 2.4, hoverInfoEnabled: false }, (data) => {
    language = data.language;
    rate = data.rate;
    hoverInfoEnabled = data.hoverInfoEnabled;
    syncHoverInfoBoxVisibility();
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if (changes.language) language = changes.language.newValue;
        if (changes.rate) rate = changes.rate.newValue;
        if (changes.hoverInfoEnabled) {
            hoverInfoEnabled = changes.hoverInfoEnabled.newValue;
            syncHoverInfoBoxVisibility();
        }
    }
});

let hoverTimeout = null;
let lastReadElement = null;
let currentHoveredElement = null;
let readAloudEnabled = false;
let hoverInfoBox = null;

function getElementLabel(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return 'None';
    return el.tagName.toLowerCase();
}

function buildParentInfo(el, maxParents = 5) {
    const parts = [];
    let parent = el ? el.parentElement : null;
    let level = 1;

    while (parent && level <= maxParents) {
        parts.push(`P${level}: ${getElementLabel(parent)}`);
        parent = parent.parentElement;
        level += 1;
    }

    if (parts.length === 0) {
        parts.push('P1: None');
    }

    return parts.join('<br>');
}

function ensureHoverInfoBox() {
    if (hoverInfoBox && document.body.contains(hoverInfoBox)) return hoverInfoBox;

    hoverInfoBox = document.createElement('div');
    hoverInfoBox.id = 'simple-readaloud-hover-box';
    hoverInfoBox.setAttribute('aria-live', 'polite');
    hoverInfoBox.style.position = 'fixed';
    hoverInfoBox.style.top = '16px';
    hoverInfoBox.style.right = '16px';
    hoverInfoBox.style.zIndex = '2147483647';
    hoverInfoBox.style.padding = '8px 10px';
    hoverInfoBox.style.borderRadius = '6px';
    hoverInfoBox.style.backgroundColor = 'rgba(17, 24, 39, 0.92)';
    hoverInfoBox.style.color = '#f9fafb';
    hoverInfoBox.style.fontFamily = 'Verdana, sans-serif';
    hoverInfoBox.style.fontSize = '12px';
    hoverInfoBox.style.lineHeight = '1.25';
    hoverInfoBox.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.22)';
    hoverInfoBox.style.pointerEvents = 'none';
    hoverInfoBox.style.minWidth = '140px';
    hoverInfoBox.style.maxWidth = '220px';
    document.body.appendChild(hoverInfoBox);

    return hoverInfoBox;
}

function syncHoverInfoBoxVisibility() {
    const infoBox = ensureHoverInfoBox();
    infoBox.style.display = hoverInfoEnabled ? 'block' : 'none';
}

function updateHoverInfoBox(el) {
    if (!hoverInfoEnabled) return;
    const infoBox = ensureHoverInfoBox();
    infoBox.innerHTML = `H: ${getElementLabel(el)}<br>${buildParentInfo(el)}`;
}

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

function findTopmostReadableAncestor(startEl) {
    if (!startEl || startEl.nodeType !== Node.ELEMENT_NODE || !isReadableTextElement(startEl)) {
        return null;
    }

    let topmost = startEl;
    let parent = startEl.parentElement;

    while (parent && isReadableTextElement(parent)) {
        topmost = parent;
        parent = parent.parentElement;
    }

    return topmost;
}

function handleStartRead() {
    if (!readAloudEnabled || !currentHoveredElement) return;
    const text = currentHoveredElement.textContent.trim();
    lastReadElement = currentHoveredElement;
    speak(text);
}

document.body.addEventListener('mouseover', (event) => {
    let el = event.target;
    updateHoverInfoBox(el);

    // Find the outermost readable-tag ancestor (so inner tags bubble up to their readable container)
    const readable = findTopmostReadableAncestor(el);
    if (!readable) return;
    let text = readable.textContent.trim();
    if (!text) return;

    currentHoveredElement = readable;
    clearTimeout(hoverTimeout);

    if (el !== lastReadElement) {
        hoverTimeout = setTimeout(handleStartRead, 200);
    }
});


document.body.addEventListener('mouseout', (event) => {
    clearTimeout(hoverTimeout);
    window.speechSynthesis.cancel();
    lastReadElement = null;
    currentHoveredElement = null;

    const nextElement = event.relatedTarget;
    updateHoverInfoBox(nextElement && nextElement.nodeType === Node.ELEMENT_NODE ? nextElement : null);
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => updateHoverInfoBox(null), { once: true });
} else {
    updateHoverInfoBox(null);
}

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