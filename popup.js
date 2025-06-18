// Captune Popup Script
class CaptunePopup {
    constructor() {
        this.initializeEventListeners();
        this.loadSettings();
    }

    initializeEventListeners() {
        // Quick capture buttons
        document.getElementById('capture-full').addEventListener('click', () => this.captureFullPage());
        document.getElementById('capture-visible').addEventListener('click', () => this.captureVisible());
        document.getElementById('capture-selection').addEventListener('click', () => this.captureSelection());
        document.getElementById('capture-element').addEventListener('click', () => this.captureElement());

        // Device capture buttons
        document.getElementById('capture-desktop').addEventListener('click', () => this.captureDevice('desktop'));
        document.getElementById('capture-tablet').addEventListener('click', () => this.captureDevice('tablet'));
        document.getElementById('capture-mobile').addEventListener('click', () => this.captureDevice('mobile'));
        document.getElementById('capture-all-devices').addEventListener('click', () => this.captureAllDevices());

        // Batch operations
        document.getElementById('capture-links').addEventListener('click', () => this.captureAllLinks());
        document.getElementById('capture-conversation').addEventListener('click', () => this.captureLongConversation());
        document.getElementById('capture-urls').addEventListener('click', () => this.captureMultipleUrls());

        // Footer buttons
        document.getElementById('open-editor').addEventListener('click', () => this.openEditor());
        document.getElementById('open-options').addEventListener('click', () => this.openOptions());

        // Cancel button
        document.getElementById('cancel-capture').addEventListener('click', () => this.cancelCapture());

        // Settings change listeners
        this.addSettingsListeners();
    }

    addSettingsListeners() {
        const settings = ['include-sticky', 'developer-overlay', 'retina-quality', 'auto-expand'];
        settings.forEach(setting => {
            document.getElementById(setting).addEventListener('change', () => this.saveSettings());
        });

        document.getElementById('output-format').addEventListener('change', () => this.saveSettings());
    }

