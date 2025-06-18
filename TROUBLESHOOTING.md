# 🔧 Troubleshooting Guide - Full Page Screenshot Issues

## 📋 Common Issues & Solutions

### 1. **Gambar Terpotong-Potong (Fragmented Images)**

**Masalah**: Screenshot full page tidak menyatu dengan mulus, ada garis atau potongan.

**Penyebab**:
- Algoritma stitching tidak optimal
- Overlap antar viewport tidak cukup
- Layout berubah saat scrolling
- Lazy-loaded content yang tidak dimuat sempurna

**Solusi**:
- ✅ **Sudah diperbaiki**: Algoritma stitching baru dengan overlap 50px
- ✅ **Sudah diperbaiki**: Deteksi layout yang lebih baik
- ✅ **Sudah diperbaiki**: Tunggu loading gambar sebelum capture

### 2. **Warna Hijau yang Tidak Diinginkan**

**Masalah**: Muncul warna hijau pada hasil screenshot.

**Penyebab**:
- Developer overlay aktif (grid dan element outlines)
- Element highlight tidak dibersihkan
- CSS debugging yang tersisa

**Solusi**:
- ✅ **Sudah diperbaiki**: Developer overlay dinonaktifkan untuk full page capture
- ✅ **Sudah diperbaiki**: Cleanup yang lebih thorough
- ✅ **Sudah diperbaiki**: Force removal semua overlay hijau

### 3. **Screenshot Tidak Seamless**

**Masalah**: Ada gap atau misalignment antar bagian.

**Penyebab**:
- Positioning yang tidak tepat
- Scale factor tidak konsisten
- Sticky elements yang duplicate

**Solusi**:
- ✅ **Sudah diperbaiki**: Positioning pixel-perfect
- ✅ **Sudah diperbaiki**: Consistent scale calculation
- ✅ **Sudah diperbaiki**: Hide sticky elements saat capture

## 🚀 Improved Features

### New Stitching Algorithm
```javascript
// Before: Simple overlap
scrollStep = viewportHeight - 100;

// After: Smart overlap with image wait
const overlap = 50; // Precise overlap
const scrollStep = viewportHeight - overlap;
await this.waitForImagesLoad(); // Wait for lazy content
```

### Better Cleanup
```javascript
// Removes ALL green overlays
- Grid overlay
- Element outlines
- Highlight boxes
- Developer tools artifacts
```

### Progressive Capture
```
1. Analyze page layout (10%)
2. Capture viewport sections (20-90%)
3. Stitch with improved algorithm (95%)
4. Cleanup and convert (100%)
```

## 📱 Browser Compatibility

| Browser | Full Page | Stitching | Quality |
|---------|-----------|-----------|---------|
| Chrome  | ✅ Full   | ✅ Perfect | ✅ HD   |
| Edge    | ✅ Full   | ✅ Good    | ✅ HD   |
| Firefox | ⚠️ Basic  | ⚠️ Limited | ✅ HD   |

## ⚙️ Recommended Settings

**For Best Quality**:
- ✅ Retina Quality (2x): ON
- ❌ Developer Overlay: OFF
- ✅ Include Sticky: ON (unless causing issues)
- ❌ Auto-expand: OFF (unless needed)
- 📤 Format: PNG (lossless)

**For Speed**:
- ❌ Retina Quality: OFF
- ❌ Developer Overlay: OFF
- ❌ Include Sticky: OFF
- ❌ Auto-expand: OFF
- 📤 Format: JPEG (compressed)

## 🐛 Still Having Issues?

### Debug Steps:
1. **Reload extension** (chrome://extensions/)
2. **Try different page** (test on simple page first)
3. **Check browser console** (F12 → Console)
4. **Try visible area capture** (fallback test)

### Common Error Messages:
- `"Could not establish connection"` → Content script injection failed
- `"Capture failed"` → Chrome API permission issue
- `"Stitching failed"` → Memory/canvas size limit

### Performance Tips:
- Close other tabs to free memory
- Use JPEG for very long pages
- Disable retina quality for huge pages
- Try in incognito mode (extension compatibility)

## 🔍 Technical Details

### Canvas Limits:
- **Max size**: ~32,767 x 32,767 pixels
- **Memory**: Depends on available RAM
- **Format**: PNG (lossless) vs JPEG (compressed)

### Scroll Optimization:
- **Smooth scroll**: Disabled during capture
- **Wait time**: 200ms per viewport
- **Image load**: Max 1s per lazy image
- **Layout stable**: 100ms additional wait

---

*Extension Version: 1.0.0*
*Last Updated: June 18, 2025*
