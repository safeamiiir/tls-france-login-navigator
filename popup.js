let refreshRunning = false;
let countdownTimer = null;
let bookingActive = false;
let bookingTimer = null;
let bookingDriving = false;

const masterButton = document.getElementById('masterButton');
const refreshToggleButton = document.getElementById('refreshToggleButton');
const intervalPoolEl = document.getElementById('intervalPool');
const statusText = document.getElementById('statusText');

// Toggle a chip's selected state on click (ignored while the pool is locked).
intervalPoolEl.addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');
    if (!chip || intervalPoolEl.classList.contains('disabled')) return;
    chip.classList.toggle('selected');
});

// The minutes currently selected in the random-pool chips.
function getSelectedPool() {
    return [...intervalPoolEl.querySelectorAll('.chip.selected')].map(chip => parseInt(chip.dataset.value, 10));
}

// Select exactly the minutes in `pool` (used to reflect a running refresh).
function setSelectedPool(pool) {
    const wanted = new Set((pool || []).map(Number));
    intervalPoolEl.querySelectorAll('.chip').forEach(chip => {
        chip.classList.toggle('selected', wanted.has(parseInt(chip.dataset.value, 10)));
    });
}
const refreshCountdown = document.getElementById('refreshCountdown');
const workIndicator = document.getElementById('workIndicator');

// Reflect activity in the status circle: 'working' spins, 'done' is green,
// 'error' is red, 'idle' is grey.
function setIndicator(state) {
    workIndicator.className = 'indicator ' + state;
}

const LOGIN_PAGE_URL = 'https://visas-fr.tlscontact.com/en-us/country/gb/vac/gbLON2fr';
const TRAVEL_GROUPS_URL = 'https://visas-fr.tlscontact.com/en-us/travel-groups';
const SERVICE_LEVEL_URL = 'https://visas-fr.tlscontact.com/en-us/27394216/workflow/service-level';
// TODO: This is not static, find a way to streer here using clicks
const APPOINTMENT_BOOKING_URL = 'https://visas-fr.tlscontact.com/workflow/appointment-booking/gbLON2fr/27394216';

// Booking flow state is shared with the background worker via storage (no
// messaging round-trip needed — the background's tab listener reads this key).
const BOOKING_STATE_KEY = 'bookingFlowState';

async function getBookingFlow() {
    const result = await chrome.storage.local.get(BOOKING_STATE_KEY);
    return result[BOOKING_STATE_KEY] || { active: false, phase: 'idle', tabId: null, message: 'Ready to start' };
}

function setBookingFlow(state) {
    return chrome.storage.local.set({ [BOOKING_STATE_KEY]: state });
}

initRefreshState();
initBookingState();

// ---- Book Appointment (main action: full guided flow) ----
// 1. Go to the login page.
// 2. If already logged in (no LOG IN button), jump straight to booking.
// 3. Otherwise click LOG IN, wait for the user to finish captcha/login and land
//    on the travel groups page, then run the select-group flow to reach booking.
masterButton.addEventListener('click', async () => {
    // While a booking watch is running, the master button acts as Cancel.
    if (bookingActive) {
        try {
            await setBookingFlow({ active: false, phase: 'idle', tabId: null, message: 'Stopped' });
        } catch (error) {
            console.log('Failed to stop booking watch:', error);
        }
        bookingActive = false;
        stopBookingTicker();
        statusText.textContent = 'Stopped';
        setIndicator('idle');
        renderControls();
        return;
    }

    masterButton.disabled = true;
    refreshToggleButton.disabled = true;
    statusText.textContent = 'Starting...';
    setIndicator('working');

    try {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});

        if (!tab) {
            statusText.textContent = 'Error: No active tab';
            setIndicator('error');
            resetUI();
            return;
        }

        // Already at the booking page — nothing to do
        if (tab.url && tab.url.startsWith(APPOINTMENT_BOOKING_URL)) {
            statusText.textContent = 'Book your appointment!';
            setIndicator('done');
            resetUI();
            return;
        }

        // Go straight to the destination. If we're logged in it just loads; if
        // not, TLS redirects us away to a login page. The final URL tells us
        // which — no polling needed, so the logged-in path is a single hop.
        statusText.textContent = 'Opening appointment booking...';
        await chrome.tabs.update(tab.id, {url: APPOINTMENT_BOOKING_URL});
        await waitForTabLoad(tab.id);

        const landedUrl = ((await chrome.tabs.get(tab.id)).url) || '';
        if (landedUrl.startsWith(APPOINTMENT_BOOKING_URL)) {
            // Logged in — we're already there.
            statusText.textContent = 'Book your appointment!';
            setIndicator('done');
            resetUI();
            return;
        }

        // Logged out (redirected off the booking page). Make sure we're on the
        // login page, click LOG IN, then watch for the rest of the flow. The
        // click navigates away and can drop its response; that's fine.
        if (!landedUrl.startsWith(LOGIN_PAGE_URL)) {
            statusText.textContent = 'Opening login page...';
            await chrome.tabs.update(tab.id, {url: LOGIN_PAGE_URL});
            await waitForTabLoad(tab.id);
        }

        statusText.textContent = 'Clicking LOG IN...';
        try {
            await injectAndSend(tab.id, {action: 'clickLogin'});
        } catch (error) {
            console.log('clickLogin note:', error.message);
        }
        statusText.textContent = 'Clicked LOG IN — complete the login/captcha...';

        // Step 3: record the watch state in storage. The background worker's tab
        // listener picks it up and runs the select-group flow once the user lands
        // on the travel groups page — even after this popup closes.
        const flowState = {
            active: true,
            phase: 'awaiting-travel-groups',
            tabId: tab.id,
            message: 'Waiting for login/captcha to finish...'
        };
        await setBookingFlow(flowState);

        bookingActive = true;
        statusText.textContent = flowState.message;
        setIndicator('working');
        startBookingTicker();
        renderControls();
        return;
    } catch (error) {
        statusText.textContent = 'Error: ' + error.message;
        setIndicator('error');
    }

    resetUI();
});

