let automationRunning = false;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startAutomation') {
        startAutomation();
        sendResponse({status: 'started'});
    } else if (request.action === 'stopAutomation') {
        automationRunning = false;
    }
});

async function startAutomation() {
    automationRunning = true;
    const steps = [
        { action: 'clickButtonApplyForVisa' },
        { action: 'clickBtnYesPopup' },
        { action: 'clickSelectCountryButton' },
        { action: 'openCountryDropdown' },
        { action: 'selectUnitedKingdom' },
        { action: 'clickConfirmCountry' },
        { action: 'clickContinueWandsworth' },
        { action: 'clickBookAppointment' },
        { action: 'clickFirstBtnYes' },
        { action: 'clickSecondBtnYes' },
        { action: 'clickFinalLogin' }
    ];
    
    for (let i = 0; i < steps.length; i++) {
        if (!automationRunning) break;
        
        try {
            const stepNum = i + 1;
            const step = steps[i];
            
            console.log(`Step ${stepNum}: ${step.action}`);
            updatePopup(`Executing step ${stepNum}/${steps.length}...`, step.action, stepNum, true);
            
            // Execute the step
            await executeStep(step.action, stepNum);
            
            // Wait between steps
            await sleep(800);
            
        } catch (error) {
            console.error(`Error on step ${i + 1}:`, error);
            updatePopup(`Error on step ${i + 1}: ${error.message}`, steps[i].action, i + 1, false);
            automationRunning = false;
            break;
        }
    }
    
    if (automationRunning) {
        updatePopup('Automation completed successfully!', 'Complete', steps.length, true);
    }
    automationRunning = false;
}

async function executeStep(action, stepNum) {
    switch(action) {
        case 'clickButtonApplyForVisa':
            await clickElement('#btn-apply-for-a-visa', 'Book an appointment button');
            break;
        
        case 'clickBtnYesPopup':
            await clickElement('#btn-yes', 'Yes button (popup)');
            break;
        
        case 'clickSelectCountryButton':
            await clickElement('#btn-select-country', 'Select a country button');
            break;
        
        case 'openCountryDropdown':
            const dropdown = await getElement('#select-country');
            if (dropdown) {
                dropdown.focus();
                dropdown.click();
            } else {
                throw new Error('Country dropdown not found');
            }
            await sleep(300);
            break;
        
        case 'selectUnitedKingdom':
            await selectOptionByText('#select-country', 'United Kingdom');
            break;
        
        case 'clickConfirmCountry':
            await clickElement('#btn-confirm-country', 'Confirm button');
            break;
        
        case 'clickContinueWandsworth':
            // Find the card containing Wandsworth and click the Continue button
            await clickContinueInWandsoworthCard();
            break;
        
        case 'clickBookAppointment':
            // Second book appointment button
            await clickElementByContent('button, a', 'Book an appointment');
            break;
        
        case 'clickFirstBtnYes':
            // Click Yes for "Have you completed a France-Visas application?"
            await waitAndClickInSection('France-Visas', '#btn-yes');
            break;
        
        case 'clickSecondBtnYes':
            // Click Yes for "Have you registered with TLScontact?"
            await waitAndClickInSection('TLScontact', '#btn-yes');
            break;
        
        case 'clickFinalLogin':
            // LOG IN is a <span id="btn-select-country"> inside <a href="/en-us/login">
            await waitAndClickLogin();
            break;
        
        default:
            throw new Error(`Unknown action: ${action}`);
    }
}

function clickElement(selector, description) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const element = document.querySelector(selector);
            if (element) {
                element.scrollIntoView({behavior: 'smooth', block: 'center'});
                setTimeout(() => {
                    element.click();
                    resolve();
                }, 200);
            } else {
                reject(new Error(`${description} not found (selector: ${selector})`));
            }
        }, 100);
    });
}

function getElement(selector) {
    return Promise.resolve(document.querySelector(selector));
}

function selectOptionByText(selectSelector, optionText) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const select = document.querySelector(selectSelector);
            if (!select) {
                reject(new Error(`Select element not found: ${selectSelector}`));
                return;
            }
            
            const options = select.querySelectorAll('option');
            let found = false;
            
            for (let option of options) {
                if (option.textContent.includes(optionText)) {
                    select.value = option.value;
                    select.dispatchEvent(new Event('change', {bubbles: true}));
                    found = true;
                    break;
                }
            }
            
            if (found) {
                resolve();
            } else {
                reject(new Error(`Option "${optionText}" not found in select`));
            }
        }, 100);
    });
}

