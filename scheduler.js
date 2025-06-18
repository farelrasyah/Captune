// Captune Scheduler for Auto Capture Features
class CaptuneScheduler {
    constructor() {
        this.activeSchedules = new Map();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for schedule requests
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'createSchedule') {
                this.createSchedule(request.schedule).then(result => {
                    sendResponse(result);
                });
                return true;
            }
            
            if (request.action === 'cancelSchedule') {
                this.cancelSchedule(request.scheduleId).then(result => {
                    sendResponse(result);
                });
                return true;
            }
            
            if (request.action === 'getActiveSchedules') {
                sendResponse({ 
                    success: true, 
                    schedules: Array.from(this.activeSchedules.values()) 
                });
                return true;
            }
        });

        // Listen for alarms (scheduled captures)
        chrome.alarms.onAlarm.addListener((alarm) => {
            this.handleScheduledCapture(alarm);
        });
    }

    async createSchedule(scheduleConfig) {
        try {
            const scheduleId = this.generateScheduleId();
            const schedule = {
                id: scheduleId,
                type: scheduleConfig.type,
                config: scheduleConfig.config,
                timing: scheduleConfig.timing,
                status: 'active',
                createdAt: new Date().toISOString(),
                nextRun: this.calculateNextRun(scheduleConfig.timing),
                runCount: 0,
                maxRuns: scheduleConfig.maxRuns || null
            };

            // Create Chrome alarm
            const alarmInfo = this.createAlarmInfo(schedule);
            await chrome.alarms.create(scheduleId, alarmInfo);

            // Store schedule
            this.activeSchedules.set(scheduleId, schedule);
            await this.saveSchedulesToStorage();

            return { success: true, scheduleId: scheduleId };
        } catch (error) {
            console.error('Failed to create schedule:', error);
            return { success: false, error: error.message };
        }
    }

    async cancelSchedule(scheduleId) {
        try {
            // Clear alarm
            await chrome.alarms.clear(scheduleId);
            
            // Remove from active schedules
            this.activeSchedules.delete(scheduleId);
            await this.saveSchedulesToStorage();

            return { success: true };
        } catch (error) {
            console.error('Failed to cancel schedule:', error);
            return { success: false, error: error.message };
        }
    }

    async handleScheduledCapture(alarm) {
        const schedule = this.activeSchedules.get(alarm.name);
        if (!schedule) {
            console.warn('No schedule found for alarm:', alarm.name);
            return;
        }

        try {
            console.log('Executing scheduled capture:', schedule);
            
            // Execute the scheduled capture
            const result = await this.executeScheduledCapture(schedule);
            
            // Update schedule stats
            schedule.runCount++;
            schedule.lastRun = new Date().toISOString();
            schedule.lastResult = result;

            // Check if schedule should continue
            if (schedule.maxRuns && schedule.runCount >= schedule.maxRuns) {
                // Schedule completed, remove it
                await this.cancelSchedule(schedule.id);
                this.notifyScheduleCompleted(schedule);
            } else if (schedule.timing.type === 'recurring') {
                // Update next run time
                schedule.nextRun = this.calculateNextRun(schedule.timing);
                await this.saveSchedulesToStorage();
            } else {
                // One-time schedule, remove it
                await this.cancelSchedule(schedule.id);
            }

            // Notify about capture completion
            this.notifyScheduledCaptureCompleted(schedule, result);

        } catch (error) {
            console.error('Scheduled capture failed:', error);
            schedule.lastError = error.message;
            schedule.lastRun = new Date().toISOString();
            
            // Notify about failure
            this.notifyScheduledCaptureFailed(schedule, error);
        }
    }

    async executeScheduledCapture(schedule) {
        switch (schedule.type) {
            case 'single-page':
                return await this.captureSinglePage(schedule.config);
            
            case 'multiple-pages':
                return await this.captureMultiplePages(schedule.config);
            
            case 'auto-monitor':
                return await this.autoMonitorCapture(schedule.config);
            
            case 'social-scroll':
                return await this.socialScrollCapture(schedule.config);
            
            default:
                throw new Error('Unknown schedule type: ' + schedule.type);
        }
    }

    async captureSinglePage(config) {
        try {
            // Get target tab or create new one
            let tab;
            if (config.tabId) {
                try {
                    tab = await chrome.tabs.get(config.tabId);
                } catch (error) {
                    // Tab no longer exists, create new one
                    tab = await chrome.tabs.create({ url: config.url, active: false });
                }
            } else {
                tab = await chrome.tabs.create({ url: config.url, active: false });
            }

            // Wait for page to load
            await this.waitForTabLoad(tab.id);
            
            // Wait additional time if specified
            if (config.waitTime) {
                await this.delay(config.waitTime * 1000);
            }

            // Perform capture
            const captureResult = await chrome.tabs.sendMessage(tab.id, {
                action: 'captureFullPage',
                settings: config.captureSettings || {}
            });

            // Auto-save if enabled
            if (config.autoSave) {
                await this.saveCapture(captureResult.data, config);
            }

            // Close tab if it was created for this capture
            if (!config.tabId) {
                await chrome.tabs.remove(tab.id);
            }

            return {
                success: true,
                url: config.url,
                timestamp: new Date().toISOString(),
                fileSize: this.estimateFileSize(captureResult.data)
            };

        } catch (error) {
            throw new Error(`Single page capture failed: ${error.message}`);
        }
    }

    async captureMultiplePages(config) {
        const results = [];
        const errors = [];

        for (let i = 0; i < config.urls.length; i++) {
            const url = config.urls[i];
            
            try {
                // Create delay between captures if specified
                if (i > 0 && config.delayBetweenCaptures) {
                    await this.delay(config.delayBetweenCaptures * 1000);
                }

                const result = await this.captureSinglePage({
                    ...config,
                    url: url,
                    filename: config.filename ? `${config.filename}_${i + 1}` : undefined
                });

                results.push(result);

            } catch (error) {
                errors.push({ url, error: error.message });
            }
        }

        // Create combined PDF if requested
        if (config.combineToPDF && results.length > 0) {
            await this.createCombinedPDF(results, config);
        }

        return {
            success: true,
            totalPages: config.urls.length,
            successfulCaptures: results.length,
            errors: errors,
            results: results
        };
    }

    async autoMonitorCapture(config) {
        try {
            // Get the tab to monitor
            const tab = await chrome.tabs.get(config.tabId);
            
            // Check if page has changed since last capture
            const currentContent = await this.getPageHash(tab.id);
            
            if (config.lastContentHash && currentContent === config.lastContentHash) {
                // No changes detected
                return {
                    success: true,
                    changed: false,
                    message: 'No changes detected'
                };
            }

            // Changes detected, perform capture
            const captureResult = await chrome.tabs.sendMessage(tab.id, {
                action: 'captureFullPage',
                settings: config.captureSettings || {}
            });

            // Update content hash
            config.lastContentHash = currentContent;

            // Auto-save with timestamp
            if (config.autoSave) {
                await this.saveCapture(captureResult.data, {
                    ...config,
                    filename: `${config.filename || 'monitor'}_${Date.now()}`
                });
            }

            return {
                success: true,
                changed: true,
                timestamp: new Date().toISOString(),
                contentHash: currentContent
            };

        } catch (error) {
            throw new Error(`Auto monitor capture failed: ${error.message}`);
        }
    }

    async socialScrollCapture(config) {
        try {
            const tab = await chrome.tabs.get(config.tabId);
            
            // Inject scroll automation script
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: this.autoScrollFunction,
                args: [config.scrollConfig]
            });

            // Wait for scrolling to complete
            await this.delay((config.scrollConfig.duration || 60) * 1000);

            // Perform capture
            const captureResult = await chrome.tabs.sendMessage(tab.id, {
                action: 'captureLongConversation',
                settings: config.captureSettings || {}
            });

            // Auto-save
            if (config.autoSave) {
                await this.saveCapture(captureResult.data, config);
            }

            return {
                success: true,
                scrollDuration: config.scrollConfig.duration,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Social scroll capture failed: ${error.message}`);
        }
    }

    // Utility functions
    generateScheduleId() {
        return 'schedule_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    createAlarmInfo(schedule) {
        const timing = schedule.timing;
        
        switch (timing.type) {
            case 'once':
                return { when: new Date(timing.datetime).getTime() };
            
            case 'recurring':
                const now = Date.now();
                let when;
                
                if (timing.interval === 'daily') {
                    when = now + (24 * 60 * 60 * 1000);
                } else if (timing.interval === 'hourly') {
                    when = now + (60 * 60 * 1000);
                } else if (timing.interval === 'custom') {
                    when = now + (timing.minutes * 60 * 1000);
                }
                
                return {
                    when: when,
                    periodInMinutes: timing.interval === 'daily' ? 1440 :
                                   timing.interval === 'hourly' ? 60 :
                                   timing.minutes
                };
            
            default:
                throw new Error('Invalid timing type: ' + timing.type);
        }
    }

    calculateNextRun(timing) {
        if (timing.type === 'once') {
            return timing.datetime;
        }
        
        const now = new Date();
        
        switch (timing.interval) {
            case 'daily':
                return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
            case 'hourly':
                return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
            case 'custom':
                return new Date(now.getTime() + timing.minutes * 60 * 1000).toISOString();
            default:
                return null;
        }
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
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async getPageHash(tabId) {
        try {
            const result = await chrome.tabs.sendMessage(tabId, {
                action: 'getPageHash'
            });
            return result.hash;
        } catch (error) {
            console.error('Failed to get page hash:', error);
            return null;
        }
    }

    async saveCapture(imageData, config) {
        const filename = this.generateFilename(config);
        
        try {
            await chrome.downloads.download({
                url: imageData,
                filename: filename,
                saveAs: false
            });
        } catch (error) {
            console.error('Failed to save capture:', error);
        }
    }

    generateFilename(config) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const baseName = config.filename || 'captune-scheduled';
        const extension = config.format || 'png';
        
        return `${baseName}_${timestamp}.${extension}`;
    }

    estimateFileSize(dataUrl) {
        // Rough estimation based on data URL length
        const sizeInBytes = Math.round((dataUrl.length * 3) / 4);
        return Math.round(sizeInBytes / 1024); // Return size in KB
    }

    async createCombinedPDF(results, config) {
        // This would create a combined PDF from multiple captures
        // Implementation would depend on PDF generation library
        console.log('Creating combined PDF from results:', results);
    }

    async saveSchedulesToStorage() {
        const schedulesArray = Array.from(this.activeSchedules.values());
        await chrome.storage.local.set({ 'captune_schedules': schedulesArray });
    }

    async loadSchedulesFromStorage() {
        try {
            const result = await chrome.storage.local.get('captune_schedules');
            const schedules = result.captune_schedules || [];
            
            this.activeSchedules.clear();
            schedules.forEach(schedule => {
                this.activeSchedules.set(schedule.id, schedule);
                
                // Recreate alarms for active schedules
                if (schedule.status === 'active') {
                    const alarmInfo = this.createAlarmInfo(schedule);
                    chrome.alarms.create(schedule.id, alarmInfo);
                }
            });
        } catch (error) {
            console.error('Failed to load schedules:', error);
        }
    }

    // Notification functions
    notifyScheduledCaptureCompleted(schedule, result) {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Captune - Scheduled Capture Complete',
            message: `Captured: ${result.url || 'Page'}`
        });
    }

    notifyScheduledCaptureFailed(schedule, error) {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/error.png',
            title: 'Captune - Scheduled Capture Failed',
            message: `Error: ${error.message}`
        });
    }

    notifyScheduleCompleted(schedule) {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Captune - Schedule Completed',
            message: `Schedule "${schedule.id}" has finished all runs.`
        });
    }

    // Auto-scroll function (injected into pages)
    autoScrollFunction(scrollConfig) {
        let scrollCount = 0;
        const maxScrolls = scrollConfig.maxScrolls || 50;
        const scrollInterval = scrollConfig.scrollInterval || 2000;
        const scrollStep = scrollConfig.scrollStep || window.innerHeight;
        
        const scrollTimer = setInterval(() => {
            const currentHeight = document.body.scrollHeight;
            window.scrollBy(0, scrollStep);
            
            // Check if we've reached the bottom or max scrolls
            setTimeout(() => {
                const newHeight = document.body.scrollHeight;
                scrollCount++;
                
                if (newHeight === currentHeight || scrollCount >= maxScrolls) {
                    clearInterval(scrollTimer);
                    console.log('Auto-scroll completed');
                }
            }, 1000);
            
        }, scrollInterval);
        
        // Safety timeout
        setTimeout(() => {
            clearInterval(scrollTimer);
            console.log('Auto-scroll timeout reached');
        }, (scrollConfig.duration || 60) * 1000);
    }
}

// Initialize scheduler
const scheduler = new CaptuneScheduler();

// Load existing schedules on startup
scheduler.loadSchedulesFromStorage();
