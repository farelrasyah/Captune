// Captune Editor Main Script
class CaptuneEditor {
    constructor() {
        this.canvas = document.getElementById('main-canvas');
        this.overlayCanvas = document.getElementById('overlay-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.overlayCtx = this.overlayCanvas.getContext('2d');
        
        this.currentTool = 'select';
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        
        this.layers = [];
        this.selectedLayer = null;
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;
        
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        
        this.tools = {};
        this.settings = {
            strokeColor: '#ff0000',
            fillColor: '#ffffff',
            strokeWidth: 2,
            fontSize: 16,
            fontFamily: 'Arial',
            hasFill: false,
            fillOpacity: 0.5,
            blurRadius: 5
        };
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.setupTools();
        this.updateUI();
        this.loadDefaultImage();
    }

    setupCanvas() {
        // Set initial canvas size
        this.resizeCanvas(800, 600);
        
        // Setup overlay canvas
        this.overlayCanvas.style.position = 'absolute';
        this.overlayCanvas.style.top = '0';
        this.overlayCanvas.style.left = '0';
        this.overlayCanvas.style.pointerEvents = 'none';
        
        // Enable high DPI rendering
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        
        this.overlayCanvas.width = this.canvas.width;
        this.overlayCanvas.height = this.canvas.height;
        this.overlayCtx.scale(dpr, dpr);
    }

    setupEventListeners() {
        // Tool selection
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectTool(e.target.closest('.tool-btn').id.replace('tool-', ''));
            });
        });

        // Canvas events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // UI controls
        this.setupUIControls();
    }

    setupUIControls() {
        // Color controls
        document.getElementById('stroke-color').addEventListener('change', (e) => {
            this.settings.strokeColor = e.target.value;
        });

        document.getElementById('fill-color').addEventListener('change', (e) => {
            this.settings.fillColor = e.target.value;
        });

        document.getElementById('has-fill').addEventListener('change', (e) => {
            this.settings.hasFill = e.target.checked;
            document.getElementById('fill-color').disabled = !e.target.checked;
            document.getElementById('fill-opacity').disabled = !e.target.checked;
        });

        // Stroke width
        document.getElementById('stroke-width').addEventListener('input', (e) => {
            this.settings.strokeWidth = e.target.value;
            document.getElementById('stroke-width-value').textContent = e.target.value + 'px';
        });

        // Font controls
        document.getElementById('font-family').addEventListener('change', (e) => {
            this.settings.fontFamily = e.target.value;
        });

        document.getElementById('font-size').addEventListener('input', (e) => {
            this.settings.fontSize = e.target.value;
            document.getElementById('font-size-value').textContent = e.target.value + 'px';
        });

        // Blur radius
        document.getElementById('blur-radius').addEventListener('input', (e) => {
            this.settings.blurRadius = e.target.value;
            document.getElementById('blur-radius-value').textContent = e.target.value + 'px';
        });

        // Action buttons
        document.getElementById('undo-btn').addEventListener('click', () => this.undo());
        document.getElementById('redo-btn').addEventListener('click', () => this.redo());
        document.getElementById('load-image').addEventListener('click', () => this.showLoadImageModal());
        document.getElementById('save-project').addEventListener('click', () => this.saveProject());
        document.getElementById('export-image').addEventListener('click', () => this.showExportModal());

        // Zoom controls
        document.getElementById('zoom-in').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-out').addEventListener('click', () => this.zoomOut());
        document.getElementById('zoom-fit').addEventListener('click', () => this.zoomToFit());

        // Color presets
        document.querySelectorAll('.color-preset').forEach(preset => {
            preset.addEventListener('click', (e) => {
                const color = e.target.dataset.color;
                document.getElementById('stroke-color').value = color;
                this.settings.strokeColor = color;
            });
        });

        // Modal controls
        this.setupModalControls();
    }

    setupModalControls() {
        // Load image modal
        document.getElementById('browse-file').addEventListener('click', () => {
            document.getElementById('hidden-file-input').click();
        });

        document.getElementById('hidden-file-input').addEventListener('change', (e) => {
            this.loadImageFromFile(e.target.files[0]);
            this.hideModal('load-image-modal');
        });

        document.getElementById('load-from-capture').addEventListener('click', () => {
            this.captureNewScreenshot();
            this.hideModal('load-image-modal');
        });

        document.getElementById('load-from-clipboard').addEventListener('click', () => {
            this.loadFromClipboard();
            this.hideModal('load-image-modal');
        });

        // Export modal
        document.getElementById('export-download').addEventListener('click', () => this.exportImage());
        document.getElementById('export-clipboard').addEventListener('click', () => this.copyToClipboard());
        document.getElementById('export-cancel').addEventListener('click', () => this.hideModal('export-modal'));

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.hideModal(modal.id);
            });
        });

        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });
    }

    setupTools() {
        this.tools = {
            select: new SelectTool(this),
            text: new TextTool(this),
            arrow: new ArrowTool(this),
            rectangle: new RectangleTool(this),
            circle: new CircleTool(this),
            line: new LineTool(this),
            pen: new PenTool(this),
            highlight: new HighlightTool(this),
            blur: new BlurTool(this)
        };
    }

    selectTool(toolName) {
        // Deactivate current tool
        if (this.tools[this.currentTool]) {
            this.tools[this.currentTool].deactivate();
        }

        // Update UI
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`tool-${toolName}`).classList.add('active');

        // Activate new tool
        this.currentTool = toolName;
        if (this.tools[this.currentTool]) {
            this.tools[this.currentTool].activate();
        }

        // Update properties panel
        this.updatePropertiesPanel();
    }

    updatePropertiesPanel() {
        // Hide all tool-specific panels
        document.querySelectorAll('.text-properties, .blur-properties').forEach(panel => {
            panel.style.display = 'none';
        });

        // Show relevant panel for current tool
        switch (this.currentTool) {
            case 'text':
                document.querySelector('.text-properties').style.display = 'block';
                break;
            case 'blur':
                document.querySelector('.blur-properties').style.display = 'block';
                break;
        }
    }

    handleMouseDown(e) {
        const pos = CanvasUtils.getMousePosition(this.canvas, e);
        this.startX = pos.x;
        this.startY = pos.y;
        this.currentX = pos.x;
        this.currentY = pos.y;
        this.isDrawing = true;

        if (this.tools[this.currentTool]) {
            this.tools[this.currentTool].onMouseDown(pos, e);
        }
    }

    handleMouseMove(e) {
        const pos = CanvasUtils.getMousePosition(this.canvas, e);
        this.currentX = pos.x;
        this.currentY = pos.y;

        // Update mouse position display
        document.getElementById('mouse-position').textContent = `${Math.round(pos.x)}, ${Math.round(pos.y)}`;

        if (this.tools[this.currentTool]) {
            this.tools[this.currentTool].onMouseMove(pos, e);
        }
    }

    handleMouseUp(e) {
        if (!this.isDrawing) return;
        
        const pos = CanvasUtils.getMousePosition(this.canvas, e);
        this.isDrawing = false;

        if (this.tools[this.currentTool]) {
            this.tools[this.currentTool].onMouseUp(pos, e);
        }

        // Save state for undo/redo
        this.saveState();
    }

    handleWheel(e) {
        e.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.zoomAt(x, y, delta);
    }

    handleKeyDown(e) {
        // Keyboard shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'z':
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.redo();
                    } else {
                        this.undo();
                    }
                    break;
                case 'y':
                    e.preventDefault();
                    this.redo();
                    break;
                case 's':
                    e.preventDefault();
                    this.saveProject();
                    break;
                case 'o':
                    e.preventDefault();
                    this.showLoadImageModal();
                    break;
                case 'e':
                    e.preventDefault();
                    this.showExportModal();
                    break;
            }
        } else {
            // Tool shortcuts
            switch (e.key.toLowerCase()) {
                case 'v': this.selectTool('select'); break;
                case 't': this.selectTool('text'); break;
                case 'a': this.selectTool('arrow'); break;
                case 'r': this.selectTool('rectangle'); break;
                case 'c': this.selectTool('circle'); break;
                case 'l': this.selectTool('line'); break;
                case 'p': this.selectTool('pen'); break;
                case 'h': this.selectTool('highlight'); break;
                case 'b': this.selectTool('blur'); break;
                case 'Escape':
                    this.selectTool('select');
                    break;
            }
        }
    }

    // Touch event handlers
    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const pos = CanvasUtils.getTouchPosition(this.canvas, touch);
        this.handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
    }

    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
    }

    handleTouchEnd(e) {
        e.preventDefault();
        this.handleMouseUp({});
    }

    resizeCanvas(width, height) {
        // Save current state
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Resize canvas
        this.canvas.width = width;
        this.canvas.height = height;
        this.overlayCanvas.width = width;
        this.overlayCanvas.height = height;
        
        // Restore image data
        this.ctx.putImageData(imageData, 0, 0);
        
        // Update size display
        document.getElementById('canvas-size').textContent = `${width} × ${height}`;
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.clearOverlay();
    }

    clearOverlay() {
        this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    }

    saveState() {
        // Remove any states after current index
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        // Add new state
        this.history.push(CanvasUtils.saveCanvasState(this.canvas));

        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }

        this.updateUndoRedoButtons();
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            CanvasUtils.restoreCanvasState(this.canvas, this.history[this.historyIndex]);
            this.updateUndoRedoButtons();
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            CanvasUtils.restoreCanvasState(this.canvas, this.history[this.historyIndex]);
            this.updateUndoRedoButtons();
        }
    }

    updateUndoRedoButtons() {
        document.getElementById('undo-btn').disabled = this.historyIndex <= 0;
        document.getElementById('redo-btn').disabled = this.historyIndex >= this.history.length - 1;
    }

    zoomIn() {
        this.zoom = Math.min(this.zoom * 1.2, 10);
        this.updateZoom();
    }

    zoomOut() {
        this.zoom = Math.max(this.zoom / 1.2, 0.1);
        this.updateZoom();
    }

    zoomAt(x, y, delta) {
        const oldZoom = this.zoom;
        this.zoom = Math.max(0.1, Math.min(10, this.zoom * delta));
        
        if (this.zoom !== oldZoom) {
            const zoomChange = this.zoom / oldZoom;
            this.panX = x - (x - this.panX) * zoomChange;
            this.panY = y - (y - this.panY) * zoomChange;
            this.updateZoom();
        }
    }

    zoomToFit() {
        const container = document.getElementById('canvas-container');
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        const scaleX = containerWidth / this.canvas.width;
        const scaleY = containerHeight / this.canvas.height;
        
        this.zoom = Math.min(scaleX, scaleY) * 0.9; // 90% to leave some margin
        this.panX = 0;
        this.panY = 0;
        
        this.updateZoom();
    }

    updateZoom() {
        const container = document.getElementById('canvas-container');
        const transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
        
        this.canvas.style.transform = transform;
        this.overlayCanvas.style.transform = transform;
        
        document.getElementById('zoom-level').textContent = Math.round(this.zoom * 100) + '%';
    }

    async loadImageFromFile(file) {
        try {
            const img = await CanvasUtils.loadImageFromFile(file);
            this.loadImage(img);
        } catch (error) {
            this.showError('Failed to load image: ' + error.message);
        }
    }

    async loadImageFromUrl(url) {
        try {
            const img = await CanvasUtils.loadImageFromUrl(url);
            this.loadImage(img);
        } catch (error) {
            this.showError('Failed to load image: ' + error.message);
        }
    }

    loadImage(img) {
        // Resize canvas to image size
        this.resizeCanvas(img.width, img.height);
        
        // Draw image
        this.ctx.drawImage(img, 0, 0);
        
        // Fit canvas to viewport
        this.zoomToFit();
        
        // Save initial state
        this.history = [];
        this.historyIndex = -1;
        this.saveState();
    }

    loadDefaultImage() {
        // Create a default blank canvas
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.saveState();
    }

    showLoadImageModal() {
        this.showModal('load-image-modal');
    }

    showExportModal() {
        this.updateExportPreview();
        this.showModal('export-modal');
    }

    showModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
    }

    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    updateExportPreview() {
        const previewCanvas = document.getElementById('export-preview-canvas');
        const previewCtx = previewCanvas.getContext('2d');
        
        // Create small preview
        const scale = Math.min(200 / this.canvas.width, 200 / this.canvas.height);
        previewCanvas.width = this.canvas.width * scale;
        previewCanvas.height = this.canvas.height * scale;
        
        previewCtx.drawImage(this.canvas, 0, 0, previewCanvas.width, previewCanvas.height);
    }

    async exportImage() {
        const format = document.getElementById('export-format').value;
        const quality = document.getElementById('export-quality').value / 100;
        const scale = parseFloat(document.getElementById('export-scale').value);
        const filename = document.getElementById('export-filename').value;
        
        let exportCanvas = this.canvas;
        
        // Scale if needed
        if (scale !== 1) {
            exportCanvas = CanvasUtils.createCanvas(
                this.canvas.width * scale,
                this.canvas.height * scale
            );
            const exportCtx = CanvasUtils.getCanvasContext(exportCanvas);
            exportCtx.imageSmoothingEnabled = true;
            exportCtx.imageSmoothingQuality = 'high';
            exportCtx.drawImage(this.canvas, 0, 0, exportCanvas.width, exportCanvas.height);
        }
        
        // Download
        const mimeType = this.getMimeType(format);
        CanvasUtils.downloadCanvas(exportCanvas, `${filename}.${format}`, mimeType, quality);
        
        this.hideModal('export-modal');
    }

    async copyToClipboard() {
        try {
            const success = await CanvasUtils.copyCanvasToClipboard(this.canvas);
            if (success) {
                this.showSuccess('Image copied to clipboard!');
            } else {
                this.showError('Failed to copy to clipboard');
            }
        } catch (error) {
            this.showError('Clipboard not supported');
        }
        
        this.hideModal('export-modal');
    }

    getMimeType(format) {
        const mimeTypes = {
            png: 'image/png',
            jpeg: 'image/jpeg',
            webp: 'image/webp',
            svg: 'image/svg+xml'
        };
        return mimeTypes[format] || 'image/png';
    }

    saveProject() {
        const projectData = {
            version: '1.0.0',
            canvas: {
                width: this.canvas.width,
                height: this.canvas.height,
                imageData: this.canvas.toDataURL()
            },
            layers: this.layers,
            settings: this.settings,
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'captune-project.captune';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }

    async loadProject(file) {
        try {
            const text = await file.text();
            const projectData = JSON.parse(text);
            
            // Restore canvas
            this.resizeCanvas(projectData.canvas.width, projectData.canvas.height);
            const img = await CanvasUtils.loadImageFromDataUrl(projectData.canvas.imageData);
            this.ctx.drawImage(img, 0, 0);
            
            // Restore settings
            this.settings = { ...this.settings, ...projectData.settings };
            
            // Restore layers
            this.layers = projectData.layers || [];
            
            // Update UI
            this.updateUI();
            this.zoomToFit();
            this.saveState();
            
            this.showSuccess('Project loaded successfully!');
        } catch (error) {
            this.showError('Failed to load project: ' + error.message);
        }
    }

    async captureNewScreenshot() {
        try {
            // Send message to background script to capture screenshot
            const response = await chrome.runtime.sendMessage({
                action: 'captureTab'
            });
            
            if (response.success) {
                const img = await CanvasUtils.loadImageFromDataUrl(response.data);
                this.loadImage(img);
            } else {
                throw new Error(response.error || 'Capture failed');
            }
        } catch (error) {
            this.showError('Failed to capture screenshot: ' + error.message);
        }
    }

    async loadFromClipboard() {
        try {
            const clipboardItems = await navigator.clipboard.read();
            for (const item of clipboardItems) {
                if (item.types.includes('image/png')) {
                    const blob = await item.getType('image/png');
                    const url = URL.createObjectURL(blob);
                    const img = await CanvasUtils.loadImageFromUrl(url);
                    this.loadImage(img);
                    URL.revokeObjectURL(url);
                    return;
                }
            }
            throw new Error('No image found in clipboard');
        } catch (error) {
            this.showError('Failed to load from clipboard: ' + error.message);
        }
    }

    updateUI() {
        // Update color inputs
        document.getElementById('stroke-color').value = this.settings.strokeColor;
        document.getElementById('fill-color').value = this.settings.fillColor;
        document.getElementById('stroke-width').value = this.settings.strokeWidth;
        document.getElementById('font-size').value = this.settings.fontSize;
        document.getElementById('font-family').value = this.settings.fontFamily;
        
        // Update displays
        document.getElementById('stroke-width-value').textContent = this.settings.strokeWidth + 'px';
        document.getElementById('font-size-value').textContent = this.settings.fontSize + 'px';
    }

    showError(message) {
        // Simple error notification
        console.error(message);
        alert('Error: ' + message); // Replace with better notification system
    }

    showSuccess(message) {
        // Simple success notification
        console.log(message);
        // Replace with better notification system
    }
}