    async loadSettings() {
        try {
            const settings = await chrome.storage.sync.get({
                includeSticky: true,
                developerOverlay: false,
                retinaQuality: true,
                autoExpand: false,
                outputFormat: 'png'
            });

            document.getElementById('include-sticky').checked = settings.includeSticky;
            document.getElementById('developer-overlay').checked = settings.developerOverlay;
            document.getElementById('retina-quality').checked = settings.retinaQuality;
            document.getElementById('auto-expand').checked = settings.autoExpand;
            document.getElementById('output-format').value = settings.outputFormat;
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async saveSettings() {
        try {
            const settings = {
                includeSticky: document.getElementById('include-sticky').checked,
                developerOverlay: document.getElementById('developer-overlay').checked,
                retinaQuality: document.getElementById('retina-quality').checked,
                autoExpand: document.getElementById('auto-expand').checked,
                outputFormat: document.getElementById('output-format').value
            };

            await chrome.storage.sync.set(settings);
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    showProgress(text = 'Processing...') {
        document.getElementById('progress-modal').classList.remove('hidden');
        document.getElementById('progress-text').textContent = text;
        document.getElementById('progress-fill').style.width = '0%';
    }

    updateProgress(percent, text) {
        document.getElementById('progress-fill').style.width = `${percent}%`;
        if (text) {
            document.getElementById('progress-text').textContent = text;
        }
    }

    hideProgress() {
        document.getElementById('progress-modal').classList.add('hidden');
    }    async captureFullPage() {
        this.showProgress('Capturing full page...');
        
        try {
            const settings = await this.getCurrentSettings();
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Check if we can inject content script
            if (!tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
                try {
                    // Ensure content script is injected
                    await this.ensureContentScript(tab.id);
                    
                    const result = await chrome.tabs.sendMessage(tab.id, {
                        action: 'captureFullPage',
                        settings: settings
                    });

                    if (result && result.success) {
                        this.updateProgress(100, 'Capture complete!');
                        setTimeout(() => {
                            this.hideProgress();
                            if (settings.outputFormat === 'pdf') {
                                this.downloadPDF(result.data);
                            } else {
                                this.downloadImage(result.data, settings.outputFormat);
                            }
                        }, 500);
                        return;
                    } else {
                        throw new Error(result?.error || 'Content script capture failed');
                    }
                } catch (contentError) {
                    console.log('Content script method failed, falling back to simple capture:', contentError.message);
                    
                    // Fallback to simple visible capture
                    const result = await chrome.runtime.sendMessage({
                        action: 'captureVisible',
                        options: {
                            format: settings.outputFormat === 'jpeg' ? 'jpeg' : 'png',
                            quality: settings.outputFormat === 'jpeg' ? 90 : undefined
                        }
                    });

                    if (result && result.success) {
                        this.updateProgress(100, 'Capture complete (simplified)!');
                        setTimeout(() => {
                            this.hideProgress();
                            this.downloadImage(result.data, settings.outputFormat);
                        }, 500);
                        return;
                    }
                }
            } else {
                // Can't inject script on chrome pages, use simple capture
                const result = await chrome.runtime.sendMessage({
                    action: 'captureVisible',
                    options: {
                        format: settings.outputFormat === 'jpeg' ? 'jpeg' : 'png',
                        quality: settings.outputFormat === 'jpeg' ? 90 : undefined
                    }
                });

                if (result && result.success) {
                    this.updateProgress(100, 'Capture complete!');
                    setTimeout(() => {
                        this.hideProgress();
                        this.downloadImage(result.data, settings.outputFormat);
                    }, 500);
                    return;
                }
            }
            
            throw new Error('All capture methods failed');
        } catch (error) {
            this.hideProgress();
            this.showError('Failed to capture full page: ' + error.message);
        }
    }async captureVisible() {
        this.showProgress('Capturing visible area...');
        
        try {
            const settings = await this.getCurrentSettings();
            
            // Use background script directly for visible capture (no content script needed)
            const result = await chrome.runtime.sendMessage({
                action: 'captureVisible',
                options: {
                    format: settings.outputFormat === 'jpeg' ? 'jpeg' : 'png',
                    quality: settings.outputFormat === 'jpeg' ? 90 : undefined
                }
            });

            if (result && result.success) {
                this.updateProgress(100, 'Capture complete!');
                setTimeout(() => {
                    this.hideProgress();
                    this.downloadImage(result.data, settings.outputFormat);
                }, 500);
            } else {
                throw new Error(result?.error || 'Capture failed');
            }
        } catch (error) {
            this.hideProgress();
            this.showError('Failed to capture visible area: ' + error.message);
        }
    }async captureSelection() {
        this.showProgress('Select area to capture...');
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Ensure content script is injected
            await this.ensureContentScript(tab.id);
            
            await chrome.tabs.sendMessage(tab.id, {
                action: 'startSelectionMode'
            });

            this.hideProgress();
            window.close();
        } catch (error) {
            this.hideProgress();
            this.showError('Failed to start selection mode: ' + error.message);
        }
    }    async captureElement() {
        this.showProgress('Click on element to capture...');
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Ensure content script is injected
            await this.ensureContentScript(tab.id);
            
            await chrome.tabs.sendMessage(tab.id, {
                action: 'startElementMode'
            });

            this.hideProgress();
            window.close();
        } catch (error) {
            this.hideProgress();
            this.showError('Failed to start element mode: ' + error.message);
        }
    }    async captureDevice(deviceType) {
        this.showProgress(`Capturing ${deviceType} view...`);
        
        try {
            const settings = await this.getCurrentSettings();
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Ensure content script is injected
            await this.ensureContentScript(tab.id);
            
            const deviceSettings = this.getDeviceSettings(deviceType);
            
            const result = await chrome.tabs.sendMessage(tab.id, {
                action: 'captureDevice',
                device: deviceSettings,
                settings: settings
            });

            if (result && result.success) {
                this.updateProgress(100, `${deviceType} capture complete!`);
                setTimeout(() => {
                    this.hideProgress();
                    this.downloadImage(result.data, settings.outputFormat);
                }, 500);
            } else {
                throw new Error(result?.error || 'Device capture failed');
            }
        } catch (error) {
            this.hideProgress();
            this.showError(`Failed to capture ${deviceType} view: ` + error.message);
        }
    }

    async captureAllDevices() {
        this.showProgress('Capturing all device views...');
        
        try {
            const settings = await this.getCurrentSettings();
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            const devices = ['desktop', 'tablet', 'mobile'];
            const captures = [];

            for (let i = 0; i < devices.length; i++) {
                const device = devices[i];
                this.updateProgress((i / devices.length) * 100, `Capturing ${device} view...`);
                
                const deviceSettings = this.getDeviceSettings(device);
                const result = await chrome.tabs.sendMessage(tab.id, {
                    action: 'captureDevice',
                    device: deviceSettings,
                    settings: settings
                });

                if (result.success) {
                    captures.push({
                        device: device,
                        data: result.data
                    });
                }
            }

            this.updateProgress(100, 'Creating ZIP file...');
            const zipBlob = await this.createZipFile(captures);
            
            setTimeout(() => {
                this.hideProgress();
                this.downloadBlob(zipBlob, 'captune-multi-device.zip');
            }, 500);
        } catch (error) {
            this.hideProgress();
            this.showError('Failed to capture all devices: ' + error.message);
        }
    }

    async captureAllLinks() {
        this.showProgress('Scanning for links...');
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            const result = await chrome.tabs.sendMessage(tab.id, {
                action: 'getAllLinks'
            });

            if (result.success && result.links.length > 0) {
                this.showBatchCaptureDialog(result.links, 'links');
            } else {
                throw new Error('No links found on this page');
            }
        } catch (error) {
            this.hideProgress();
            this.showError('Failed to scan links: ' + error.message);
        }
    }

    async captureLongConversation() {
        this.showProgress('Expanding conversation threads...');
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const settings = await this.getCurrentSettings();
            
            const result = await chrome.tabs.sendMessage(tab.id, {
                action: 'captureLongConversation',
                settings: settings
            });

            if (result.success) {
                this.updateProgress(100, 'Conversation capture complete!');
                setTimeout(() => {
                    this.hideProgress();
                    this.downloadImage(result.data, settings.outputFormat);
                }, 500);
            } else {
                throw new Error(result.error || 'Conversation capture failed');
            }
        } catch (error) {
            this.hideProgress();
            this.showError('Failed to capture conversation: ' + error.message);
        }
    }

