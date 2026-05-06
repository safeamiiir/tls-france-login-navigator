let isRunning = false;

document.getElementById('startButton').addEventListener('click', async () => {
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');
    const statusText = document.getElementById('statusText');
    const stepsList = document.getElementById('stepsList');
    
    isRunning = true;
    startButton.disabled = true;
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

document.getElementById('stopButton').addEventListener('click', () => {
    isRunning = false;
    chrome.tabs.query({url: 'https://visas-fr.tlscontact.com/*'}, (tabs) => {
        if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'stopAutomation'});
        }
    });
    document.getElementById('statusText').textContent = 'Automation stopped';
    resetUI();
});

function resetUI() {
    isRunning = false;
    document.getElementById('startButton').disabled = false;
    document.getElementById('stopButton').disabled = true;
}

// Listen for updates from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateStatus') {
        const statusText = document.getElementById('statusText');
        const stepsList = document.getElementById('stepsList');
        
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
