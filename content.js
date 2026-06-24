// Guard against re-injection into the same document (e.g. on SPA navigation),
// which would otherwise re-run top-level declarations and register duplicate
// listeners. The existing listener from the first injection keeps working.
(function () {
if (window.__tlsNavLoaded) return;
window.__tlsNavLoaded = true;

// Listen for messages from the popup / background worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'clickLogin') {
        clickLoginButton()
            .then(() => sendResponse({success: true}))
            .catch(error => sendResponse({success: false, error: error.message}));
        return true; // keep the message channel open for the async response
    } else if (request.action === 'clickSelectGroup') {
        clickSelectGroupButton()
            .then(() => sendResponse({success: true}))
            .catch(error => sendResponse({success: false, error: error.message}));
        return true;
    } else if (request.action === 'clickBookAppointment') {
        clickBookAppointmentButton()
            .then(() => sendResponse({success: true}))
            .catch(error => sendResponse({success: false, error: error.message}));
        return true;
    }
});

// Locate the "LOG IN" button (a styled <span type="button">, button, or anchor).
function findLoginButton() {
    const candidates = document.querySelectorAll('span[type="button"], button, a');
    for (const el of candidates) {
        if (el.textContent.trim().toUpperCase() === 'LOG IN') {
            return el;
        }
    }
    return null;
}

// Poll for the LOG IN button up to timeoutMs; resolve with the element or null.
function waitForLoginButton(timeoutMs = 10000) {
    return new Promise((resolve) => {
        const start = Date.now();
        (function check() {
            const el = findLoginButton();
            if (el) { resolve(el); return; }
            if (Date.now() - start > timeoutMs) { resolve(null); return; }
            setTimeout(check, 150);
        })();
    });
}

// Find the "LOG IN" button and click it.
async function clickLoginButton(timeoutMs = 10000) {
    const el = await waitForLoginButton(timeoutMs);
    if (!el) {
        throw new Error('Timed out waiting for LOG IN button');
    }
    el.scrollIntoView({behavior: 'smooth', block: 'center'});
    await new Promise(resolve => setTimeout(resolve, 200));
    const target = el.closest('a') || el;
    target.click();
}

// Click the "Select" submit button for the travel group on /travel-groups.
function clickSelectGroupButton(timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        (function check() {
            const btn = document.querySelector('button[name="formGroupId"][value="27133387"]')
                     || document.querySelector('button[name="formGroupId"]');
            if (btn) {
                btn.scrollIntoView({behavior: 'smooth', block: 'center'});
                setTimeout(() => { btn.click(); resolve(); }, 200);
                return;
            }
            if (Date.now() - start > timeoutMs) {
                reject(new Error('Timed out waiting for Select button'));
                return;
            }
            setTimeout(check, 150);
        })();
    });
}

// Click the "Continue" (book appointment) link on the service-level page.
function clickBookAppointmentButton(timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        (function check() {
            const link = document.querySelector('#book-appointment-btn')
                      || document.querySelector('[data-testid="btn-book-appointment"]');
            if (link) {
                link.scrollIntoView({behavior: 'smooth', block: 'center'});
                setTimeout(() => { link.click(); resolve(); }, 200);
                return;
            }
            if (Date.now() - start > timeoutMs) {
                reject(new Error('Timed out waiting for Continue button'));
                return;
            }
            setTimeout(check, 150);
        })();
    });
}

console.log('TLS France Navigator content script loaded');
})();
