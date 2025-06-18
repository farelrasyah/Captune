// Simple test content script for debugging
console.log('Captune test script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Test script received message:', request);
    
    if (request.action === 'ping') {
        sendResponse({ success: true, message: 'Test script is working' });
        return true;
    }
    
    if (request.action === 'captureVisible') {
        // Simple test capture
        sendResponse({ success: false, error: 'Using test script - main content script not loaded' });
        return true;
    }
    
    sendResponse({ success: false, error: 'Test script - unknown action: ' + request.action });
    return true;
});
