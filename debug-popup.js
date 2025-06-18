// Debug popup script untuk testing
console.log('Debug popup script loaded');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, setting up debug handlers');
    
    // Simple test for capture visible
    const captureBtn = document.getElementById('capture-visible');
    if (captureBtn) {
        captureBtn.addEventListener('click', async () => {
            console.log('Testing capture visible...');
            
            try {
                const result = await chrome.runtime.sendMessage({
                    action: 'captureVisible',
                    options: { format: 'png' }
                });
                
                console.log('Capture result:', result);
                
                if (result && result.success) {
                    // Download the image
                    const link = document.createElement('a');
                    link.download = `captune-test-${Date.now()}.png`;
                    link.href = result.data;
                    link.click();
                    
                    alert('Capture successful!');
                } else {
                    alert('Capture failed: ' + (result?.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error: ' + error.message);
            }
        });
    }
    
    // Test background script connection
    const testBtn = document.getElementById('capture-full');
    if (testBtn) {
        testBtn.addEventListener('click', async () => {
            try {
                const response = await chrome.runtime.sendMessage({ action: 'ping' });
                console.log('Background script response:', response);
                alert('Background script responded: ' + JSON.stringify(response));
            } catch (error) {
                console.error('Background script error:', error);
                alert('Background script error: ' + error.message);
            }
        });
    }
});