// Tool Classes
class Tool {
    constructor(editor) {
        this.editor = editor;
        this.active = false;
    }

    activate() {
        this.active = true;
    }

    deactivate() {
        this.active = false;
        this.editor.clearOverlay();
    }

    onMouseDown(pos, event) {}
    onMouseMove(pos, event) {}
    onMouseUp(pos, event) {}
}

class SelectTool extends Tool {
    onMouseDown(pos, event) {
        // Selection logic
    }
}

class TextTool extends Tool {
    onMouseDown(pos, event) {
        this.showTextInput(pos.x, pos.y);
    }

    showTextInput(x, y) {
        const overlay = document.getElementById('text-input-overlay');
        const input = document.getElementById('text-input');
        
        overlay.style.display = 'block';
        overlay.style.left = x + 'px';
        overlay.style.top = y + 'px';
        
        input.focus();
        
        document.getElementById('text-confirm').onclick = () => {
            this.addText(x, y, input.value);
            overlay.style.display = 'none';
            input.value = '';
        };
        
        document.getElementById('text-cancel').onclick = () => {
            overlay.style.display = 'none';
            input.value = '';
        };
    }

    addText(x, y, text) {
        const ctx = this.editor.ctx;
        ctx.save();
        
        ctx.fillStyle = this.editor.settings.strokeColor;
        ctx.font = `${this.editor.settings.fontSize}px ${this.editor.settings.fontFamily}`;
        ctx.textBaseline = 'top';
        
        const lines = text.split('\n');
        lines.forEach((line, index) => {
            ctx.fillText(line, x, y + index * this.editor.settings.fontSize * 1.2);
        });
        
        ctx.restore();
    }
}