    async captureMultipleUrls() {
        const urls = prompt('Enter URLs (one per line):');
        if (!urls) return;

        const urlList = urls.split('\n').filter(url => url.trim());
        if (urlList.length === 0) return;

        this.showBatchCaptureDialog(urlList, 'urls');
    }

    showBatchCaptureDialog(items, type) {
        // Implementation for batch capture dialog
        // This would show a dialog to select which items to capture
        this.hideProgress();
        console.log('Batch capture dialog for:', type, items);
        // For now, just process all items
        this.processBatchCapture(items, type);
    }

    async processBatchCapture(items, type) {
        this.showProgress('Starting batch capture...');
        
        try {
            const settings = await this.getCurrentSettings();
            const captures = [];

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                this.updateProgress((i / items.length) * 100, `Capturing ${i + 1}/${items.length}...`);

                if (type === 'urls') {
                    // Open URL in new tab and capture
                    const tab = await chrome.tabs.create({ url: item, active: false });
                    await this.waitForTabLoad(tab.id);
                    
                    const result = await chrome.tabs.sendMessage(tab.id, {
                        action: 'captureFullPage',
                        settings: settings
                    });

                    if (result.success) {
                        captures.push({
                            url: item,
                            data: result.data
                        });
                    }

                    await chrome.tabs.remove(tab.id);
                } else if (type === 'links') {
                    // Similar logic for links
                    // Implementation would be similar to URLs
                }
            }

            this.updateProgress(100, 'Creating PDF...');
            const pdfBlob = await this.createPDFFromCaptures(captures);
            
            setTimeout(() => {
                this.hideProgress();
                this.downloadBlob(pdfBlob, 'captune-batch-capture.pdf');
            }, 500);
        } catch (error) {
            this.hideProgress();
            this.showError('Failed to process batch capture: ' + error.message);
        }
    }

    async openEditor() {
        try {
            const url = chrome.runtime.getURL('editor.html');
            await chrome.tabs.create({ url: url });
            window.close();
        } catch (error) {
            this.showError('Failed to open editor: ' + error.message);
        }
    }

    async openOptions() {
        try {
            await chrome.runtime.openOptionsPage();
            window.close();
        } catch (error) {
            this.showError('Failed to open options: ' + error.message);
        }
    }

    cancelCapture() {
        this.hideProgress();
        // Send cancel message to content script if needed
    }

    async getCurrentSettings() {
        return {
            includeSticky: document.getElementById('include-sticky').checked,
            developerOverlay: document.getElementById('developer-overlay').checked,
            retinaQuality: document.getElementById('retina-quality').checked,
            autoExpand: document.getElementById('auto-expand').checked,
            outputFormat: document.getElementById('output-format').value
        };
    }

    getDeviceSettings(deviceType) {
        const devices = {
            desktop: { width: 1920, height: 1080, deviceScaleFactor: 1 },
            tablet: { width: 768, height: 1024, deviceScaleFactor: 2 },
            mobile: { width: 375, height: 667, deviceScaleFactor: 3 }
        };
        return devices[deviceType];
    }

    downloadImage(dataUrl, format) {
        const link = document.createElement('a');
        link.download = `captune-${Date.now()}.${format}`;
        link.href = dataUrl;
        link.click();
    }

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }

    async createZipFile(captures) {
        // Implementation for creating ZIP file
        // This would use a library like JSZip
        console.log('Creating ZIP file from captures:', captures);
        return new Blob(['ZIP file placeholder'], { type: 'application/zip' });
    }

    async createPDFFromCaptures(captures) {
        // Implementation for creating PDF from multiple captures
        // This would use a library like jsPDF
        console.log('Creating PDF from captures:', captures);
        return new Blob(['PDF file placeholder'], { type: 'application/pdf' });
    }

    async waitForTabLoad(tabId) {
        return new Promise((resolve) => {
            const listener = (id, changeInfo) => {
                if (id === tabId && changeInfo.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve();
                }
            };
            chrome.tabs.onUpdated.addListener(listener);
        });
    }    showError(message) {
        console.error('Captune Error:', message);
        
        // Simple error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }async ensureContentScript(tabId) {
        try {
            console.log('Checking content script for tab:', tabId);
            
            // Try to ping the content script first
            const pingResult = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
            console.log('Content script ping result:', pingResult);
            
            if (pingResult && pingResult.success) {
                console.log('Content script is already active');
                return;
            }
        } catch (error) {
            console.log('Content script not responding, injecting...', error.message);
            
            // If ping fails, inject the content script
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content.js']
                });
                
                console.log('Content script injected, waiting for initialization...');
                
                // Wait for script to initialize
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Try ping again after injection
                try {
                    const secondPing = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
                    console.log('Content script ping after injection:', secondPing);
                } catch (pingError) {
                    console.log('Content script still not responding after injection:', pingError.message);
                }
            } catch (injectError) {
                console.error('Failed to inject content script:', injectError);
                throw new Error('Failed to inject content script: ' + injectError.message);
            }
        }
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CaptunePopup();
});