function clickContinueInWandsoworthCard() {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Find the title element containing "Wandsworth (London)"
            const titleElements = document.querySelectorAll('p');
            let wandsworthTitle = null;

            for (let p of titleElements) {
                if (p.textContent.trim().includes('Wandsworth')) {
                    wandsworthTitle = p;
                    break;
                }
            }

            if (!wandsworthTitle) {
                reject(new Error('Wandsworth title element not found'));
                return;
            }

            // Walk up to the <li> card ancestor
            let card = wandsworthTitle.closest('li');
            if (!card) {
                reject(new Error('Wandsworth card <li> not found'));
                return;
            }

            // Find the Continue button by data-testid or text content
            const continueBtn = card.querySelector('[data-testid="btn-select-vac"]')
                             || [...card.querySelectorAll('button')].find(b => b.textContent.includes('Continue'));

            if (!continueBtn) {
                reject(new Error('Continue button not found in Wandsworth card'));
                return;
            }

            continueBtn.scrollIntoView({behavior: 'smooth', block: 'center'});
            setTimeout(() => {
                // Click the wrapping <a> if present, so navigation triggers
                const anchor = continueBtn.closest('a') || continueBtn;
                anchor.click();
                resolve();
            }, 200);
        }, 100);
    });
}

function clickElementByContent(selector, content) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const elements = document.querySelectorAll(selector);
            
            for (let elem of elements) {
                if (elem.textContent.includes(content)) {
                    elem.scrollIntoView({behavior: 'smooth', block: 'center'});
                    setTimeout(() => {
                        elem.click();
                        resolve();
                    }, 200);
                    return;
                }
            }
            
            reject(new Error(`Element with content "${content}" not found`));
        }, 100);
    });
}

// Poll until an element matching selector exists, up to timeoutMs
function waitForElement(selector, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        (function check() {
            const el = document.querySelector(selector);
            if (el) return resolve(el);
            if (Date.now() - start > timeoutMs) return reject(new Error(`Timed out waiting for: ${selector}`));
            setTimeout(check, 150);
        })();
    });
}

// Find a modal section whose text includes sectionText, then click btnSelector within it.
// Polls until the section appears (handles dynamically injected sections).
function waitAndClickInSection(sectionText, btnSelector, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        (function check() {
            // Look for all matching buttons; pick the one whose closest modal section
            // contains the expected question text.
            const allBtns = document.querySelectorAll(btnSelector);
            for (const btn of allBtns) {
                const section = btn.closest('[class*="section"]') || btn.closest('[class*="modal"]') || btn.parentElement;
                if (section && section.textContent.includes(sectionText)) {
                    btn.scrollIntoView({behavior: 'smooth', block: 'center'});
                    setTimeout(() => { btn.click(); resolve(); }, 200);
                    return;
                }
            }
            if (Date.now() - start > timeoutMs) {
                reject(new Error(`Timed out waiting for section "${sectionText}" with button "${btnSelector}"`));
                return;
            }
            setTimeout(check, 150);
        })();
    });
}

// Wait for the LOG IN span/anchor and click the <a> wrapper to trigger navigation.
function waitAndClickLogin(timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        (function check() {
            const span = document.querySelector('#btn-select-country');
            if (span && span.textContent.includes('LOG IN')) {
                const anchor = span.closest('a') || span;
                anchor.scrollIntoView({behavior: 'smooth', block: 'center'});
                setTimeout(() => { anchor.click(); resolve(); }, 200);
                return;
            }
            if (Date.now() - start > timeoutMs) {
                reject(new Error('Timed out waiting for LOG IN button'));
                return;
            }
            setTimeout(check, 150);
        })();
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function updatePopup(message, step, stepNum, success) {
    chrome.runtime.sendMessage({
        action: 'updateStatus',
        message: message,
        step: step,
        stepNumber: stepNum,
        success: success
    }).catch(err => console.log('Popup update error:', err));
}

console.log('TLS France Navigator content script loaded');
