// Captune Options Script
class CaptuneOptions {
    constructor() {
        this.defaultSettings = {
            // General
            autoSave: true,
            showNotifications: true,
            closePopup: true,
            filenamePattern: 'captune-{date}-{time}',
            theme: 'auto',
            language: 'en',

            // Capture
            defaultIncludeSticky: true,
            defaultRetina: true,
            defaultAutoExpand: false,
            scrollDelay: 200,
            maxPageHeight: 20000,
            overlapPixels: 100,
            desktopWidth: 1920,
            tabletWidth: 768,
            mobileWidth: 375,

            // Export
            defaultFormat: 'png',
            jpegQuality: 90,
            webpQuality: 85,
            pngCompression: 6,
            enableWatermark: false,
            watermarkText: 'Captured with Captune',
            watermarkPosition: 'bottom-right',
            watermarkOpacity: 50,
            maxFileSize: 50,

            // Shortcuts
            enableContextMenu: true,
            contextMenuItems: {
                fullPage: true,
                visible: true,
                element: true,
                mobile: false
            },

            // Advanced
            concurrentCaptures: 3,
            cacheSize: 100,
            developerMode: false,
            debugLogging: false,
            expandSelectors: [
                '.show-more',
                '.load-more',
                '[data-testid*="show-more"]',
                'button[contains(text(), "Show more")]'
            ],
            stickySelectors: [
                '.sticky-header',
                '.fixed-nav',
                '[style*="position: fixed"]',
                '[style*="position: sticky"]'
            ]
        };

        this.currentSettings = {};
        this.originalSettings = {};
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.setupEventListeners();
        this.updateUI();
    }

    async loadSettings() {
        try {
            const stored = await chrome.storage.sync.get(this.defaultSettings);
            this.currentSettings = { ...this.defaultSettings, ...stored };
            this.originalSettings = { ...this.currentSettings };
        } catch (error) {
            console.error('Failed to load settings:', error);
            this.currentSettings = { ...this.defaultSettings };
            this.originalSettings = { ...this.currentSettings };
        }
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Setting inputs
        this.setupGeneralListeners();
        this.setupCaptureListeners();
        this.setupExportListeners();
        this.setupShortcutListeners();
        this.setupAdvancedListeners();

        // Footer buttons
        document.getElementById('save-settings').addEventListener('click', () => this.saveSettings());
        document.getElementById('cancel-settings').addEventListener('click', () => this.cancelSettings());

        // Footer links
        document.getElementById('about-link').addEventListener('click', () => this.showAbout());
        document.getElementById('help-link').addEventListener('click', () => this.showHelp());
        document.getElementById('feedback-link').addEventListener('click', () => this.showFeedback());
    }

