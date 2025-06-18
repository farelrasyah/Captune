// Canvas Utilities for Captune Editor
class CanvasUtils {
    static createCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }

    static getCanvasContext(canvas, type = '2d') {
        return canvas.getContext(type);
    }

    static loadImageFromFile(file) {
        return new Promise((resolve, reject) => {
            if (!file.type.startsWith('image/')) {
                reject(new Error('File is not an image'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }

    static loadImageFromUrl(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image from URL'));
            img.crossOrigin = 'anonymous';
            img.src = url;
        });
    }

    static loadImageFromDataUrl(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image from data URL'));
            img.src = dataUrl;
        });
    }

    static canvasToBlob(canvas, format = 'image/png', quality = 0.9) {
        return new Promise((resolve) => {
            canvas.toBlob(resolve, format, quality);
        });
    }

    static downloadCanvas(canvas, filename, format = 'image/png', quality = 0.9) {
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = filename;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
        }, format, quality);
    }

    static async copyCanvasToClipboard(canvas) {
        try {
            const blob = await this.canvasToBlob(canvas, 'image/png');
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            return true;
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            return false;
        }
    }

    static getMousePosition(canvas, event) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        return {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY
        };
    }

    static getTouchPosition(canvas, touch) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        return {
            x: (touch.clientX - rect.left) * scaleX,
            y: (touch.clientY - rect.top) * scaleY
        };
    }

    static distance(point1, point2) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    static angle(point1, point2) {
        return Math.atan2(point2.y - point1.y, point2.x - point1.x);
    }

    static rotatePoint(point, center, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const dx = point.x - center.x;
        const dy = point.y - center.y;
        
        return {
            x: center.x + dx * cos - dy * sin,
            y: center.y + dx * sin + dy * cos
        };
    }

    static getBoundingBox(points) {
        if (points.length === 0) return null;
        
        let minX = points[0].x;
        let minY = points[0].y;
        let maxX = points[0].x;
        let maxY = points[0].y;
        
        for (let i = 1; i < points.length; i++) {
            minX = Math.min(minX, points[i].x);
            minY = Math.min(minY, points[i].y);
            maxX = Math.max(maxX, points[i].x);
            maxY = Math.max(maxY, points[i].y);
        }
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    static isPointInRect(point, rect) {
        return point.x >= rect.x && 
               point.x <= rect.x + rect.width &&
               point.y >= rect.y && 
               point.y <= rect.y + rect.height;
    }

    static resizeCanvas(canvas, newWidth, newHeight, smooth = true) {
        const tempCanvas = this.createCanvas(canvas.width, canvas.height);
        const tempCtx = this.getCanvasContext(tempCanvas);
        tempCtx.drawImage(canvas, 0, 0);
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        const ctx = this.getCanvasContext(canvas);
        ctx.imageSmoothingEnabled = smooth;
        ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);
    }

    static cropCanvas(canvas, x, y, width, height) {
        const croppedCanvas = this.createCanvas(width, height);
        const ctx = this.getCanvasContext(croppedCanvas);
        ctx.drawImage(canvas, x, y, width, height, 0, 0, width, height);
        return croppedCanvas;
    }

    static flipCanvas(canvas, horizontal = false, vertical = false) {
        const ctx = this.getCanvasContext(canvas);
        ctx.save();
        
        if (horizontal) {
            ctx.scale(-1, 1);
            ctx.translate(-canvas.width, 0);
        }
        
        if (vertical) {
            ctx.scale(1, -1);
            ctx.translate(0, -canvas.height);
        }
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        ctx.restore();
        ctx.putImageData(imageData, 0, 0);
    }

    static rotateCanvas(canvas, angle) {
        const cos = Math.abs(Math.cos(angle));
        const sin = Math.abs(Math.sin(angle));
        const newWidth = canvas.width * cos + canvas.height * sin;
        const newHeight = canvas.width * sin + canvas.height * cos;
        
        const rotatedCanvas = this.createCanvas(newWidth, newHeight);
        const ctx = this.getCanvasContext(rotatedCanvas);
        
        ctx.translate(newWidth / 2, newHeight / 2);
        ctx.rotate(angle);
        ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
        
        return rotatedCanvas;
    }

    static applyFilter(canvas, filter) {
        const ctx = this.getCanvasContext(canvas);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        switch (filter.type) {
            case 'blur':
                this.applyGaussianBlur(imageData, filter.radius || 5);
                break;
            case 'brightness':
                this.applyBrightness(data, filter.value || 0);
                break;
            case 'contrast':
                this.applyContrast(data, filter.value || 0);
                break;
            case 'saturation':
                this.applySaturation(data, filter.value || 0);
                break;
            case 'hue':
                this.applyHueShift(data, filter.value || 0);
                break;
            case 'grayscale':
                this.applyGrayscale(data);
                break;
            case 'sepia':
                this.applySepia(data);
                break;
            case 'invert':
                this.applyInvert(data);
                break;
        }
        
        ctx.putImageData(imageData, 0, 0);
    }

    static applyGaussianBlur(imageData, radius) {
        // Simple box blur approximation
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const output = new Uint8ClampedArray(data);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, a = 0, count = 0;
                
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const idx = (ny * width + nx) * 4;
                            r += data[idx];
                            g += data[idx + 1];
                            b += data[idx + 2];
                            a += data[idx + 3];
                            count++;
                        }
                    }
                }
                
                const idx = (y * width + x) * 4;
                output[idx] = r / count;
                output[idx + 1] = g / count;
                output[idx + 2] = b / count;
                output[idx + 3] = a / count;
            }
        }
        
        for (let i = 0; i < data.length; i++) {
            data[i] = output[i];
        }
    }

    static applyBrightness(data, value) {
        for (let i = 0; i < data.length; i += 4) {
            data[i] += value;     // R
            data[i + 1] += value; // G
            data[i + 2] += value; // B
        }
    }

    static applyContrast(data, value) {
        const factor = (259 * (value + 255)) / (255 * (259 - value));
        
        for (let i = 0; i < data.length; i += 4) {
            data[i] = factor * (data[i] - 128) + 128;     // R
            data[i + 1] = factor * (data[i + 1] - 128) + 128; // G
            data[i + 2] = factor * (data[i + 2] - 128) + 128; // B
        }
    }

    static applyGrayscale(data) {
        for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = gray;     // R
            data[i + 1] = gray; // G
            data[i + 2] = gray; // B
        }
    }

    static applySepia(data) {
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);     // R
            data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168); // G
            data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131); // B
        }
    }

    static applyInvert(data) {
        for (let i = 0; i < data.length; i += 4) {
            data[i] = 255 - data[i];     // R
            data[i + 1] = 255 - data[i + 1]; // G
            data[i + 2] = 255 - data[i + 2]; // B
        }
    }

    static createPattern(ctx, type, color1, color2, size = 10) {
        const patternCanvas = this.createCanvas(size * 2, size * 2);
        const patternCtx = this.getCanvasContext(patternCanvas);
        
        switch (type) {
            case 'checkerboard':
                patternCtx.fillStyle = color1;
                patternCtx.fillRect(0, 0, size, size);
                patternCtx.fillRect(size, size, size, size);
                patternCtx.fillStyle = color2;
                patternCtx.fillRect(size, 0, size, size);
                patternCtx.fillRect(0, size, size, size);
                break;
                
            case 'stripes':
                patternCtx.fillStyle = color1;
                patternCtx.fillRect(0, 0, size * 2, size * 2);
                patternCtx.fillStyle = color2;
                patternCtx.fillRect(0, 0, size, size * 2);
                break;
                
            case 'dots':
                patternCtx.fillStyle = color1;
                patternCtx.fillRect(0, 0, size * 2, size * 2);
                patternCtx.fillStyle = color2;
                patternCtx.beginPath();
                patternCtx.arc(size / 2, size / 2, size / 4, 0, Math.PI * 2);
                patternCtx.arc(size * 1.5, size * 1.5, size / 4, 0, Math.PI * 2);
                patternCtx.fill();
                break;
        }
        
        return ctx.createPattern(patternCanvas, 'repeat');
    }

    static measureText(ctx, text, font) {
        ctx.save();
        ctx.font = font;
        const metrics = ctx.measureText(text);
        ctx.restore();
        
        return {
            width: metrics.width,
            height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
        };
    }

    static wrapText(ctx, text, maxWidth, lineHeight) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (let i = 0; i < words.length; i++) {
            const testLine = currentLine + words[i] + ' ';
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLine !== '') {
                lines.push(currentLine);
                currentLine = words[i] + ' ';
            } else {
                currentLine = testLine;
            }
        }
        
        lines.push(currentLine);
        return lines;
    }

    static drawArrow(ctx, startX, startY, endX, endY, arrowSize = 10) {
        const angle = Math.atan2(endY - startY, endX - startX);
        
        // Draw line
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Draw arrowhead
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - arrowSize * Math.cos(angle - Math.PI / 6),
            endY - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - arrowSize * Math.cos(angle + Math.PI / 6),
            endY - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
    }

    static drawRoundedRect(ctx, x, y, width, height, radius) {
        if (width < 2 * radius) radius = width / 2;
        if (height < 2 * radius) radius = height / 2;
        
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + width, y, x + width, y + height, radius);
        ctx.arcTo(x + width, y + height, x, y + height, radius);
        ctx.arcTo(x, y + height, x, y, radius);
        ctx.arcTo(x, y, x + width, y, radius);
        ctx.closePath();
    }

    static saveCanvasState(canvas) {
        return {
            width: canvas.width,
            height: canvas.height,
            imageData: canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height)
        };
    }

    static restoreCanvasState(canvas, state) {
        canvas.width = state.width;
        canvas.height = state.height;
        canvas.getContext('2d').putImageData(state.imageData, 0, 0);
    }

    static generateThumbnail(canvas, maxWidth = 150, maxHeight = 150) {
        const scale = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
        const thumbnailWidth = canvas.width * scale;
        const thumbnailHeight = canvas.height * scale;
        
        const thumbnail = this.createCanvas(thumbnailWidth, thumbnailHeight);
        const ctx = this.getCanvasContext(thumbnail);
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(canvas, 0, 0, thumbnailWidth, thumbnailHeight);
        
        return thumbnail;
    }
}