class ArrowTool extends Tool {
    onMouseMove(pos, event) {
        if (!this.editor.isDrawing) return;
        
        const ctx = this.editor.overlayCtx;
        ctx.clearRect(0, 0, this.editor.overlayCanvas.width, this.editor.overlayCanvas.height);
        
        ctx.strokeStyle = this.editor.settings.strokeColor;
        ctx.lineWidth = this.editor.settings.strokeWidth;
        
        CanvasUtils.drawArrow(ctx, this.editor.startX, this.editor.startY, pos.x, pos.y);
    }

    onMouseUp(pos, event) {
        if (!this.editor.isDrawing) return;
        
        const ctx = this.editor.ctx;
        ctx.strokeStyle = this.editor.settings.strokeColor;
        ctx.lineWidth = this.editor.settings.strokeWidth;
        
        CanvasUtils.drawArrow(ctx, this.editor.startX, this.editor.startY, pos.x, pos.y);
        this.editor.clearOverlay();
    }
}

class RectangleTool extends Tool {
    onMouseMove(pos, event) {
        if (!this.editor.isDrawing) return;
        
        const ctx = this.editor.overlayCtx;
        ctx.clearRect(0, 0, this.editor.overlayCanvas.width, this.editor.overlayCanvas.height);
        
        const width = pos.x - this.editor.startX;
        const height = pos.y - this.editor.startY;
        
        ctx.strokeStyle = this.editor.settings.strokeColor;
        ctx.lineWidth = this.editor.settings.strokeWidth;
        
        if (this.editor.settings.hasFill) {
            ctx.fillStyle = this.editor.settings.fillColor;
            ctx.globalAlpha = this.editor.settings.fillOpacity;
            ctx.fillRect(this.editor.startX, this.editor.startY, width, height);
            ctx.globalAlpha = 1;
        }
        
        ctx.strokeRect(this.editor.startX, this.editor.startY, width, height);
    }