// Inject the content script (no-op if already present) and send a message,
// resolving on a successful response and rejecting otherwise.
async function injectAndSend(tabId, message) {
    await chrome.scripting.executeScript({
        target: {tabId: tabId},
        files: ['content.js']
    });

    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error('Could not communicate with page'));
            } else if (response && response.success) {
                resolve(response);
            } else {
                reject(new Error((response && response.error) || 'Action failed'));
            }
        });
    });
}

// ---- Random refresh / Stop (single toggle button) ----
refreshToggleButton.addEventListener('click', async () => {
    if (refreshRunning) {
        await stopEverything();
    } else {
        await startRandomRefresh();
    }
});

async function startRandomRefresh() {
    masterButton.disabled = true;
    refreshToggleButton.disabled = true;
    statusText.textContent = 'Starting random refresh...';

    try {
        // The random refresh picks a random value from the selected minutes each
        // cycle. One selected => effectively a fixed interval.
        const intervalPool = getSelectedPool();
        if (!intervalPool.length) {
            throw new Error('Pick at least one interval');
        }

        const response = await chrome.runtime.sendMessage({ action: 'startRandomRefresh', intervalPool });
        if (!response || !response.ok) {
            throw new Error((response && response.error) || 'Failed to start random refresh');
        }

        refreshRunning = true;
        statusText.textContent = 'Random refresh is running';
        setIndicator('running');
        updateCountdown(response.state);
        startCountdownTicker();
    } catch (error) {
        statusText.textContent = 'Error: ' + error.message;
    }

    renderControls();
}

async function stopEverything() {
    try {
        await chrome.runtime.sendMessage({ action: 'stopRandomRefresh' });
    } catch (error) {
        console.log('Failed to stop random refresh:', error);
    }

    refreshRunning = false;
    stopCountdownTicker();
    refreshCountdown.textContent = 'Random refresh: Off';
    statusText.textContent = 'Stopped';
    setIndicator('idle');
    resetUI();
}

function waitForTabLoad(tabId, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        function poll() {
            chrome.tabs.get(tabId, (tab) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                if (tab && tab.status === 'complete') {
                    resolve();
                    return;
                }
                if (Date.now() - start > timeoutMs) {
                    reject(new Error('Timed out waiting for page to load'));
                    return;
                }
                setTimeout(poll, 300);
            });
        }
        // Delay the first poll so we don't catch the previous page's
        // "complete" status before the new navigation has started.
        setTimeout(poll, 500);
    });
}

function resetUI() {
    renderControls();
}

// Reflect current state on the buttons. The refresh button doubles as the Stop
// button: it shows "Stop" (danger) while a refresh is running, and
// "Start random refresh" (secondary) otherwise.
function renderControls() {
    if (refreshRunning) {
        refreshToggleButton.textContent = 'Stop';
        refreshToggleButton.classList.remove('btn-secondary');
        refreshToggleButton.classList.add('btn-danger');
    } else {
        refreshToggleButton.textContent = 'Start random refresh';
        refreshToggleButton.classList.remove('btn-danger');
        refreshToggleButton.classList.add('btn-secondary');
    }
    // Don't let a refresh reload interfere with an in-progress booking watch.
    refreshToggleButton.disabled = bookingActive;
    // The interval pool can't be changed while a refresh is running.
    intervalPoolEl.classList.toggle('disabled', refreshRunning || bookingActive);

    // The master button doubles as Cancel while a booking watch is running.
    masterButton.textContent = bookingActive ? 'Cancel' : 'Book an appointment';
    masterButton.disabled = refreshRunning;
}

