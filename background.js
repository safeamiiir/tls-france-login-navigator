// Background service worker for TLS France Navigator

chrome.runtime.onInstalled.addListener(() => {
    console.log('TLS France Navigator extension installed');
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('visas-fr.tlscontact.com')) {
        console.log('TLS France website loaded:', tab.url);
    }
});
