// Background service worker for TLS France Navigator

const TLS_URL_PATTERN = 'https://visas-fr.tlscontact.com/*';
const REFRESH_ALARM_NAME = 'tls-random-refresh';
const REFRESH_INTERVAL_OPTIONS_MIN = [2, 3, 4, 6, 5];
const REFRESH_STATE_KEY = 'randomRefreshState';

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

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('visas-fr.tlscontact.com')) {
        console.log('TLS France website loaded:', tab.url);
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startRandomRefresh') {
        startRandomRefresh()
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

    return false;
});

async function startRandomRefresh() {
    const tabs = await chrome.tabs.query({ url: TLS_URL_PATTERN });
    if (!tabs.length) {
        throw new Error('Please open the TLS France website first');
    }

    const state = await scheduleNextRefresh();
    return { ok: true, state };
}

async function stopRandomRefresh() {
    await chrome.alarms.clear(REFRESH_ALARM_NAME);
    const state = {
        running: false,
        nextRefreshAt: null,
        currentIntervalMin: null,
        lastRefreshedAt: null
    };
    await setRefreshState(state);
    return { ok: true, state };
}

async function scheduleNextRefresh() {
    const intervalMin = pickRandomIntervalMin();
    const nextRefreshAt = Date.now() + intervalMin * 60 * 1000;

    await chrome.alarms.create(REFRESH_ALARM_NAME, {
        when: nextRefreshAt
    });

    const prev = await getRefreshState();
    const state = {
        running: true,
        nextRefreshAt,
        currentIntervalMin: intervalMin,
        lastRefreshedAt: prev.lastRefreshedAt || null
    };
    await setRefreshState(state);
    return state;
}

function pickRandomIntervalMin() {
    const idx = Math.floor(Math.random() * REFRESH_INTERVAL_OPTIONS_MIN.length);
    return REFRESH_INTERVAL_OPTIONS_MIN[idx];
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
        lastRefreshedAt: null
    };
}

function setRefreshState(state) {
    return chrome.storage.local.set({ [REFRESH_STATE_KEY]: state });
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