async function initRefreshState() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'getRefreshState' });
        if (!response || !response.ok) {
            renderControls();
            return;
        }

        refreshRunning = !!response.state.running;
        if (refreshRunning) {
            statusText.textContent = 'Random refresh is running';
            setIndicator('running');
            // Reflect the pool that's actually running.
            if (response.state.intervalPool && response.state.intervalPool.length) {
                setSelectedPool(response.state.intervalPool);
            }
            updateCountdown(response.state);
            startCountdownTicker();
        } else {
            refreshCountdown.textContent = 'Random refresh: Off';
        }

        renderControls();
    } catch (error) {
        console.log('Could not initialize refresh state:', error);
        renderControls();
    }
}

function startCountdownTicker() {
    stopCountdownTicker();
    countdownTimer = setInterval(async () => {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getRefreshState' });
            if (!response || !response.ok) {
                return;
            }

            refreshRunning = !!response.state.running;
            if (!refreshRunning) {
                stopCountdownTicker();
                refreshCountdown.textContent = 'Random refresh: Off';
                setIndicator('idle');
                renderControls();
                return;
            }

            updateCountdown(response.state);
            renderControls();
        } catch (error) {
            console.log('Countdown update failed:', error);
        }
    }, 1000);
}

function stopCountdownTicker() {
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }
}

function updateCountdown(state) {
    if (!state || !state.nextRefreshAt) {
        refreshCountdown.textContent = 'Random refresh: waiting for next cycle';
        return;
    }

    const remainingMs = Math.max(0, state.nextRefreshAt - Date.now());
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);
    const paddedSeconds = String(seconds).padStart(2, '0');
    const intervalText = state.currentIntervalMin ? ` (${state.currentIntervalMin} min)` : '';

    refreshCountdown.textContent = `Random refresh in ${minutes}:${paddedSeconds}${intervalText}`;
}

// ---- Booking flow state (driven by the background service worker) ----

// On popup open, pick up an in-progress booking watch so the spinner and status
// reflect what the background is doing (it keeps running while the popup is shut).
async function initBookingState() {
    try {
        const state = await getBookingFlow();
        if (state.active) {
            bookingActive = true;
            applyBookingState(state);
            startBookingTicker();
            renderControls();
        }
    } catch (error) {
        console.log('Could not initialize booking state:', error);
    }
}

function applyBookingState(state) {
    if (!state) return;

    if (state.message) {
        statusText.textContent = state.message;
    }

    if (state.phase === 'done') {
        setIndicator('done');
    } else if (state.phase === 'error') {
        setIndicator('error');
    } else if (state.active) {
        setIndicator('working');
    }
}

function startBookingTicker() {
    stopBookingTicker();
    bookingTimer = setInterval(async () => {
        try {
            const state = await getBookingFlow();
            applyBookingState(state);

            if (!state.active) {
                bookingActive = false;
                stopBookingTicker();
                renderControls();
                return;
            }

            // Actively poll where the tab is (events alone miss the case where
            // we're already sitting on the next page) and advance the flow.
            await drivePopupBooking(state);
        } catch (error) {
            console.log('Booking state update failed:', error);
        }
    }, 1500);
}

function stopBookingTicker() {
    if (bookingTimer) {
        clearInterval(bookingTimer);
        bookingTimer = null;
    }
}

// Poll-based driver: look at where the TLS tab actually is and advance the
// booking flow one step. Runs while the popup is open (the background does the
// same on navigation events for when the popup is closed). Each step advances
// the stored phase BEFORE clicking so the two drivers don't double-act.
async function drivePopupBooking(state) {
    if (bookingDriving) return;

    let tlsTabs = [];
    try {
        tlsTabs = await chrome.tabs.query({ url: 'https://visas-fr.tlscontact.com/*' });
    } catch (error) {
        return;
    }

    const tabOn = (prefix) => tlsTabs.find(t => t.url && t.url.startsWith(prefix));

    if (state.phase === 'awaiting-travel-groups') {
        const tab = tabOn(TRAVEL_GROUPS_URL);
        if (!tab) return;
        bookingDriving = true;
        try {
            await setBookingFlow({ ...state, tabId: tab.id, phase: 'awaiting-service-level', message: 'Selecting travel group...' });
            await injectAndSend(tab.id, { action: 'clickSelectGroup' });
        } catch (error) {
            // Clicking submits a form and navigates away; the dropped response is fine.
        } finally {
            bookingDriving = false;
        }
    } else if (state.phase === 'awaiting-service-level') {
        const tab = tabOn(SERVICE_LEVEL_URL);
        if (!tab) return;
        bookingDriving = true;
        try {
            await setBookingFlow({ ...state, tabId: tab.id, phase: 'awaiting-booking', message: 'Opening appointment booking...' });
            await injectAndSend(tab.id, { action: 'clickBookAppointment' });
        } catch (error) {
            // Navigation away can drop the response — fine.
        } finally {
            bookingDriving = false;
        }
    } else if (state.phase === 'awaiting-booking') {
        const tab = tabOn(APPOINTMENT_BOOKING_URL);
        if (tab) {
            await setBookingFlow({ active: false, phase: 'done', tabId: tab.id, message: 'Book your appointment!' });
        }
    }
}
