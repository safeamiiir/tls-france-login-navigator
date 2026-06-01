let isRunning = false;
let refreshRunning = false;
let countdownTimer = null;

const startButton = document.getElementById('startButton');
const startRefreshButton = document.getElementById('startRefreshButton');
const stopButton = document.getElementById('stopButton');
const statusText = document.getElementById('statusText');
const stepsList = document.getElementById('stepsList');
const refreshCountdown = document.getElementById('refreshCountdown');

initRefreshState();

startButton.addEventListener('click', async () => {
    isRunning = true;
    startButton.disabled = true;
    startRefreshButton.disabled = true;
    stopButton.disabled = false;
    statusText.textContent = 'Starting automation...';
    stepsList.innerHTML = '';
    
    try {
        const tabs = await chrome.tabs.query({url: 'https://visas-fr.tlscontact.com/*'});
        
        if (tabs.length === 0) {
            statusText.textContent = 'Error: Please open the TLS France website first';
            resetUI();
            return;
        }
        
        const tabId = tabs[0].id;
        
        // Inject content script if not already injected
        await chrome.scripting.executeScript({
            target: {tabId: tabId},
            files: ['content.js']
        });
        
        // Start the automation
        chrome.tabs.sendMessage(tabId, {action: 'startAutomation'}, (response) => {
            if (chrome.runtime.lastError) {
                statusText.textContent = 'Error: Could not communicate with page';
                resetUI();
                return;
            }
            statusText.textContent = 'Automation completed!';
            resetUI();
        });
        
    } catch (error) {
        statusText.textContent = 'Error: ' + error.message;
        resetUI();
    }
});

startRefreshButton.addEventListener('click', async () => {
    startRefreshButton.disabled = true;
    startButton.disabled = true;
    statusText.textContent = 'Starting random refresh...';

    try {
        const response = await chrome.runtime.sendMessage({ action: 'startRandomRefresh' });
        if (!response || !response.ok) {
            throw new Error((response && response.error) || 'Failed to start random refresh');
        }

        refreshRunning = true;
        statusText.textContent = 'Random refresh is running';
        updateCountdown(response.state);
        startCountdownTicker();
        updateStopButtonState();
    } catch (error) {
        statusText.textContent = 'Error: ' + error.message;
        startRefreshButton.disabled = false;
        startButton.disabled = false;
        updateStopButtonState();
    }
});

stopButton.addEventListener('click', async () => {
    isRunning = false;
    chrome.tabs.query({url: 'https://visas-fr.tlscontact.com/*'}, (tabs) => {
        if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'stopAutomation'});
        }
    });

    try {
        await chrome.runtime.sendMessage({ action: 'stopRandomRefresh' });
    } catch (error) {
        console.log('Failed to stop random refresh:', error);
    }

    refreshRunning = false;
    stopCountdownTicker();
    refreshCountdown.textContent = 'Random refresh: Off';
    statusText.textContent = 'Stopped';
    resetUI();
});

function resetUI() {
    isRunning = false;
    startButton.disabled = false;
    startRefreshButton.disabled = false;
    updateStopButtonState();
}

function updateStopButtonState() {
    stopButton.disabled = !(isRunning || refreshRunning);
}

// Listen for updates from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateStatus') {
        statusText.textContent = request.message;
        
        if (request.step) {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'step ' + (request.success ? 'success' : 'error');
            stepDiv.textContent = (request.stepNumber || '') + '. ' + request.step;
            stepsList.appendChild(stepDiv);
            stepsList.scrollTop = stepsList.scrollHeight;
        }
    }
});

async function initRefreshState() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'getRefreshState' });
        if (!response || !response.ok) {
            return;
        }

        refreshRunning = !!response.state.running;
        if (refreshRunning) {
            statusText.textContent = 'Random refresh is running';
            startButton.disabled = true;
            startRefreshButton.disabled = true;
            updateCountdown(response.state);
            startCountdownTicker();
        } else {
            refreshCountdown.textContent = 'Random refresh: Off';
        }

        updateStopButtonState();
    } catch (error) {
        console.log('Could not initialize refresh state:', error);
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
                startButton.disabled = false;
                startRefreshButton.disabled = false;
                updateStopButtonState();
                return;
            }

            updateCountdown(response.state);
            updateStopButtonState();
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
    const intervalText = state.currentIntervalMin ? ` (${state.currentIntervalMin} min cycle)` : '';

    refreshCountdown.textContent = `Random refresh in ${minutes}:${paddedSeconds}${intervalText}`;
}
