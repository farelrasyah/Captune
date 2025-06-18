// Content Script for Captune Extension
class CaptuneContent {
    constructor() {
        this.isCapturing = false;
        this.selectionMode = false;
        this.elementMode = false;
        this.setupMessageListener();
        this.createOverlayElements();
        console.log('Captune content script initialized');
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // Will respond asynchronously
        });
    }async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'ping':
                    sendResponse({ success: true, message: 'Content script is ready' });
                    break;

                case 'captureFullPage':
                    const fullPageResult = await this.captureFullPage(request.settings);
                    sendResponse(fullPageResult);
                    break;

                case 'captureVisible':
                    const visibleResult = await this.captureVisible(request.settings);
                    sendResponse(visibleResult);
                    break;

                case 'startSelectionMode':
                    this.startSelectionMode();
                    sendResponse({ success: true });
                    break;

                case 'startElementMode':
                    this.startElementMode();
                    sendResponse({ success: true });
                    break;

                case 'captureDevice':
                    const deviceResult = await this.captureDevice(request.device, request.settings);
                    sendResponse(deviceResult);
                    break;

                case 'getAllLinks':
                    const linksResult = this.getAllLinks();
                    sendResponse(linksResult);
                    break;

                case 'captureLongConversation':
                    const conversationResult = await this.captureLongConversation(request.settings);
                    sendResponse(conversationResult);
                    break;

                case 'captureElement':
                    const elementResult = await this.captureSpecificElement(request.selector, request.settings);
                    sendResponse(elementResult);
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Content script error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    createOverlayElements() {
        // Create selection overlay
        this.selectionOverlay = document.createElement('div');
        this.selectionOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.3);
            z-index: 999999;
            display: none;
            cursor: crosshair;
        `;

        // Create selection box
        this.selectionBox = document.createElement('div');
        this.selectionBox.style.cssText = `
            position: absolute;
            border: 2px dashed #4CAF50;
            background: rgba(76, 175, 80, 0.1);
            display: none;
            pointer-events: none;
        `;

        // Create element highlight
        this.elementHighlight = document.createElement('div');
        this.elementHighlight.style.cssText = `
            position: absolute;
            border: 2px solid #2196F3;
            background: rgba(33, 150, 243, 0.1);
            pointer-events: none;
            z-index: 999998;
            display: none;
        `;

        this.selectionOverlay.appendChild(this.selectionBox);
        document.body.appendChild(this.selectionOverlay);
        document.body.appendChild(this.elementHighlight);
    }

    async captureFullPage(settings) {
        try {
            this.isCapturing = true;
            
            // Get page dimensions
            const dimensions = this.getPageDimensions();
            
            // Handle sticky elements
            if (!settings.includeSticky) {
                this.hideStickyElements();
            }

            // Add developer overlay if requested
            if (settings.developerOverlay) {
                this.addDeveloperOverlay();
            }

            // Auto-expand content if requested
            if (settings.autoExpand) {
                await this.autoExpandContent();
            }

            // Perform full page capture using viewport stitching
            const imageData = await this.performFullPageCapture(dimensions, settings);

            // Cleanup
            this.cleanup();
            
            return { success: true, data: imageData };
        } catch (error) {
            this.cleanup();
            return { success: false, error: error.message };
        } finally {
            this.isCapturing = false;
        }
    }    async captureVisible(settings) {
        try {
            // Add developer overlay if requested
            if (settings.developerOverlay) {
                this.addDeveloperOverlay();
            }

            // Send message to background script to capture visible area
            const result = await chrome.runtime.sendMessage({
                action: 'captureVisible',
                options: {
                    format: settings.outputFormat === 'jpeg' ? 'jpeg' : 'png',
                    quality: settings.jpegQuality || 90
                }
            });

            this.cleanup();
            
            if (result.success) {
                return { success: true, data: result.data };
            } else {
                throw new Error(result.error || 'Capture failed');
            }
        } catch (error) {
            this.cleanup();
            return { success: false, error: error.message };
        }
    }

    async captureDevice(deviceSettings, settings) {
        try {
            // Store current viewport
            const originalViewport = {
                width: window.innerWidth,
                height: window.innerHeight
            };

            // Set device viewport
            await this.setViewportSize(deviceSettings.width, deviceSettings.height);
            
            // Wait for layout to settle
            await this.waitForLayoutStable();

            // Capture with new viewport
            const result = await this.captureFullPage(settings);

            // Restore original viewport
            await this.setViewportSize(originalViewport.width, originalViewport.height);

            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    startSelectionMode() {
        this.selectionMode = true;
        this.selectionOverlay.style.display = 'block';
        
        let startX, startY, isSelecting = false;

        const onMouseDown = (e) => {
            if (e.target === this.selectionOverlay) {
                isSelecting = true;
                startX = e.clientX;
                startY = e.clientY;
                this.selectionBox.style.left = startX + 'px';
                this.selectionBox.style.top = startY + 'px';
                this.selectionBox.style.width = '0px';
                this.selectionBox.style.height = '0px';
                this.selectionBox.style.display = 'block';
            }
        };

        const onMouseMove = (e) => {
            if (isSelecting) {
                const currentX = e.clientX;
                const currentY = e.clientY;
                const width = Math.abs(currentX - startX);
                const height = Math.abs(currentY - startY);
                const left = Math.min(startX, currentX);
                const top = Math.min(startY, currentY);

                this.selectionBox.style.left = left + 'px';
                this.selectionBox.style.top = top + 'px';
                this.selectionBox.style.width = width + 'px';
                this.selectionBox.style.height = height + 'px';
            }
        };

        const onMouseUp = async (e) => {
            if (isSelecting) {
                isSelecting = false;
                
                // Get selection bounds
                const rect = this.selectionBox.getBoundingClientRect();
                
                if (rect.width > 10 && rect.height > 10) {
                    // Capture selected area
                    await this.captureSelection(rect);
                }
                
                this.endSelectionMode();
            }
        };

        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                this.endSelectionMode();
            }
        };

        this.selectionOverlay.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('keydown', onKeyDown);

        // Store event listeners for cleanup
        this.selectionListeners = { onMouseDown, onMouseMove, onMouseUp, onKeyDown };
    }

    endSelectionMode() {
        this.selectionMode = false;
        this.selectionOverlay.style.display = 'none';
        this.selectionBox.style.display = 'none';

        if (this.selectionListeners) {
            this.selectionOverlay.removeEventListener('mousedown', this.selectionListeners.onMouseDown);
            document.removeEventListener('mousemove', this.selectionListeners.onMouseMove);
            document.removeEventListener('mouseup', this.selectionListeners.onMouseUp);
            document.removeEventListener('keydown', this.selectionListeners.onKeyDown);
            this.selectionListeners = null;
        }
    }

    startElementMode() {
        this.elementMode = true;
        document.body.style.cursor = 'crosshair';

        const onMouseOver = (e) => {
            if (e.target === this.elementHighlight) return;
            
            const rect = e.target.getBoundingClientRect();
            this.elementHighlight.style.left = (rect.left + window.scrollX) + 'px';
            this.elementHighlight.style.top = (rect.top + window.scrollY) + 'px';
            this.elementHighlight.style.width = rect.width + 'px';
            this.elementHighlight.style.height = rect.height + 'px';
            this.elementHighlight.style.display = 'block';
        };

        const onClick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Capture clicked element
            await this.captureClickedElement(e.target);
            this.endElementMode();
        };

        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                this.endElementMode();
            }
        };

        document.addEventListener('mouseover', onMouseOver);
        document.addEventListener('click', onClick, true);
        document.addEventListener('keydown', onKeyDown);

        this.elementListeners = { onMouseOver, onClick, onKeyDown };
    }

    endElementMode() {
        this.elementMode = false;
        document.body.style.cursor = '';
        this.elementHighlight.style.display = 'none';

        if (this.elementListeners) {
            document.removeEventListener('mouseover', this.elementListeners.onMouseOver);
            document.removeEventListener('click', this.elementListeners.onClick, true);
            document.removeEventListener('keydown', this.elementListeners.onKeyDown);
            this.elementListeners = null;
        }
    }    async performFullPageCapture(dimensions, settings) {
        const captures = [];
        const viewportHeight = window.innerHeight;
        const scrollStep = viewportHeight - 100; // Overlap for better stitching
        let currentScroll = 0;

        // Scroll through the page and capture each viewport
        while (currentScroll < dimensions.scrollHeight) {
            window.scrollTo(0, currentScroll);
            await this.waitForScroll();

            // Capture current viewport using background script
            const result = await chrome.runtime.sendMessage({
                action: 'captureVisible',
                options: {
                    format: 'png',
                    quality: 100
                }
            });

            if (result.success) {
                captures.push({
                    dataUrl: result.data,
                    scrollY: currentScroll,
                    viewportHeight: viewportHeight
                });
            } else {
                throw new Error('Failed to capture viewport at scroll ' + currentScroll);
            }

            currentScroll += scrollStep;
        }

        // Restore original scroll position
        window.scrollTo(0, 0);

        // Stitch images together
        return await this.stitchImages(captures, dimensions, settings);
    }

    async stitchImages(captures, dimensions, settings) {
        // Create offscreen canvas for stitching
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size based on settings
        const scale = settings.retinaQuality ? 2 : 1;
        canvas.width = window.innerWidth * scale;
        canvas.height = dimensions.scrollHeight * scale;

        // Load and draw each capture
        for (let i = 0; i < captures.length; i++) {
            const capture = captures[i];
            const img = await this.loadImage(capture.dataUrl);
            
            const yOffset = capture.scrollY * scale;
            ctx.drawImage(img, 0, yOffset, img.width, img.height);
        }

        // Convert to desired format
        const format = settings.outputFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
        const quality = settings.outputFormat === 'jpeg' ? (settings.jpegQuality || 90) / 100 : undefined;
        
        return canvas.toDataURL(format, quality);
    }

    async autoExpandContent() {
        // Common selectors for expandable content
        const expandSelectors = [
            '[data-testid*="show-more"]',
            '[aria-label*="Show more"]',
            'button[contains(text(), "Show more")]',
            'button[contains(text(), "Load more")]',
            'button[contains(text(), "See more")]',
            '.show-more',
            '.load-more',
            '.expand-button',
            '[class*="expand"]',
            '[class*="show-more"]'
        ];

        let expanded = false;
        
        for (const selector of expandSelectors) {
            const buttons = document.querySelectorAll(selector);
            for (const button of buttons) {
                if (button.offsetParent !== null) { // Is visible
                    button.click();
                    expanded = true;
                    await this.waitForContent();
                }
            }
        }

        // Handle infinite scroll
        if (this.hasInfiniteScroll()) {
            await this.handleInfiniteScroll();
        }

        return expanded;
    }

    async captureLongConversation(settings) {
        try {
            // Auto-expand all conversation threads
            await this.autoExpandContent();
            
            // Look for specific conversation elements
            await this.expandConversationThreads();
            
            // Capture the expanded conversation
            return await this.captureFullPage(settings);
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async expandConversationThreads() {
        // Common selectors for conversation threads
        const threadSelectors = [
            '[data-testid*="thread"]',
            '[class*="thread"]',
            '[class*="reply"]',
            '[class*="comment"]',
            '.comment-thread',
            '.reply-thread',
            '[aria-label*="replies"]',
            '[aria-label*="thread"]'
        ];

        for (const selector of threadSelectors) {
            const elements = document.querySelectorAll(selector + ' button, ' + selector + ' [role="button"]');
            for (const element of elements) {
                if (element.textContent.toLowerCase().includes('show') || 
                    element.textContent.toLowerCase().includes('more') ||
                    element.textContent.toLowerCase().includes('replies')) {
                    element.click();
                    await this.waitForContent();
                }
            }
        }
    }

    getAllLinks() {
        const links = Array.from(document.querySelectorAll('a[href]'))
            .map(link => ({
                url: link.href,
                text: link.textContent.trim(),
                title: link.title || link.textContent.trim()
            }))
            .filter(link => link.url && !link.url.startsWith('javascript:') && !link.url.startsWith('#'));

        return { success: true, links: links };
    }

    addDeveloperOverlay() {
        // Create grid overlay
        if (!document.getElementById('captune-grid-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'captune-grid-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 999997;
                background-image: 
                    linear-gradient(to right, rgba(255,0,0,0.1) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(255,0,0,0.1) 1px, transparent 1px);
                background-size: 10px 10px;
            `;
            document.body.appendChild(overlay);
        }

        // Add element outlines
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
            if (!el.hasAttribute('data-captune-outlined')) {
                el.style.outline = '1px solid rgba(0,255,0,0.3)';
                el.setAttribute('data-captune-outlined', 'true');
            }
        });
    }

    hideStickyElements() {
        const stickyElements = document.querySelectorAll('[style*="position: fixed"], [style*="position: sticky"]');
        stickyElements.forEach(el => {
            el.style.visibility = 'hidden';
            el.setAttribute('data-captune-hidden', 'true');
        });
    }

    cleanup() {
        // Remove developer overlay
        const overlay = document.getElementById('captune-grid-overlay');
        if (overlay) {
            overlay.remove();
        }

        // Restore hidden sticky elements
        const hiddenElements = document.querySelectorAll('[data-captune-hidden="true"]');
        hiddenElements.forEach(el => {
            el.style.visibility = '';
            el.removeAttribute('data-captune-hidden');
        });

        // Remove element outlines
        const outlinedElements = document.querySelectorAll('[data-captune-outlined="true"]');
        outlinedElements.forEach(el => {
            el.style.outline = '';
            el.removeAttribute('data-captune-outlined');
        });

        // Reset body styles
        document.body.style.width = '';
        document.body.style.minHeight = '';
        document.body.style.cursor = '';
    }

    // Utility methods
    getPageDimensions() {
        return {
            scrollWidth: Math.max(
                document.body.scrollWidth,
                document.documentElement.scrollWidth,
                document.body.offsetWidth,
                document.documentElement.offsetWidth,
                document.body.clientWidth,
                document.documentElement.clientWidth
            ),
            scrollHeight: Math.max(
                document.body.scrollHeight,
                document.documentElement.scrollHeight,
                document.body.offsetHeight,
                document.documentElement.offsetHeight,
                document.body.clientHeight,
                document.documentElement.clientHeight
            )
        };
    }

    async waitForScroll() {
        return new Promise(resolve => setTimeout(resolve, 100));
    }

    async waitForLayoutStable() {
        return new Promise(resolve => setTimeout(resolve, 300));
    }

    async loadImage(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = dataUrl;
        });
    }

    hasInfiniteScroll() {
        // Simple heuristic to detect infinite scroll
        const scrollableElements = document.querySelectorAll('[style*="overflow"]');
        return scrollableElements.length > 0 || 
               document.body.scrollHeight > window.innerHeight * 3;
    }

    async handleInfiniteScroll() {
        const maxScrolls = 20; // Prevent infinite loops
        let scrollCount = 0;
        let lastHeight = document.body.scrollHeight;

        while (scrollCount < maxScrolls) {
            // Scroll to bottom
            window.scrollTo(0, document.body.scrollHeight);
            await this.waitForContent();

            const newHeight = document.body.scrollHeight;
            if (newHeight === lastHeight) {
                break; // No more content loaded
            }

            lastHeight = newHeight;
            scrollCount++;
        }

        // Scroll back to top
        window.scrollTo(0, 0);
        await this.waitForScroll();
    }    async captureSelection(rect) {
        try {
            // Capture visible area first
            const result = await chrome.runtime.sendMessage({
                action: 'captureVisible',
                options: {
                    format: 'png',
                    quality: 100
                }
            });

            if (result.success) {
                // Crop to selection
                const croppedImage = await this.cropImage(result.data, rect);
                
                // Download the cropped image
                const settings = await chrome.storage.sync.get({
                    outputFormat: 'png'
                });
                
                chrome.runtime.sendMessage({
                    action: 'downloadImage',
                    data: croppedImage,
                    filename: `captune-selection-${Date.now()}.${settings.outputFormat}`
                });
            }
        } catch (error) {
            console.error('Failed to capture selection:', error);
        }
    }

    async captureClickedElement(element) {
        try {
            // Get element bounds with scroll offset
            const rect = element.getBoundingClientRect();
            const scrollRect = {
                left: rect.left + window.scrollX,
                top: rect.top + window.scrollY,
                width: rect.width,
                height: rect.height
            };

            // Ensure element is in viewport
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await this.waitForScroll();

            // Capture visible area
            const result = await chrome.runtime.sendMessage({
                action: 'captureVisible',
                options: {
                    format: 'png',
                    quality: 100
                }
            });

            if (result.success) {
                // Crop to element bounds
                const elementRect = element.getBoundingClientRect();
                const croppedImage = await this.cropImage(result.data, elementRect);
                
                // Download the element image
                const settings = await chrome.storage.sync.get({
                    outputFormat: 'png'
                });
                
                chrome.runtime.sendMessage({
                    action: 'downloadImage',
                    data: croppedImage,
                    filename: `captune-element-${Date.now()}.${settings.outputFormat}`
                });
            }
        } catch (error) {
            console.error('Failed to capture element:', error);
        }
    }

    async captureSpecificElement(selector, settings) {
        try {
            const element = document.querySelector(selector);
            if (!element) {
                throw new Error('Element not found: ' + selector);
            }

            // Scroll element into view
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await this.waitForScroll();

            // Get element bounds
            const rect = element.getBoundingClientRect();
            
            // Capture full page and crop to element
            const fullCapture = await this.captureFullPage(settings);
            const croppedImage = await this.cropImage(fullCapture.data, rect);

            return { success: true, data: croppedImage };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async cropImage(imageData, rect) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = await this.loadImage(imageData);

        canvas.width = rect.width;
        canvas.height = rect.height;

        ctx.drawImage(
            img,
            rect.left, rect.top, rect.width, rect.height,
            0, 0, rect.width, rect.height
        );

        return canvas.toDataURL('image/png');
    }
}

// Initialize content script
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.captuneContent = new CaptuneContent();
    });
} else {
    window.captuneContent = new CaptuneContent();
}

// Also initialize immediately if document is already complete
if (document.readyState === 'complete') {
    if (!window.captuneContent) {
        window.captuneContent = new CaptuneContent();
    }
}
