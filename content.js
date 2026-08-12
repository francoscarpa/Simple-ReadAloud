let readAloudEnabled = false;
let hoverInfoEnabled = false;
let language = 'it-IT';
let rate = 2.4;
let hoverTimeout = null;
let lastReadElement = null;
let currentHoveredElement = null;
let currentHoverInfoElement = null;
let hoverInfoBox = null;

chrome.storage.local.get({ language: 'it-IT', rate: 2.4 }, (data) => {
    language = data.language;
    rate = data.rate;
    syncHoverInfoBoxVisibility();
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if (changes.language) language = changes.language.newValue;
        if (changes.rate) rate = changes.rate.newValue;
    }
});

function getElementLabel(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return 'NONE';
    return el.tagName.toUpperCase();
}

function buildElementPyramid(el, maxParents = 5) {
    const rows = [{ prefix: 'H:', name: getElementLabel(el) }];
    let parent = el ? el.parentElement : null;
    let level = 1;

    while (parent && level <= maxParents) {
        rows.push({ prefix: `P${level}:`, name: getElementLabel(parent) });
        parent = parent.parentElement;
        level += 1;
    }

    if (rows.length === 1) {
        rows.push({ prefix: 'P1:', name: 'NONE' });
    }

    return rows.map((row, index) => {
        const sidePadding = 6 + (index * 5);

        return `
            <div style="
                align-self: center;
                box-sizing: border-box;
                min-width: ${56 + (index * 16)}px;
                padding: 2px ${sidePadding}px;
                text-align: center;
                background: ${index === 0 ? 'rgba(31, 122, 109, 0.95)' : 'rgba(255, 250, 241, 0.12)'};
                border: 1px solid ${index === 0 ? 'rgba(248, 251, 249, 0.55)' : 'rgba(255, 250, 241, 0.18)'};
                border-radius: 4px;
            "><strong>${row.name}</strong></div>
        `;
    }).join('');
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
    hoverInfoBox.style.margin = '0';
    hoverInfoBox.style.padding = '12px';
    hoverInfoBox.style.borderRadius = '6px';
    hoverInfoBox.style.backgroundColor = '#1a1a1a';
    hoverInfoBox.style.border = '2px solid #1f7a6d';
    hoverInfoBox.style.color = '#f9fafb';
    hoverInfoBox.style.fontFamily = 'SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace';
    hoverInfoBox.style.fontSize = '10px';
    hoverInfoBox.style.lineHeight = '1.15';
    hoverInfoBox.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.22)';
    hoverInfoBox.style.pointerEvents = 'none';
    hoverInfoBox.style.minWidth = '0';
    hoverInfoBox.style.maxWidth = '220px';
    hoverInfoBox.style.flexDirection = 'column';
    hoverInfoBox.style.alignItems = 'center';
    hoverInfoBox.style.gap = '2px';
    document.body.appendChild(hoverInfoBox);

    return hoverInfoBox;
}

function shouldShowHoverInfoBox() {
    return hoverInfoEnabled && !!currentHoverInfoElement;
}

function syncHoverInfoBoxVisibility() {
    const infoBox = ensureHoverInfoBox();
    infoBox.style.display = shouldShowHoverInfoBox() ? 'flex' : 'none';
}

function updateHoverInfoBox(el) {
    currentHoverInfoElement = el && el.nodeType === Node.ELEMENT_NODE ? el : null;
    syncHoverInfoBoxVisibility();
    if (!shouldShowHoverInfoBox()) return;
    const infoBox = ensureHoverInfoBox();
    infoBox.innerHTML = buildElementPyramid(currentHoverInfoElement);
}

function speak(text) {
    window.speechSynthesis.cancel();
    if (!text) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = language;
    utter.rate = rate;
    utter.pitch = 0.5;
    window.speechSynthesis.speak(utter);
}

function isReadableTextElement(el) {
    const readableTags = ['P', 'A', 'BUTTON', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'LABEL', 'STRONG', 'EM', 'FIGCAPTION', 'B', 'I', 'TIME'];
    return readableTags.includes(el.tagName);
}

function isElementVisible(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;

    // Check if element or any parent is hidden via display:none
    if (el.offsetParent === null && el.style.display !== 'fixed') return false;

    const style = getComputedStyle(el);

    // Check visibility and opacity
    if (style.visibility === 'hidden' || style.opacity === '0') return false;

    // Check dimensions
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;

    // Check if in viewport or has visible dimensions
    if (rect.bottom < 0 || rect.top > window.innerHeight ||
        rect.right < 0 || rect.left > window.innerWidth) return false;

    return true;
}

function getVisibleText(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return '';

    let text = '';
    const childNodes = el.childNodes;

    for (let node of childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE && isElementVisible(node)) {
            text += getVisibleText(node);
        }
    }

    return text;
}

function findTopmostReadableAncestor(startEl) {
    if (!startEl || startEl.nodeType !== Node.ELEMENT_NODE || !isReadableTextElement(startEl) || !isElementVisible(startEl)) {
        return null;
    }

    let topmost = startEl;
    let parent = startEl.parentElement;

    while (parent && isReadableTextElement(parent) && isElementVisible(parent)) {
        topmost = parent;
        parent = parent.parentElement;
    }

    return topmost;
}

function handleStartRead() {
    if (!readAloudEnabled || !currentHoveredElement || !isElementVisible(currentHoveredElement)) return;
    const text = getVisibleText(currentHoveredElement).trim();
    lastReadElement = currentHoveredElement;
    speak(text);
}

document.body.addEventListener('mouseover', (event) => {
    let el = event.target;
    updateHoverInfoBox(el);

    // Find the outermost readable-tag ancestor (so inner tags bubble up to their readable container)
    const readable = findTopmostReadableAncestor(el);
    if (!readable) return;
    let text = getVisibleText(readable).trim();
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
        syncHoverInfoBoxVisibility();
        sendResponse && sendResponse({ enabled: readAloudEnabled });
    } else if (request.action === 'setReadAloudEnabled') {
        readAloudEnabled = !!request.enabled;
        if (!readAloudEnabled) {
            window.speechSynthesis.cancel();
        }
        sendResponse && sendResponse({ enabled: readAloudEnabled });
    } else if (request.action === 'getReadAloudState') {
        sendResponse && sendResponse({ enabled: readAloudEnabled });
    } else if (request.action === 'setHoverInfoEnabled') {
        hoverInfoEnabled = request.enabled;
        syncHoverInfoBoxVisibility();
        sendResponse && sendResponse({ enabled: hoverInfoEnabled });
    } else if (request.action === 'getHoverInfoState') {
        sendResponse && sendResponse({ enabled: hoverInfoEnabled });
    }
});