    setupGeneralListeners() {
        // Checkboxes
        ['auto-save', 'show-notifications', 'close-popup'].forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                const key = this.camelCase(id);
                this.currentSettings[key] = e.target.checked;
            });
        });

        // Text inputs
        document.getElementById('filename-pattern').addEventListener('change', (e) => {
            this.currentSettings.filenamePattern = e.target.value;
        });

        // Selects
        document.getElementById('theme').addEventListener('change', (e) => {
            this.currentSettings.theme = e.target.value;
            this.applyTheme(e.target.value);
        });

        document.getElementById('language').addEventListener('change', (e) => {
            this.currentSettings.language = e.target.value;
        });
    }

    setupCaptureListeners() {
        // Checkboxes
        ['default-include-sticky', 'default-retina', 'default-auto-expand'].forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                const key = this.camelCase(id);
                this.currentSettings[key] = e.target.checked;
            });
        });

        // Range inputs
        document.getElementById('scroll-delay').addEventListener('input', (e) => {
            this.currentSettings.scrollDelay = parseInt(e.target.value);
            document.getElementById('scroll-delay-value').textContent = e.target.value + 'ms';
        });

        document.getElementById('overlap-pixels').addEventListener('input', (e) => {
            this.currentSettings.overlapPixels = parseInt(e.target.value);
            document.getElementById('overlap-pixels-value').textContent = e.target.value + 'px';
        });

        // Number inputs
        ['max-page-height', 'desktop-width', 'tablet-width', 'mobile-width'].forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                const key = this.camelCase(id);
                this.currentSettings[key] = parseInt(e.target.value);
            });
        });
    }

    setupExportListeners() {
        // Select
        document.getElementById('default-format').addEventListener('change', (e) => {
            this.currentSettings.defaultFormat = e.target.value;
        });

        // Quality ranges
        ['jpeg-quality', 'webp-quality', 'png-compression'].forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                const key = this.camelCase(id);
                this.currentSettings[key] = parseInt(e.target.value);
                
                const suffix = id.includes('compression') ? '' : '%';
                document.getElementById(id + '-value').textContent = e.target.value + suffix;
            });
        });

        // Watermark settings
        document.getElementById('enable-watermark').addEventListener('change', (e) => {
            this.currentSettings.enableWatermark = e.target.checked;
            this.toggleWatermarkSettings(e.target.checked);
        });

        document.getElementById('watermark-text').addEventListener('change', (e) => {
            this.currentSettings.watermarkText = e.target.value;
        });

        document.getElementById('watermark-position').addEventListener('change', (e) => {
            this.currentSettings.watermarkPosition = e.target.value;
        });

        document.getElementById('watermark-opacity').addEventListener('input', (e) => {
            this.currentSettings.watermarkOpacity = parseInt(e.target.value);
            document.getElementById('watermark-opacity-value').textContent = e.target.value + '%';
        });

        document.getElementById('max-file-size').addEventListener('change', (e) => {
            this.currentSettings.maxFileSize = parseInt(e.target.value);
        });
    }

    setupShortcutListeners() {
        // Context menu
        document.getElementById('enable-context-menu').addEventListener('change', (e) => {
            this.currentSettings.enableContextMenu = e.target.checked;
            this.toggleContextMenuSettings(e.target.checked);
        });

        // Context menu items
        ['context-full-page', 'context-visible', 'context-element', 'context-mobile'].forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                const key = id.replace('context-', '').replace('-', '');
                if (key === 'fullpage') key = 'fullPage';
                this.currentSettings.contextMenuItems[key] = e.target.checked;
            });
        });

        // Shortcut change buttons
        document.querySelectorAll('.change-shortcut').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const shortcutInput = e.target.closest('.shortcut-input');
                const command = shortcutInput.dataset.command;
                this.showShortcutModal(command);
            });
        });
    }

    setupAdvancedListeners() {
        // Number inputs
        ['concurrent-captures', 'cache-size'].forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                const key = this.camelCase(id);
                this.currentSettings[key] = parseInt(e.target.value);
            });
        });

        // Checkboxes
        ['developer-mode', 'debug-logging'].forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                const key = this.camelCase(id);
                this.currentSettings[key] = e.target.checked;
            });
        });

        // Textareas
        ['expand-selectors', 'sticky-selectors'].forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                const key = this.camelCase(id);
                this.currentSettings[key] = e.target.value.split('\n').filter(line => line.trim());
            });
        });

        // Action buttons
        document.getElementById('export-settings').addEventListener('click', () => this.exportSettings());
        document.getElementById('import-settings').addEventListener('click', () => this.importSettings());
        document.getElementById('reset-settings').addEventListener('click', () => this.resetSettings());
        document.getElementById('clear-cache').addEventListener('click', () => this.clearCache());

        // Import file input
        document.getElementById('import-file-input').addEventListener('change', (e) => {
            this.handleImportFile(e.target.files[0]);
        });
    }

    switchTab(tabName) {
        // Update nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content sections
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');
    }

    updateUI() {
        // General
        document.getElementById('auto-save').checked = this.currentSettings.autoSave;
        document.getElementById('show-notifications').checked = this.currentSettings.showNotifications;
        document.getElementById('close-popup').checked = this.currentSettings.closePopup;
        document.getElementById('filename-pattern').value = this.currentSettings.filenamePattern;
        document.getElementById('theme').value = this.currentSettings.theme;
        document.getElementById('language').value = this.currentSettings.language;

        // Capture
        document.getElementById('default-include-sticky').checked = this.currentSettings.defaultIncludeSticky;
        document.getElementById('default-retina').checked = this.currentSettings.defaultRetina;
        document.getElementById('default-auto-expand').checked = this.currentSettings.defaultAutoExpand;
        
        document.getElementById('scroll-delay').value = this.currentSettings.scrollDelay;
        document.getElementById('scroll-delay-value').textContent = this.currentSettings.scrollDelay + 'ms';
        
        document.getElementById('max-page-height').value = this.currentSettings.maxPageHeight;
        
        document.getElementById('overlap-pixels').value = this.currentSettings.overlapPixels;
        document.getElementById('overlap-pixels-value').textContent = this.currentSettings.overlapPixels + 'px';
        
        document.getElementById('desktop-width').value = this.currentSettings.desktopWidth;
        document.getElementById('tablet-width').value = this.currentSettings.tabletWidth;
        document.getElementById('mobile-width').value = this.currentSettings.mobileWidth;

        // Export
        document.getElementById('default-format').value = this.currentSettings.defaultFormat;
        
        document.getElementById('jpeg-quality').value = this.currentSettings.jpegQuality;
        document.getElementById('jpeg-quality-value').textContent = this.currentSettings.jpegQuality + '%';
        
        document.getElementById('webp-quality').value = this.currentSettings.webpQuality;
        document.getElementById('webp-quality-value').textContent = this.currentSettings.webpQuality + '%';
        
        document.getElementById('png-compression').value = this.currentSettings.pngCompression;
        document.getElementById('png-compression-value').textContent = this.currentSettings.pngCompression;
        
        document.getElementById('enable-watermark').checked = this.currentSettings.enableWatermark;
        document.getElementById('watermark-text').value = this.currentSettings.watermarkText;
        document.getElementById('watermark-position').value = this.currentSettings.watermarkPosition;
        
        document.getElementById('watermark-opacity').value = this.currentSettings.watermarkOpacity;
        document.getElementById('watermark-opacity-value').textContent = this.currentSettings.watermarkOpacity + '%';
        
        document.getElementById('max-file-size').value = this.currentSettings.maxFileSize;

        // Shortcuts
        document.getElementById('enable-context-menu').checked = this.currentSettings.enableContextMenu;
        
        const contextItems = this.currentSettings.contextMenuItems;
        document.getElementById('context-full-page').checked = contextItems.fullPage;
        document.getElementById('context-visible').checked = contextItems.visible;
        document.getElementById('context-element').checked = contextItems.element;
        document.getElementById('context-mobile').checked = contextItems.mobile;

        // Advanced
        document.getElementById('concurrent-captures').value = this.currentSettings.concurrentCaptures;
        document.getElementById('cache-size').value = this.currentSettings.cacheSize;
        document.getElementById('developer-mode').checked = this.currentSettings.developerMode;
        document.getElementById('debug-logging').checked = this.currentSettings.debugLogging;
        
        document.getElementById('expand-selectors').value = this.currentSettings.expandSelectors.join('\n');
        document.getElementById('sticky-selectors').value = this.currentSettings.stickySelectors.join('\n');

        // Apply conditional states
        this.toggleWatermarkSettings(this.currentSettings.enableWatermark);
        this.toggleContextMenuSettings(this.currentSettings.enableContextMenu);
        this.applyTheme(this.currentSettings.theme);
    }

    toggleWatermarkSettings(enabled) {
        const watermarkInputs = ['watermark-text', 'watermark-position', 'watermark-opacity'];
        watermarkInputs.forEach(id => {
            document.getElementById(id).disabled = !enabled;
        });
    }

    toggleContextMenuSettings(enabled) {
        document.querySelector('.context-menu-options').style.opacity = enabled ? '1' : '0.5';
        document.querySelectorAll('.context-menu-options input').forEach(input => {
            input.disabled = !enabled;
        });
    }

    applyTheme(theme) {
        document.body.className = theme === 'auto' ? '' : `theme-${theme}`;
    }

    showShortcutModal(command) {
        // Implementation for shortcut change modal
        console.log('Changing shortcut for:', command);
        // This would show a modal to capture new key combination
    }

    async saveSettings() {
        try {
            await chrome.storage.sync.set(this.currentSettings);
            this.originalSettings = { ...this.currentSettings };
            
            // Send message to background script to update context menus
            await chrome.runtime.sendMessage({
                action: 'updateSettings',
                settings: this.currentSettings
            });
            
            this.showNotification('Settings saved successfully!', 'success');
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showNotification('Failed to save settings: ' + error.message, 'error');
        }
    }

    cancelSettings() {
        this.currentSettings = { ...this.originalSettings };
        this.updateUI();
        window.close();
    }

    exportSettings() {
        const settingsData = {
            version: '1.0.0',
            settings: this.currentSettings,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(settingsData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'captune-settings.json';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('Settings exported successfully!', 'success');
    }

    importSettings() {
        document.getElementById('import-file-input').click();
    }

    async handleImportFile(file) {
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (data.settings) {
                this.currentSettings = { ...this.defaultSettings, ...data.settings };
                this.updateUI();
                this.showNotification('Settings imported successfully!', 'success');
            } else {
                throw new Error('Invalid settings file format');
            }
        } catch (error) {
            this.showNotification('Failed to import settings: ' + error.message, 'error');
        }
    }

    async resetSettings() {
        if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
            this.currentSettings = { ...this.defaultSettings };
            this.updateUI();
            this.showNotification('Settings reset to defaults', 'success');
        }
    }

    async clearCache() {
        try {
            await chrome.storage.local.clear();
            this.showNotification('Cache cleared successfully!', 'success');
        } catch (error) {
            this.showNotification('Failed to clear cache: ' + error.message, 'error');
        }
    }

    showAbout() {
        alert(`Captune v1.0.0

Professional Screenshot Tool for Chrome

Features:
• Full page HD capture with smart stitching
• Visual editor with annotation tools
• Multi-device viewport capture
• Batch processing and PDF export
• Developer overlay mode
• Long conversation capture

Created by [Your Name]
https://github.com/yourusername/captune`);
    }

    showHelp() {
        const helpUrl = chrome.runtime.getURL('help.html');
        chrome.tabs.create({ url: helpUrl });
    }

    showFeedback() {
        const feedbackUrl = 'https://github.com/yourusername/captune/issues';
        chrome.tabs.create({ url: feedbackUrl });
    }

    showNotification(message, type = 'info') {
        // Simple notification - could be improved with a proper notification system
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'error' ? '#f44336' : '#4caf50'};
            color: white;
            border-radius: 4px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    camelCase(str) {
        return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    }
}

// Initialize options page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CaptuneOptions();
});