    onMouseUp(pos, event) {
        if (!this.editor.isDrawing) return;
        
        const ctx = this.editor.ctx;
        const width = pos.x - this.editor.startX;
        const height = pos.y - this.editor.startY;
        
        if (this.editor.settings.hasFill) {
            ctx.fillStyle = this.editor.settings.fillColor;
            ctx.globalAlpha = this.editor.settings.fillOpacity;
            ctx.fillRect(this.editor.startX, this.editor.startY, width, height);
            ctx.globalAlpha = 1;
        }
        
        ctx.strokeStyle = this.editor.settings.strokeColor;
        ctx.lineWidth = this.editor.settings.strokeWidth;
        ctx.strokeRect(this.editor.startX, this.editor.startY, width, height);
        
        this.editor.clearOverlay();
    }
}

class CircleTool extends Tool {
    onMouseMove(pos, event) {
        if (!this.editor.isDrawing) return;
        
        const ctx = this.editor.overlayCtx;
        ctx.clearRect(0, 0, this.editor.overlayCanvas.width, this.editor.overlayCanvas.height);
        
        const radius = CanvasUtils.distance(
            { x: this.editor.startX, y: this.editor.startY },
            { x: pos.x, y: pos.y }
        );
        
        ctx.strokeStyle = this.editor.settings.strokeColor;
        ctx.lineWidth = this.editor.settings.strokeWidth;
        
        ctx.beginPath();
        ctx.arc(this.editor.startX, this.editor.startY, radius, 0, Math.PI * 2);
        
        if (this.editor.settings.hasFill) {
            ctx.fillStyle = this.editor.settings.fillColor;
            ctx.globalAlpha = this.editor.settings.fillOpacity;
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        
        ctx.stroke();
    }

    onMouseUp(pos, event) {
        if (!this.editor.isDrawing) return;
        
        const ctx = this.editor.ctx;
        const radius = CanvasUtils.distance(
            { x: this.editor.startX, y: this.editor.startY },
            { x: pos.x, y: pos.y }
        );
        
        ctx.beginPath();
        ctx.arc(this.editor.startX, this.editor.startY, radius, 0, Math.PI * 2);
        
        if (this.editor.settings.hasFill) {
            ctx.fillStyle = this.editor.settings.fillColor;
            ctx.globalAlpha = this.editor.settings.fillOpacity;
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        
        ctx.strokeStyle = this.editor.settings.strokeColor;
        ctx.lineWidth = this.editor.settings.strokeWidth;
        ctx.stroke();
        
        this.editor.clearOverlay();
    }
}

class LineTool extends Tool {
    onMouseMove(pos, event) {
        if (!this.editor.isDrawing) return;
        
        const ctx = this.editor.overlayCtx;
        ctx.clearRect(0, 0, this.editor.overlayCanvas.width, this.editor.overlayCanvas.height);
        
        ctx.strokeStyle = this.editor.settings.strokeColor;
        ctx.lineWidth = this.editor.settings.strokeWidth;
        
        ctx.beginPath();
        ctx.moveTo(this.editor.startX, this.editor.startY);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    }

    onMouseUp(pos, event) {
        if (!this.editor.isDrawing) return;
        
        const ctx = this.editor.ctx;
        ctx.strokeStyle = this.editor.settings.strokeColor;
        ctx.lineWidth = this.editor.settings.strokeWidth;
        
        ctx.beginPath();
        ctx.moveTo(this.editor.startX, this.editor.startY);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        
        this.editor.clearOverlay();
    }
}

class PenTool extends Tool {
    constructor(editor) {
        super(editor);
        this.path = [];
    }

    onMouseDown(pos, event) {
        this.path = [pos];
    }

    onMouseMove(pos, event) {
        if (!this.editor.isDrawing) return;
        
        this.path.push(pos);
        
        const ctx = this.editor.overlayCtx;
        ctx.clearRect(0, 0, this.editor.overlayCanvas.width, this.editor.overlayCanvas.height);
        
        ctx.strokeStyle = this.editor.settings.strokeColor;
        ctx.lineWidth = this.editor.settings.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(this.path[0].x, this.path[0].y);
        
        for (let i = 1; i < this.path.length; i++) {
            ctx.lineTo(this.path[i].x, this.path[i].y);
        }
        
        ctx.stroke();
    }

    onMouseUp(pos, event) {
        if (!this.editor.isDrawing || this.path.length === 0) return;
        
        const ctx = this.editor.ctx;
        ctx.strokeStyle = this.editor.settings.strokeColor;
        ctx.lineWidth = this.editor.settings.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(this.path[0].x, this.path[0].y);
        
        for (let i = 1; i < this.path.length; i++) {
            ctx.lineTo(this.path[i].x, this.path[i].y);
        }
        
        ctx.stroke();
        
        this.editor.clearOverlay();
        this.path = [];
    }
}

class HighlightTool extends PenTool {
    onMouseMove(pos, event) {
        if (!this.editor.isDrawing) return;
        
        this.path.push(pos);
        
        const ctx = this.editor.overlayCtx;
        ctx.clearRect(0, 0, this.editor.overlayCanvas.width, this.editor.overlayCanvas.height);
        
        ctx.strokeStyle = this.editor.settings.strokeColor;
        ctx.lineWidth = this.editor.settings.strokeWidth * 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.3;
        
        ctx.beginPath();
        ctx.moveTo(this.path[0].x, this.path[0].y);
        
        for (let i = 1; i < this.path.length; i++) {
            ctx.lineTo(this.path[i].x, this.path[i].y);
        }
        
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    onMouseUp(pos, event) {
        if (!this.editor.isDrawing || this.path.length === 0) return;
        
        const ctx = this.editor.ctx;
        ctx.strokeStyle = this.editor.settings.strokeColor;
        ctx.lineWidth = this.editor.settings.strokeWidth * 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.3;
        
        ctx.beginPath();
        ctx.moveTo(this.path[0].x, this.path[0].y);
        
        for (let i = 1; i < this.path.length; i++) {
            ctx.lineTo(this.path[i].x, this.path[i].y);
        }
        
        ctx.stroke();
        ctx.globalAlpha = 1;
        
        this.editor.clearOverlay();
        this.path = [];
    }
}

class BlurTool extends Tool {
    onMouseDown(pos, event) {
        const radius = this.editor.settings.blurRadius;
        const size = radius * 4;
        
        // Get image data from the area to blur
        const imageData = this.editor.ctx.getImageData(
            pos.x - size/2, 
            pos.y - size/2, 
            size, 
            size
        );
        
        // Apply blur filter
        CanvasUtils.applyFilter(
            { getContext: () => ({ getImageData: () => imageData, putImageData: () => {} }) },
            { type: 'blur', radius: radius }
        );
        
        // Put blurred data back
        this.editor.ctx.putImageData(imageData, pos.x - size/2, pos.y - size/2);
    }
}

// Initialize editor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CaptuneEditor();
});
