// Background service worker for TLS France Navigator

const TLS_URL_PATTERN = 'https://visas-fr.tlscontact.com/*';
const REFRESH_ALARM_NAME = 'tls-random-refresh';
const REFRESH_INTERVAL_OPTIONS_MIN = [2, 3, 4, 5, 6];
const REFRESH_STATE_KEY = 'randomRefreshState';

// Booking flow (survives the popup closing while the user does login/captcha)
const TRAVEL_GROUPS_URL = 'https://visas-fr.tlscontact.com/en-us/travel-groups';
const SERVICE_LEVEL_URL = 'https://visas-fr.tlscontact.com/en-us/27133387/workflow/service-level';
const APPOINTMENT_BOOKING_URL = 'https://visas-fr.tlscontact.com/workflow/appointment-booking/gbLON2fr/27133387';
const BOOKING_STATE_KEY = 'bookingFlowState';

chrome.runtime.onInstalled.addListener(() => {
    console.log('TLS France Navigator extension installed');
});

chrome.runtime.onStartup.addListener(async () => {
    await syncAlarmWithState();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== REFRESH_ALARM_NAME) {
        return;
    }

    const state = await getRefreshState();
    if (!state.running) {
        return;
    }

    await refreshTlsTab();
    await scheduleNextRefresh();
});

// Listen for tab updates. We react both to full page loads (status === 'complete')
// AND to client-side SPA route changes (changeInfo.url), because TLS navigates
// between pages (e.g. login -> travel-groups) without a full reload.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!tab.url || !tab.url.includes('visas-fr.tlscontact.com')) {
        return;
    }
    if (changeInfo.status === 'complete' || changeInfo.url) {
        console.log('TLS tab updated:', tab.url, changeInfo);
        handleBookingProgress(tabId, tab.url);
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startRandomRefresh') {
        startRandomRefresh(request.intervalPool)
            .then(sendResponse)
            .catch((error) => sendResponse({ ok: false, error: error.message }));
        return true;
    }

    if (request.action === 'stopRandomRefresh') {
        stopRandomRefresh()
            .then(sendResponse)
            .catch((error) => sendResponse({ ok: false, error: error.message }));
        return true;
    }

    if (request.action === 'getRefreshState') {
        getRefreshState()
            .then((state) => sendResponse({ ok: true, state }))
            .catch((error) => sendResponse({ ok: false, error: error.message }));
        return true;
    }

    if (request.action === 'startBookingWatch') {
        startBookingWatch(request.tabId)
            .then((state) => sendResponse({ ok: true, state }))
            .catch((error) => sendResponse({ ok: false, error: error.message }));
        return true;
    }

    if (request.action === 'stopBookingWatch') {
        setBookingState(defaultBookingState())
            .then(() => sendResponse({ ok: true }))
            .catch((error) => sendResponse({ ok: false, error: error.message }));
        return true;
    }

    if (request.action === 'getBookingState') {
        getBookingState()
            .then((state) => sendResponse({ ok: true, state }))
            .catch((error) => sendResponse({ ok: false, error: error.message }));
        return true;
    }

    return false;
});

async function startRandomRefresh(intervalPool) {
    const tabs = await chrome.tabs.query({ url: TLS_URL_PATTERN });
    if (!tabs.length) {
        throw new Error('Please open the TLS France website first');
    }

    // Persist the pool of minutes to pick from each cycle. Falls back to the
    // default pool if nothing valid was provided.
    const pool = Array.isArray(intervalPool)
        ? intervalPool.map(Number).filter(n => Number.isFinite(n) && n > 0)
        : [];
    const cleanPool = pool.length ? pool : null;
    const prev = await getRefreshState();
    await setRefreshState({ ...prev, intervalPool: cleanPool });

    // Pass the pool straight through so the first cycle can't depend on storage
    // timing.
    const state = await scheduleNextRefresh(cleanPool);
    return { ok: true, state };
}

async function stopRandomRefresh() {
    await chrome.alarms.clear(REFRESH_ALARM_NAME);
    const state = {
        running: false,
        nextRefreshAt: null,
        currentIntervalMin: null,
        intervalPool: null,
        lastRefreshedAt: null
    };
    await setRefreshState(state);
    return { ok: true, state };
}

async function scheduleNextRefresh(poolOverride) {
    const prev = await getRefreshState();
    const activePool = (poolOverride && poolOverride.length)
        ? poolOverride
        : (prev.intervalPool && prev.intervalPool.length ? prev.intervalPool : null);
    const pool = activePool || REFRESH_INTERVAL_OPTIONS_MIN;
    const intervalMin = pickRandomIntervalMin(pool);
    const nextRefreshAt = Date.now() + intervalMin * 60 * 1000;

    await chrome.alarms.create(REFRESH_ALARM_NAME, {
        when: nextRefreshAt
    });

    const state = {
        running: true,
        nextRefreshAt,
        currentIntervalMin: intervalMin,
        intervalPool: activePool,
        lastRefreshedAt: prev.lastRefreshedAt || null
    };
    await setRefreshState(state);
    console.log('Scheduled next refresh:', intervalMin, 'min from pool', pool);
    return state;
}

