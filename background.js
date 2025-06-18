// Background Script for Captune Extension
class CaptuneBackground {
    constructor() {
        this.setupEventListeners();
        this.setupContextMenus();
        this.setupCommands();
    }

    setupEventListeners() {
        // Extension installation/startup
        chrome.runtime.onInstalled.addListener(() => {
            this.createContextMenus();
            this.initializeSettings();
        });

        chrome.runtime.onStartup.addListener(() => {
            this.createContextMenus();
        });

        // Message handling
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // Will respond asynchronously
        });

        // Tab updates for auto-capture features
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete') {
                this.handleTabComplete(tabId, tab);
            }
        });

        // Alarm for scheduled captures
        chrome.alarms.onAlarm.addListener((alarm) => {
            this.handleAlarm(alarm);
        });
    }

    setupContextMenus() {
        this.contextMenus = [
            {
                id: 'captune-full-page',
                title: 'Capture Full Page',
                contexts: ['page']
            },
            {
                id: 'captune-visible',
                title: 'Capture Visible Area',
                contexts: ['page']
            },
            {
                id: 'captune-element',
                title: 'Capture This Element',
                contexts: ['all']
            },
            {
                id: 'separator1',
                type: 'separator',
                contexts: ['page']
            },
            {
                id: 'captune-mobile',
                title: 'Capture Mobile View',
                contexts: ['page']
            },
            {
                id: 'captune-all-devices',
                title: 'Capture All Device Views',
                contexts: ['page']
            },
            {
                id: 'separator2',
                type: 'separator',
                contexts: ['page']
            },
            {
                id: 'captune-links',
                title: 'Capture This Page + All Links',
                contexts: ['page']
            },
            {
                id: 'captune-conversation',
                title: 'Capture Long Conversation',
                contexts: ['page']
            }
        ];
    }

    setupCommands() {
        chrome.commands.onCommand.addListener((command) => {
            this.handleCommand(command);
        });
    }

    createContextMenus() {
        chrome.contextMenus.removeAll(() => {
            this.contextMenus.forEach(menu => {
                chrome.contextMenus.create(menu);
            });
        });

        chrome.contextMenus.onClicked.addListener((info, tab) => {
            this.handleContextMenuClick(info, tab);
        });
    }

    async initializeSettings() {
        const defaultSettings = {
            includeSticky: true,
            developerOverlay: false,
            retinaQuality: true,
            autoExpand: false,
            outputFormat: 'png',
            autoSave: true,
            saveLocation: 'downloads',
            customSaveFolder: '',
            jpegQuality: 90,
            pngCompression: 6,
            maxFileSize: 50, // MB
            watermark: false,
            watermarkText: 'Captured with Captune',
            watermarkPosition: 'bottom-right',
            shortcuts: {
                'capture-full-page': 'Ctrl+Shift+S',
                'capture-mobile-view': 'Ctrl+Shift+M',
                'capture-with-links': 'Ctrl+Shift+L'
            }
        };

        try {
            const stored = await chrome.storage.sync.get(defaultSettings);
            if (Object.keys(stored).length === 0) {
                await chrome.storage.sync.set(defaultSettings);
            }
        } catch (error) {
            console.error('Failed to initialize settings:', error);
        }
    }    async handleMessage(request, sender, sendResponse) {
        try {            switch (request.action) {
                case 'ping':
                    sendResponse({ success: true, message: 'Background script is working' });
                    break;

                case 'captureTab':
                    const result = await this.captureTab(request.tabId, request.options);
                    sendResponse({ success: true, data: result });
                    break;

                case 'captureVisible':
                    const visibleResult = await this.captureTab(null, request.options);
                    sendResponse({ success: true, data: visibleResult });
                    break;

                case 'createOffscreenDocument':
                    await this.createOffscreenDocument();
                    sendResponse({ success: true });
                    break;

                case 'processImage':
                    const processed = await this.processImage(request.imageData, request.options);
                    sendResponse({ success: true, data: processed });
                    break;                case 'downloadFile':
                    await this.downloadFile(request.data, request.filename);
                    sendResponse({ success: true });
                    break;

                case 'downloadImage':
                    await this.downloadFile(request.data, request.filename);
                    sendResponse({ success: true });
                    break;

                case 'scheduleCapture':
                    await this.scheduleCapture(request.schedule);
                    sendResponse({ success: true });
                    break;

                case 'getBadgeText':
                    const badgeText = await chrome.action.getBadgeText({ tabId: sender.tab.id });
                    sendResponse({ success: true, badgeText });
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleContextMenuClick(info, tab) {
        try {
            const settings = await chrome.storage.sync.get();
            
            switch (info.menuItemId) {
                case 'captune-full-page':
                    await this.executeCapture(tab, 'fullPage', settings);
                    break;

                case 'captune-visible':
                    await this.executeCapture(tab, 'visible', settings);
                    break;

                case 'captune-element':
                    await this.executeCapture(tab, 'element', settings, info);
                    break;

                case 'captune-mobile':
                    await this.executeCapture(tab, 'mobile', settings);
                    break;

                case 'captune-all-devices':
                    await this.executeCapture(tab, 'allDevices', settings);
                    break;

                case 'captune-links':
                    await this.executeCapture(tab, 'withLinks', settings);
                    break;

                case 'captune-conversation':
                    await this.executeCapture(tab, 'conversation', settings);
                    break;
            }
        } catch (error) {
            console.error('Context menu action failed:', error);
            this.showNotification('Capture failed: ' + error.message, 'error');
        }
    }

    async handleCommand(command) {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const settings = await chrome.storage.sync.get();

            switch (command) {
                case 'capture-full-page':
                    await this.executeCapture(tab, 'fullPage', settings);
                    break;

                case 'capture-mobile-view':
                    await this.executeCapture(tab, 'mobile', settings);
                    break;

                case 'capture-with-links':
                    await this.executeCapture(tab, 'withLinks', settings);
                    break;
            }
        } catch (error) {
            console.error('Keyboard command failed:', error);
        }
    }

    async executeCapture(tab, type, settings, contextInfo = null) {
        try {
            // Show loading badge
            await chrome.action.setBadgeText({ text: '...', tabId: tab.id });
            await chrome.action.setBadgeBackgroundColor({ color: '#4CAF50', tabId: tab.id });

            // Send message to content script
            const message = {
                action: this.getCaptureAction(type),
                settings: settings,
                contextInfo: contextInfo
            };

            const result = await chrome.tabs.sendMessage(tab.id, message);

            if (result && result.success) {
                await chrome.action.setBadgeText({ text: '✓', tabId: tab.id });
                this.showNotification('Capture completed successfully!', 'success');
                
                // Clear badge after 2 seconds
                setTimeout(() => {
                    chrome.action.setBadgeText({ text: '', tabId: tab.id });
                }, 2000);
            } else {
                throw new Error(result?.error || 'Capture failed');
            }
        } catch (error) {
            await chrome.action.setBadgeText({ text: '✗', tabId: tab.id });
            await chrome.action.setBadgeBackgroundColor({ color: '#F44336', tabId: tab.id });
            
            setTimeout(() => {
                chrome.action.setBadgeText({ text: '', tabId: tab.id });
            }, 3000);
            
            throw error;
        }
    }

    getCaptureAction(type) {
        const actions = {
            fullPage: 'captureFullPage',
            visible: 'captureVisible',
            element: 'captureElement',
            mobile: 'captureMobile',
            allDevices: 'captureAllDevices',
            withLinks: 'captureWithLinks',
            conversation: 'captureLongConversation'
        };
        return actions[type] || 'captureFullPage';
    }

    async captureTab(tabId, options = {}) {
        const format = options.format || 'png';
        const quality = options.quality || 90;

        return await chrome.tabs.captureVisibleTab(null, {
            format: format === 'jpeg' ? 'jpeg' : 'png',
            quality: format === 'jpeg' ? quality : undefined
        });
    }

    async createOffscreenDocument() {
        // Check if offscreen document already exists
        const existingContexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT'],
            documentUrls: [chrome.runtime.getURL('offscreen.html')]
        });

        if (existingContexts.length === 0) {
            await chrome.offscreen.createDocument({
                url: 'offscreen.html',
                reasons: ['CLIPBOARD'],
                justification: 'Process images and handle clipboard operations'
            });
        }
    }

    async processImage(imageData, options) {
        // Create offscreen document for image processing
        await this.createOffscreenDocument();

        // Send processing request to offscreen document
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'processImage',
                imageData: imageData,
                options: options
            }, (response) => {
                if (response && response.success) {
                    resolve(response.data);
                } else {
                    reject(new Error(response?.error || 'Image processing failed'));
                }
            });
        });
    }

    async downloadFile(data, filename) {
        try {
            const downloadId = await chrome.downloads.download({
                url: data,
                filename: filename,
                saveAs: false
            });

            return downloadId;
        } catch (error) {
            console.error('Download failed:', error);
            throw error;
        }
    }

    async scheduleCapture(schedule) {
        const alarmName = `captune-scheduled-${Date.now()}`;
        
        await chrome.alarms.create(alarmName, {
            when: schedule.when,
            periodInMinutes: schedule.repeat ? schedule.intervalMinutes : undefined
        });

        // Store schedule details
        await chrome.storage.local.set({
            [alarmName]: {
                type: schedule.type,
                settings: schedule.settings,
                tabId: schedule.tabId
            }
        });
    }

    async handleAlarm(alarm) {
        if (alarm.name.startsWith('captune-scheduled-')) {
            try {
                const scheduleData = await chrome.storage.local.get(alarm.name);
                const schedule = scheduleData[alarm.name];

                if (schedule) {
                    const tab = await chrome.tabs.get(schedule.tabId);
                    await this.executeCapture(tab, schedule.type, schedule.settings);
                }
            } catch (error) {
                console.error('Scheduled capture failed:', error);
            }
        }
    }

    async handleTabComplete(tabId, tab) {
        // Check if this tab has auto-capture enabled
        const autoCapture = await chrome.storage.session.get(`autoCapture-${tabId}`);
        
        if (autoCapture[`autoCapture-${tabId}`]) {
            const settings = await chrome.storage.sync.get();
            await this.executeCapture(tab, 'fullPage', settings);
        }
    }

    showNotification(message, type = 'info') {
        const iconPath = type === 'error' ? 'icons/error.png' : 'icons/icon48.png';
        
        chrome.notifications.create({
            type: 'basic',
            iconUrl: iconPath,
            title: 'Captune',
            message: message
        });
    }
}

// Initialize background script
new CaptuneBackground();
