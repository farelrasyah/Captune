// Content Script for Captune Extension
class CaptuneContent {
    constructor() {
        this.isCapturing = false;
        this.selectionMode = false;
        this.elementMode = false;
        this.setupMessageListener();
        this.createOverlayElements();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // Will respond asynchronously
        });
    }

    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
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
    }

    async captureVisible(settings) {
        try {
            // Add developer overlay if requested
            if (settings.developerOverlay) {
                this.addDeveloperOverlay();
            }

            // Capture visible area using chrome API
            const dataUrl = await chrome.runtime.sendMessage({
                action: 'captureTab',
                tabId: chrome.runtime.sendMessage.tabId,
                options: {
                    format: settings.outputFormat,
                    quality: settings.jpegQuality || 90
                }
            });

            this.cleanup();
            return { success: true, data: dataUrl };
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
    }

    async performFullPageCapture(dimensions, settings) {
        const captures = [];
        const viewportHeight = window.innerHeight;
        const scrollStep = viewportHeight - 100; // Overlap for better stitching
        let currentScroll = 0;

        // Scroll through the page and capture each viewport
        while (currentScroll < dimensions.scrollHeight) {
            window.scrollTo(0, currentScroll);
            await this.waitForScroll();

            // Capture current viewport
            const dataUrl = await chrome.runtime.sendMessage({
                action: 'captureTab',
                options: {
                    format: 'png',
                    quality: 100
                }
            });

            captures.push({
                dataUrl: dataUrl,
                scrollY: currentScroll,
                viewportHeight: viewportHeight
            });

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
        // Create CSS for developer overlay
        const style = document.createElement('style');
        style.textContent = `
            .captune-dev-overlay * {
                outline: 1px solid rgba(255, 0, 0, 0.3) !important;
                position: relative !important;
            }
            .captune-dev-overlay *::before {
                content: attr(class) " | " attr(id);
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                background: rgba(0, 0, 0, 0.8) !important;
                color: white !important;
                font-size: 10px !important;
                padding: 2px 4px !important;
                z-index: 999999 !important;
                white-space: nowrap !important;
            }
        `;
        document.head.appendChild(style);
        document.body.classList.add('captune-dev-overlay');
        
        this.devOverlayStyle = style;
    }

    hideStickyElements() {
        const stickyElements = document.querySelectorAll('*');
        this.hiddenElements = [];

        stickyElements.forEach(element => {
            const style = window.getComputedStyle(element);
            if (style.position === 'fixed' || style.position === 'sticky') {
                this.hiddenElements.push({
                    element: element,
                    originalDisplay: element.style.display
                });
                element.style.display = 'none';
            }
        });
    }

    cleanup() {
        // Restore hidden sticky elements
        if (this.hiddenElements) {
            this.hiddenElements.forEach(({ element, originalDisplay }) => {
                element.style.display = originalDisplay;
            });
            this.hiddenElements = null;
        }

        // Remove developer overlay
        if (this.devOverlayStyle) {
            this.devOverlayStyle.remove();
            document.body.classList.remove('captune-dev-overlay');
            this.devOverlayStyle = null;
        }

        // End any active modes
        if (this.selectionMode) {
            this.endSelectionMode();
        }
        if (this.elementMode) {
            this.endElementMode();
        }
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

    async setViewportSize(width, height) {
        // This would require cooperation with the extension to resize the browser window
        // For now, we'll use CSS transforms to simulate different viewport sizes
        const scale = Math.min(window.innerWidth / width, window.innerHeight / height);
        document.body.style.transform = `scale(${scale})`;
        document.body.style.transformOrigin = 'top left';
        document.body.style.width = width + 'px';
        document.body.style.height = height + 'px';
    }

    async waitForScroll() {
        return new Promise(resolve => setTimeout(resolve, 100));
    }

    async waitForContent() {
        return new Promise(resolve => setTimeout(resolve, 500));
    }

    async waitForLayoutStable() {
        return new Promise(resolve => setTimeout(resolve, 1000));
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
    }

    async captureSelection(rect) {
        // Capture the selected area
        // This would involve cropping the full page capture to the selection
        console.log('Capturing selection:', rect);
        // Implementation would involve canvas manipulation
    }

    async captureClickedElement(element) {
        // Capture specific element
        const rect = element.getBoundingClientRect();
        console.log('Capturing element:', element, rect);
        // Implementation would involve element-specific capture
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
new CaptuneContent();
