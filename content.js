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
    }    async captureFullPage(settings) {
        try {
            this.isCapturing = true;
            console.log('Starting COMPLETE full page capture with settings:', settings);
            
            // Force cleanup any existing overlays first
            this.cleanup();
            
            // Auto-expand dynamic content first if requested
            if (settings.autoExpand) {
                console.log('Expanding dynamic content...');
                try {
                    await this.expandDynamicContent();
                } catch (expandError) {
                    console.warn('Dynamic content expansion failed, continuing...', expandError);
                }
            }
            
            // Get final page dimensions after expansion
            var dimensions = this.getPageDimensions();
            console.log('Final page dimensions after expansion:', dimensions);
            
            // Handle sticky elements (hide them to avoid duplication)
            if (!settings.includeSticky) {
                this.hideStickyElements();
            }            // Try simple method first for small pages with retry
            if (dimensions.scrollHeight <= window.innerHeight * 2) {
                console.log('Page is relatively small, attempting simple capture...');
                
                // Try simple capture with retries
                for (let attempt = 1; attempt <= 3; attempt++) {
                    try {
                        console.log(`Simple capture attempt ${attempt}/3`);
                        
                        // Wait longer on retry attempts
                        if (attempt > 1) {
                            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                        }
                        
                        var simpleResult = await this.captureFullPageSimple(settings);
                        
                        if (simpleResult.success) {
                            console.log(`Simple capture successful on attempt ${attempt}`);
                            this.cleanup();
                            return simpleResult;
                        }
                    } catch (simpleError) {
                        console.warn(`Simple capture attempt ${attempt} failed:`, simpleError);
                        if (attempt === 3) {
                            console.log('All simple capture attempts failed, falling back to stitching');
                        }
                    }
                }
            }
              console.log('Using viewport stitching for complete page capture...');

            // Perform complete full page capture using viewport stitching with retry
            for (let stitchAttempt = 1; stitchAttempt <= 3; stitchAttempt++) {
                try {
                    console.log(`Stitching attempt ${stitchAttempt}/3`);
                    
                    // Wait before retry attempts  
                    if (stitchAttempt > 1) {
                        await new Promise(resolve => setTimeout(resolve, 2000 * stitchAttempt));
                        console.log('Page stabilization wait completed');
                    }
                    
                    var imageData = await this.performFullPageCapture(dimensions, settings);

                    // Cleanup before returning
                    this.cleanup();
                    
                    console.log(`COMPLETE full page capture finished successfully on attempt ${stitchAttempt}`);
                    return { success: true, data: imageData };
                    
                } catch (stitchError) {
                    console.error(`Stitching attempt ${stitchAttempt} failed:`, stitchError);
                    
                    if (stitchAttempt === 3) {
                        console.log('All stitching attempts failed, trying final fallback...');
                        
                        // Try fallback simple capture without size restriction
                        try {
                            console.log('Attempting final fallback simple capture...');
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            var fallbackResult = await this.captureFullPageSimple(settings);
                            this.cleanup();
                            return fallbackResult;
                        } catch (fallbackError) {
                            console.error('Final fallback failed:', fallbackError);
                            throw new Error('All capture methods failed after multiple attempts');
                        }
                    }
                }
            }
            
        } catch (error) {
            console.error('Complete full page capture failed:', error);
            this.cleanup();
            return { 
                success: false, 
                error: `Capture failed: ${error.message} 🔧 Troubleshooting: • Refresh the page and try again • Check if page allows screenshots • Try with different settings • Some dynamic pages require manual scrolling first`
            };
        } finally {
            this.isCapturing = false;
        }
    }async captureVisible(settings) {
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
        console.log('Starting ULTRA COMPLETE full page capture with dimensions:', dimensions);
          // Test background script communication first
        try {
            const pingResult = await this.reliableBackgroundMessage({ action: 'ping' });
            if (!pingResult || !pingResult.success) {
                throw new Error('Background script not responding');
            }
            console.log('✓ Background script communication test passed');
        } catch (pingError) {
            throw new Error(`Cannot communicate with background script: ${pingError.message}`);
        }
          // Store original scroll position
        var originalScrollX = window.scrollX;
        var originalScrollY = window.scrollY;
        
        // Wait for page to be stable before starting
        await this.waitForPageStability();
        
        // Force scroll to absolute top first
        window.scrollTo(0, 0);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Get viewport dimensions
        var viewportHeight = window.innerHeight;
        var viewportWidth = window.innerWidth;
        var totalHeight = dimensions.scrollHeight;
        
        console.log('Ultra complete capture parameters:', {
            totalHeight: totalHeight,
            viewportHeight: viewportHeight,
            capturesNeeded: Math.ceil(totalHeight / viewportHeight),
            startFromTop: true
        });
          // If page is very short, just capture visible area
        if (totalHeight <= viewportHeight + 50) {
            console.log('Page fits in single viewport, capturing directly');
            window.scrollTo(0, 0); // Ensure we're at top
            await new Promise(resolve => setTimeout(resolve, 200));
            
            var result;
            try {
                result = await chrome.runtime.sendMessage({
                    action: 'captureVisible',
                    options: { format: 'png', quality: 100 }
                });
            } catch (captureError) {
                throw new Error(`Failed to capture single viewport: ${captureError.message}`);
            }
            
            if (result && result.success) {
                window.scrollTo(originalScrollX, originalScrollY);
                return result.data;
            } else {
                throw new Error(`Failed to capture short page: ${result?.error || 'Unknown error'}`);
            }
        }
        
        var captures = [];
        var currentY = 0;
        var captureIndex = 0;
        
        // Disable smooth scrolling for precise positioning
        var originalScrollBehavior = document.documentElement.style.scrollBehavior;
        document.documentElement.style.scrollBehavior = 'auto';
        
        try {
            // START FROM ABSOLUTE TOP - capture every single pixel
            while (currentY < totalHeight) {
                captureIndex++;
                console.log(`CAPTURE ${captureIndex}: Position Y=${currentY}, Target height=${Math.min(viewportHeight, totalHeight - currentY)}px`);
                
                // Scroll to exact position with retries for precision
                var scrollAttempts = 0;
                var targetReached = false;
                
                while (!targetReached && scrollAttempts < 3) {
                    window.scrollTo(0, currentY);
                    await new Promise(resolve => setTimeout(resolve, 400));
                    
                    var actualScrollY = window.scrollY;
                    var maxPossibleScroll = Math.max(0, totalHeight - viewportHeight);
                    
                    // Check if we reached the desired position or the maximum possible
                    if (Math.abs(actualScrollY - currentY) <= 5 || 
                        (currentY > maxPossibleScroll && actualScrollY >= maxPossibleScroll - 5)) {
                        targetReached = true;
                    }
                    
                    scrollAttempts++;
                    if (!targetReached && scrollAttempts < 3) {
                        console.log(`Scroll attempt ${scrollAttempts} failed, retrying...`);
                    }
                }
                
                var finalScrollY = window.scrollY;
                console.log(`Final scroll position: ${finalScrollY} (target: ${currentY})`);
                  // Calculate how much content this capture will cover
                var remainingHeight = totalHeight - finalScrollY;
                var captureHeight = Math.min(viewportHeight, remainingHeight);
                
                // Capture current viewport with retry mechanism
                var result = null;
                var captureSuccess = false;
                
                for (let captureAttempt = 1; captureAttempt <= 3; captureAttempt++) {
                    try {
                        console.log(`Capturing viewport attempt ${captureAttempt}/3 at position ${finalScrollY}`);
                          // Wait before retry attempts to let page stabilize
                        if (captureAttempt > 1) {
                            await new Promise(resolve => setTimeout(resolve, 500 * captureAttempt));
                        }
                        
                        result = await this.reliableBackgroundMessage({
                            action: 'captureVisible',
                            options: { format: 'png', quality: 100 }
                        });
                        
                        if (result && result.success) {
                            captureSuccess = true;
                            break;
                        } else {
                            console.warn(`Capture attempt ${captureAttempt} failed: ${result?.error || 'Unknown error'}`);
                        }
                        
                    } catch (captureError) {
                        console.error(`Capture attempt ${captureAttempt} failed:`, captureError);
                        if (captureAttempt === 3) {
                            throw new Error(`Failed to capture viewport after 3 attempts: ${captureError.message}`);
                        }
                    }
                }
                
                if (!captureSuccess || !result) {
                    throw new Error('Failed to capture viewport after multiple attempts');
                }
                  captures.push({
                    dataUrl: result.data,
                    scrollY: finalScrollY,
                    captureHeight: captureHeight,
                    targetY: currentY,
                    index: captureIndex,
                    coverageStart: finalScrollY,
                    coverageEnd: finalScrollY + captureHeight
                });
                
                console.log(`✓ CAPTURED section ${captureIndex}: Y=${finalScrollY}, height=${captureHeight}, covers ${finalScrollY} to ${finalScrollY + captureHeight}`);
                
                // Determine if we've covered the entire page
                if (finalScrollY + viewportHeight >= totalHeight - 10) {
                    console.log('✓ REACHED BOTTOM - Page completely captured!');
                    break;
                }
                
                // Calculate next position - ensure NO gaps in coverage
                // Move exactly by viewport height, but account for any scroll position differences
                var nextY = Math.min(finalScrollY + viewportHeight, totalHeight);
                
                // If we can't scroll further down, we're done
                if (nextY <= currentY) {
                    console.log('Cannot scroll further - capture complete');
                    break;
                }
                
                currentY = nextY;
                
                // Safety check to prevent infinite loop
                if (captureIndex > 200) {
                    console.warn('Too many captures (200+), stopping for safety');
                    break;
                }
            }
            
        } finally {
            // Restore original scroll position and behavior
            document.documentElement.style.scrollBehavior = originalScrollBehavior;
            window.scrollTo(originalScrollX, originalScrollY);
        }
        
        console.log(`✓ ULTRA COMPLETE CAPTURE: ${captures.length} sections covering full ${totalHeight}px height`);
        
        if (captures.length === 0) {
            throw new Error('No captures were taken');
        }
        
        if (captures.length === 1) {
            console.log('Single capture covers entire page');
            return captures[0].dataUrl;
        }
        
        // Stitch with perfect precision - every pixel from top to bottom
        return await this.stitchImagesUltraComplete(captures, totalHeight, viewportWidth, settings);
    }    async stitchImagesUltraComplete(captures, totalHeight, viewportWidth, settings) {
        console.log('✓ ULTRA COMPLETE STITCHING - Perfect pixel-by-pixel reconstruction');
        console.log('Stitching data:', {
            sections: captures.length,
            totalHeight: totalHeight,
            viewportWidth: viewportWidth
        });
        
        try {
            // Create canvas with exact dimensions
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            
            // Check if canvas creation succeeded
            if (!canvas || !ctx) {
                throw new Error('Failed to create canvas or get context');
            }
            
            // Set canvas dimensions to exact page size with proper scaling
            var scale = settings.retinaQuality ? (window.devicePixelRatio || 1) : 1;
            var canvasWidth = viewportWidth * scale;
            var canvasHeight = totalHeight * scale;
            
            // Check for reasonable canvas size to avoid memory issues
            var maxCanvasSize = 32767; // Maximum canvas dimension in most browsers
            if (canvasWidth > maxCanvasSize || canvasHeight > maxCanvasSize) {
                console.warn('Canvas size too large, reducing scale');
                scale = Math.min(maxCanvasSize / viewportWidth, maxCanvasSize / totalHeight, 1);
                canvasWidth = viewportWidth * scale;
                canvasHeight = totalHeight * scale;
            }
            
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            
            console.log('Ultra complete canvas setup:', {
                canvasWidth: canvas.width,
                canvasHeight: canvas.height,
                scale: scale,
                devicePixelRatio: window.devicePixelRatio
            });
            
            // Fill with perfect white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Validate coverage before stitching
            var expectedCoverage = [];
            var currentPos = 0;
            for (var i = 0; i < captures.length; i++) {
                var capture = captures[i];
                expectedCoverage.push({
                    index: i + 1,
                    start: currentPos,
                    end: currentPos + capture.captureHeight,
                    actualScrollY: capture.scrollY
                });
                currentPos += capture.captureHeight;
            }
            
            console.log('Coverage validation:', expectedCoverage);
            
            // Process each capture with perfect positioning
            for (var i = 0; i < captures.length; i++) {
                var capture = captures[i];
                console.log(`Processing section ${i + 1}/${captures.length}: scroll=${capture.scrollY}, target=${capture.targetY}`);
                
                try {
                    var img = await this.loadImage(capture.dataUrl);
                    
                    // Verify image loaded successfully
                    if (!img || !img.width || !img.height) {
                        throw new Error('Invalid image data');
                    }
                    
                    // Calculate exact destination position on canvas
                    var destY = capture.scrollY * scale;
                    var destHeight = capture.captureHeight * scale;
                    
                    // Ensure perfect bounds
                    if (destY + destHeight > canvas.height) {
                        destHeight = canvas.height - destY;
                        console.log(`Adjusted height for section ${i + 1} to fit canvas: ${destHeight / scale}px`);
                    }
                    
                    // Perfect pixel placement - no gaps, no overlaps
                    ctx.drawImage(
                        img, // source image
                        0, 0, img.width, img.height, // source rectangle (full image)
                        0, destY, canvas.width, destHeight // destination rectangle
                    );
                    
                    console.log(`✓ Placed section ${i + 1}: Y=${destY / scale} to ${(destY + destHeight) / scale}, height=${destHeight / scale}px`);
                    
                } catch (error) {
                    console.error(`Error processing section ${i + 1}:`, error);
                    throw new Error(`Failed to process capture section ${i + 1}: ${error.message}`);
                }
            }
            
            // Final verification
            var lastCapture = captures[captures.length - 1];
            var actualCoverageEnd = lastCapture.scrollY + lastCapture.captureHeight;
            var coveragePercent = (actualCoverageEnd / totalHeight) * 100;
            
            console.log('✓ ULTRA COMPLETE STITCH VERIFICATION:', {
                totalPageHeight: totalHeight,
                actualCoverageEnd: actualCoverageEnd,
                coveragePercent: coveragePercent.toFixed(1) + '%',
                isComplete: coveragePercent >= 99
            });
            
            // Convert to final output format
            var format = settings.outputFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
            var quality = settings.outputFormat === 'jpeg' ? 0.95 : 1.0;
            
            console.log('✓ ULTRA COMPLETE PAGE CAPTURE FINISHED - Converting to', format);
            
            try {
                return canvas.toDataURL(format, quality);
            } catch (toDataURLError) {
                console.error('Failed to convert canvas to data URL:', toDataURLError);
                // Try with PNG as fallback
                return canvas.toDataURL('image/png', 1.0);
            }
              } catch (error) {
            console.error('Stitching failed:', error);
            throw new Error(`Image stitching failed: ${error.message}`);
        }
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
    }    cleanup() {
        console.log('Cleaning up overlays and styles...');
        
        // Remove developer overlay
        const overlay = document.getElementById('captune-grid-overlay');
        if (overlay) {
            overlay.remove();
            console.log('Removed grid overlay');
        }

        // Remove all captune-added overlays
        const captuneOverlays = document.querySelectorAll('[id*="captune"], [class*="captune"]');
        captuneOverlays.forEach(el => {
            if (el !== this.selectionOverlay && el !== this.selectionBox && el !== this.elementHighlight) {
                el.remove();
            }
        });

        // Restore hidden sticky elements
        const hiddenElements = document.querySelectorAll('[data-captune-hidden="true"]');
        hiddenElements.forEach(el => {
            el.style.visibility = '';
            el.removeAttribute('data-captune-hidden');
        });
        console.log(`Restored ${hiddenElements.length} hidden elements`);

        // Remove element outlines
        const outlinedElements = document.querySelectorAll('[data-captune-outlined="true"]');
        outlinedElements.forEach(el => {
            el.style.outline = '';
            el.style.border = '';
            el.style.boxShadow = '';
            el.removeAttribute('data-captune-outlined');
        });
        console.log(`Removed outlines from ${outlinedElements.length} elements`);

        // Hide selection and element highlight overlays
        if (this.selectionOverlay) {
            this.selectionOverlay.style.display = 'none';
        }
        if (this.elementHighlight) {
            this.elementHighlight.style.display = 'none';
        }

        // Reset body styles
        document.body.style.width = '';
        document.body.style.minHeight = '';
        document.body.style.cursor = '';

        // Reset document scroll behavior
        document.documentElement.style.scrollBehavior = '';        // Force layout recalculation
        document.body.offsetHeight;
        
        console.log('Cleanup completed');
    }

    // Utility methods
    getPageDimensions() {
        // Get the maximum dimensions of the page content
        var body = document.body;
        var html = document.documentElement;
        
        // Calculate true page dimensions including all scrollable content
        var scrollWidth = Math.max(
            body.scrollWidth,
            body.offsetWidth,
            html.clientWidth,
            html.scrollWidth,
            html.offsetWidth
        );
        
        var scrollHeight = Math.max(
            body.scrollHeight,
            body.offsetHeight,
            html.clientHeight,
            html.scrollHeight,
            html.offsetHeight
        );
        
        // Check all visible elements to find the actual bottom-most position
        var allElements = document.querySelectorAll('*');
        var maxBottom = scrollHeight;
        var maxRight = scrollWidth;
        
        // Store original scroll position
        var originalScrollY = window.scrollY;
        
        // Temporarily scroll to bottom to ensure all elements are measured correctly
        window.scrollTo(0, document.body.scrollHeight);
        
        for (var i = 0; i < allElements.length; i++) {
            var el = allElements[i];
            if (el.offsetParent === null && el.style.display === 'none') continue; // Skip hidden elements
            
            var rect = el.getBoundingClientRect();
            var computedStyle = window.getComputedStyle(el);
            
            // Skip elements that are positioned out of normal flow but not actually visible
            if (computedStyle.position === 'fixed' || computedStyle.position === 'sticky') {
                continue;
            }
            
            var elementBottom = rect.bottom + window.scrollY;
            var elementRight = rect.right + window.scrollX;
            
            // Only count elements that have actual content or visible area
            if (rect.height > 0 && rect.width > 0) {
                if (elementBottom > maxBottom) maxBottom = elementBottom;
                if (elementRight > maxRight) maxRight = elementRight;
            }
        }
        
        // Restore original scroll position
        window.scrollTo(0, originalScrollY);
        
        // Add some padding to ensure we capture everything
        var finalHeight = Math.max(scrollHeight, maxBottom) + 20;
        var finalWidth = Math.max(scrollWidth, maxRight);
        
        // Final validation - ensure minimum dimensions
        finalHeight = Math.max(finalHeight, window.innerHeight);
        finalWidth = Math.max(finalWidth, window.innerWidth);
        
        console.log('Complete page dimensions calculated:', {
            bodyScrollHeight: body.scrollHeight,
            htmlScrollHeight: html.scrollHeight,
            maxElementBottom: maxBottom,
            finalHeight: finalHeight,
            finalWidth: finalWidth,
            addedPadding: 20
        });
        
        return {
            scrollWidth: finalWidth,
            scrollHeight: finalHeight
        };
    }

    async waitForScroll() {
        return new Promise(resolve => setTimeout(resolve, 200));
    }

    async waitForLayoutStable() {
        return new Promise(resolve => setTimeout(resolve, 300));
    }

    async waitForImagesLoad() {
        // Wait for lazy-loaded images to finish loading
        const images = document.querySelectorAll('img');
        const promises = Array.from(images).map(img => {
            if (img.complete) return Promise.resolve();
            
            return new Promise(resolve => {
                const timeout = setTimeout(resolve, 1000); // Max 1 second wait per image
                img.onload = () => {
                    clearTimeout(timeout);
                    resolve();
                };
                img.onerror = () => {
                    clearTimeout(timeout);
                    resolve();
                };
            });
        });
        
        await Promise.all(promises);
        // Additional wait for layout
        return new Promise(resolve => setTimeout(resolve, 100));
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
            // Hide overlay elements to ensure clean capture
            const overlayDisplay = this.selectionOverlay.style.display;
            const boxDisplay = this.selectionBox.style.display;
            
            this.selectionOverlay.style.display = 'none';
            this.selectionBox.style.display = 'none';
            
            // Wait a moment for the UI to update
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Capture visible area
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
            
            // Restore overlay visibility (though selection mode will end anyway)
            this.selectionOverlay.style.display = overlayDisplay;
            this.selectionBox.style.display = boxDisplay;
            
        } catch (error) {
            console.error('Failed to capture selection:', error);
            // Restore overlay visibility in case of error
            this.selectionOverlay.style.display = 'block';
            this.selectionBox.style.display = 'block';
        }
    }    async captureClickedElement(element) {
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

            // Hide any overlay elements that might interfere
            const overlayDisplay = this.elementHighlight.style.display;
            this.elementHighlight.style.display = 'none';
            
            // Wait a moment for the UI to update
            await new Promise(resolve => setTimeout(resolve, 50));

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
                    action: 'downloadImage',                    data: croppedImage,
                    filename: `captune-element-${Date.now()}.${settings.outputFormat}`
                });
            }
            
            // Restore highlight visibility
            this.elementHighlight.style.display = overlayDisplay;
            
        } catch (error) {
            console.error('Failed to capture element:', error);
            // Restore highlight visibility in case of error
            this.elementHighlight.style.display = 'none';
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
    }    async cropImage(imageData, rect) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = await this.loadImage(imageData);

        // Set canvas size to match the selection
        canvas.width = Math.round(rect.width);
        canvas.height = Math.round(rect.height);

        // Enable high-quality image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Clear canvas to ensure clean background
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the cropped portion of the image
        ctx.drawImage(
            img,
            Math.round(rect.left), Math.round(rect.top), Math.round(rect.width), Math.round(rect.height),
            0, 0, Math.round(rect.width), Math.round(rect.height)
        );

        // Return high-quality PNG
        return canvas.toDataURL('image/png', 1.0);
    }    async captureFullPageSimple(settings) {
        console.log('Using simple full page capture method');
        
        try {
            // Test background script communication first
            try {
                const pingResult = await chrome.runtime.sendMessage({ action: 'ping' });
                if (!pingResult || !pingResult.success) {
                    throw new Error('Background script not responding');
                }
            } catch (pingError) {
                throw new Error(`Cannot communicate with background script: ${pingError.message}`);
            }
            
            // Get page dimensions
            const body = document.body;
            const html = document.documentElement;
            
            const totalHeight = Math.max(
                body.scrollHeight, body.offsetHeight,
                html.clientHeight, html.scrollHeight, html.offsetHeight
            );
            const totalWidth = Math.max(
                body.scrollWidth, body.offsetWidth,
                html.clientWidth, html.scrollWidth, html.offsetWidth
            );
            
            console.log('Page dimensions:', { width: totalWidth, height: totalHeight });
              // Store original values
            const originalX = window.scrollX;
            const originalY = window.scrollY;
            const originalOverflow = document.documentElement.style.overflow;
            
            // Wait for page stability
            await this.waitForPageStability(2000);
            
            // Scroll to top
            window.scrollTo(0, 0);
            
            // Set body to show full content
            document.documentElement.style.overflow = 'visible';
            
            // Wait for layout
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Take screenshot
            const result = await chrome.runtime.sendMessage({
                action: 'captureVisible',
                options: { format: 'png', quality: 100 }
            });
            
            // Restore original state
            document.documentElement.style.overflow = originalOverflow;
            window.scrollTo(originalX, originalY);
            
            if (result && result.success) {
                return { success: true, data: result.data };
            } else {
                throw new Error(`Simple capture failed: ${result?.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Simple capture error:', error);
            return { success: false, error: error.message };
        }
    }async expandDynamicContent() {
        console.log('🔄 AGGRESSIVE dynamic content expansion for COMPLETE capture...');
        
        // Store original scroll position
        var originalScrollY = window.scrollY;
        var lastHeight = 0;
        var currentHeight = this.getPageDimensions().scrollHeight;
        var attempts = 0;
        var maxAttempts = 15; // More attempts for thorough expansion
        var expandedSomething = false;
        
        while (currentHeight > lastHeight && attempts < maxAttempts) {
            lastHeight = currentHeight;
            attempts++;
            
            console.log(`Expansion attempt ${attempts}: height ${lastHeight} -> checking for more content...`);
            
            // Scroll to absolute bottom first
            window.scrollTo(0, document.body.scrollHeight);
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Look for and click load more buttons with expanded selectors
            var loadMoreSelectors = [
                // Common load more patterns
                'button[contains(text(), "Load more")]',
                'button[contains(text(), "Show more")]',
                'button[contains(text(), "See more")]',
                'button[contains(text(), "View more")]',
                'a[contains(text(), "Load more")]',
                'a[contains(text(), "Show more")]',
                
                // Data attributes and classes
                '[data-testid*="load-more"]',
                '[data-testid*="show-more"]',
                '[class*="load-more"]',
                '[class*="show-more"]',
                '[class*="load_more"]',
                '[class*="show_more"]',
                
                // Pagination and infinite scroll
                '.pagination-next',
                '.load-next',
                '.infinite-scroll-trigger',
                '[aria-label*="Load more"]',
                '[aria-label*="Show more"]',
                
                // Social media specific
                '[data-testid="tweet-show-this-thread"]', // Twitter
                'button[data-ms*="show-more"]', // LinkedIn
                '[role="button"][aria-label*="more"]',
                
                // Generic patterns
                'button[type="button"]:contains("more")',
                'div[role="button"]:contains("more")',
                'span[role="button"]:contains("more")'
            ];
            
            var foundButton = false;
            for (var selector of loadMoreSelectors) {
                try {
                    var buttons = document.querySelectorAll(selector);
                    for (var i = 0; i < buttons.length; i++) {
                        var btn = buttons[i];
                        // Check if button is visible and clickable
                        if (btn.offsetParent !== null && 
                            !btn.disabled && 
                            btn.style.display !== 'none') {
                            
                            console.log('🔘 Clicking expansion button:', selector, btn.textContent.trim());
                            
                            // Scroll button into view first
                            btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            await new Promise(resolve => setTimeout(resolve, 500));
                            
                            // Click the button
                            btn.click();
                            foundButton = true;
                            expandedSomething = true;
                            
                            // Wait longer for content to load
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            break;
                        }
                    }
                    if (foundButton) break;
                } catch (e) {
                    // Ignore selector errors
                    continue;
                }
            }
            
            // Aggressive scroll down to trigger lazy loading
            var scrollSteps = 5;
            var scrollHeight = document.body.scrollHeight;
            for (var step = 1; step <= scrollSteps; step++) {
                var scrollTo = (scrollHeight / scrollSteps) * step;
                window.scrollTo(0, scrollTo);
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            // Final scroll to absolute bottom
            window.scrollTo(0, document.body.scrollHeight);
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Trigger scroll events to activate infinite scroll
            window.dispatchEvent(new Event('scroll'));
            window.dispatchEvent(new Event('resize'));
            
            // Check for height changes
            var newHeight = this.getPageDimensions().scrollHeight;
            if (newHeight > currentHeight) {
                console.log(`✓ Page expanded: ${currentHeight} -> ${newHeight} (+${newHeight - currentHeight}px)`);
                currentHeight = newHeight;
                expandedSomething = true;
            } else {
                console.log(`No height change detected on attempt ${attempts}`);
                // If no expansion for 3 consecutive attempts, try a few more aggressive methods
                if (attempts - lastHeight > 3) {
                    // Try triggering page end events
                    var endEvents = ['scroll', 'scrollend', 'wheel', 'touchmove'];
                    for (var event of endEvents) {
                        window.dispatchEvent(new Event(event, { bubbles: true }));
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // Check height one more time
                    currentHeight = this.getPageDimensions().scrollHeight;
                    if (currentHeight > lastHeight) {
                        console.log(`✓ Event-triggered expansion: ${lastHeight} -> ${currentHeight}`);
                        lastHeight = currentHeight - 1; // Continue loop
                    }
                }
            }
        }
        
        // Return to original position
        window.scrollTo(0, originalScrollY);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        var finalHeight = this.getPageDimensions().scrollHeight;
        console.log(`🏁 Dynamic content expansion complete:`, {
            originalHeight: originalScrollY,
            finalHeight: finalHeight,
            attempts: attempts,
            expandedContent: expandedSomething,
            heightIncrease: finalHeight - originalScrollY
        });
        
        return finalHeight;
    }

    // Utility method to wait for page to be stable
    async waitForPageStability(timeout = 3000) {
        console.log('Waiting for page stability...');
        
        const startTime = Date.now();
        let lastHeight = document.body.scrollHeight;
        let lastWidth = document.body.scrollWidth;
        let stableCount = 0;
        
        while (Date.now() - startTime < timeout) {
            await new Promise(resolve => setTimeout(resolve, 300));
            
            const currentHeight = document.body.scrollHeight;
            const currentWidth = document.body.scrollWidth;
            
            if (currentHeight === lastHeight && currentWidth === lastWidth) {
                stableCount++;
                if (stableCount >= 3) { // 3 consecutive stable checks
                    console.log('Page is stable, proceeding with capture');
                    return true;
                }
            } else {
                stableCount = 0;
                lastHeight = currentHeight;
                lastWidth = currentWidth;
                console.log('Page dimensions changed, waiting for stability...');
            }
        }
        
        console.log('Page stability timeout reached, proceeding anyway');
        return false;
    }

    async waitForContent(timeout = 5000) {
        const startTime = Date.now();
        let lastHeight = document.body.scrollHeight;
        
        while (Date.now() - startTime < timeout) {
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Check if new content has loaded
            let currentHeight = document.body.scrollHeight;
            if (currentHeight > lastHeight) {
                console.log('New content detected, waiting for more to load...');
                lastHeight = currentHeight;
            } else {
                // If no new content for a while, assume loading is complete
                let stable = await this.waitForPageStability(1000);
                if (stable) {
                    console.log('Content loading appears to be stable now');
                    return true;
                }
            }
        }
        
        console.warn('Content loading wait timed out');
        return false;
    }

    // Utility method for reliable background script communication
    async reliableBackgroundMessage(message, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Background message attempt ${attempt}/${maxRetries}`);
                
                const result = await chrome.runtime.sendMessage(message);
                
                if (result) {
                    return result;
                }
                
                console.warn(`Attempt ${attempt}: Empty response from background script`);
                
            } catch (error) {
                console.error(`Attempt ${attempt} failed:`, error);
                
                if (attempt === maxRetries) {
                    throw new Error(`Background communication failed after ${maxRetries} attempts: ${error.message}`);
                }
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
        
        throw new Error('Background communication failed: No valid response received');
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