function pickRandomIntervalMin(pool) {
    const options = (pool && pool.length) ? pool : REFRESH_INTERVAL_OPTIONS_MIN;
    const idx = Math.floor(Math.random() * options.length);
    return options[idx];
}

async function refreshTlsTab() {
    const tabs = await chrome.tabs.query({ url: TLS_URL_PATTERN });
    if (!tabs.length) {
        return;
    }

    await chrome.tabs.reload(tabs[0].id);
    const state = await getRefreshState();
    await setRefreshState({
        ...state,
        lastRefreshedAt: Date.now()
    });
}

async function getRefreshState() {
    const result = await chrome.storage.local.get(REFRESH_STATE_KEY);
    return result[REFRESH_STATE_KEY] || {
        running: false,
        nextRefreshAt: null,
        currentIntervalMin: null,
        intervalPool: null,
        lastRefreshedAt: null
    };
}

function setRefreshState(state) {
    return chrome.storage.local.set({ [REFRESH_STATE_KEY]: state });
}

// ---- Booking flow watcher ----

function defaultBookingState() {
    return { active: false, phase: 'idle', tabId: null, message: 'Ready to start' };
}

async function getBookingState() {
    const result = await chrome.storage.local.get(BOOKING_STATE_KEY);
    return result[BOOKING_STATE_KEY] || defaultBookingState();
}

function setBookingState(state) {
    return chrome.storage.local.set({ [BOOKING_STATE_KEY]: state });
}

// Begin watching the given tab. Once it lands on the travel groups page (after the
// user finishes login/captcha), run the select-group -> continue flow. This lives
// in the background so it keeps going even after the popup closes.
async function startBookingWatch(tabId) {
    const state = {
        active: true,
        phase: 'awaiting-travel-groups',
        tabId: tabId,
        message: 'Waiting for login/captcha to finish...'
    };
    await setBookingState(state);
    return state;
}

// Serialize progress handling so overlapping tab-update events (URL change +
// status complete fire for the same navigation) can't double-process a phase.
let bookingChain = Promise.resolve();
function handleBookingProgress(tabId, url) {
    bookingChain = bookingChain
        .then(() => processBookingProgress(tabId, url))
        .catch((error) => console.log('Booking progress error:', error));
    return bookingChain;
}

async function processBookingProgress(tabId, url) {
    const state = await getBookingState();
    if (!state.active) return;
    // Note: we intentionally do NOT require tabId to match the stored one — TLS
    // can replace the tab during login. The URL is specific enough to the flow,
    // and we adopt whichever tab id reported it.

    if (state.phase === 'awaiting-travel-groups' && url.startsWith(TRAVEL_GROUPS_URL)) {
        await setBookingState({ ...state, tabId: tabId, phase: 'awaiting-service-level', message: 'Selecting travel group...' });
        // Clicking submits a form and navigates away, which can drop the
        // content-script response — that's fine, the next page load advances us.
        await clickTolerant(tabId, { action: 'clickSelectGroup' });
    } else if (state.phase === 'awaiting-service-level' && url.startsWith(SERVICE_LEVEL_URL)) {
        await setBookingState({ ...state, tabId: tabId, phase: 'awaiting-booking', message: 'Opening appointment booking...' });
        await clickTolerant(tabId, { action: 'clickBookAppointment' });
    } else if (state.phase === 'awaiting-booking' && url.startsWith(APPOINTMENT_BOOKING_URL)) {
        await setBookingState({ active: false, phase: 'done', tabId: tabId, message: 'Book your appointment!' });
    }
}

// Click an element on the page; swallow the "page navigated away" error since the
// click usually triggers navigation that the URL watcher picks up next.
async function clickTolerant(tabId, message) {
    try {
        await injectAndSend(tabId, message);
    } catch (error) {
        console.log('Booking click note (' + message.action + '):', error.message);
    }
}

// Inject the content script (no-op if already present) and send it a message.
async function injectAndSend(tabId, message) {
    await chrome.scripting.executeScript({
        target: { tabId: tabId },
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

async function syncAlarmWithState() {
    const state = await getRefreshState();
    const alarm = await chrome.alarms.get(REFRESH_ALARM_NAME);

    if (!state.running) {
        if (alarm) {
            await chrome.alarms.clear(REFRESH_ALARM_NAME);
        }
        return;
    }

    if (!state.nextRefreshAt) {
        await scheduleNextRefresh();
        return;
    }

    if (!alarm) {
        await chrome.alarms.create(REFRESH_ALARM_NAME, { when: state.nextRefreshAt });
        return;
    }

    if (state.nextRefreshAt <= Date.now()) {
        await refreshTlsTab();
        await scheduleNextRefresh();
    }
}
