# 📸 Captune - Professional Screenshot Extension

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/farelrasyah/captune)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Available-red.svg)]()

**Captune** adalah Chrome Extension profesional yang dirancang khusus untuk developer, QA tester, dokumentator, dan UI/UX designer. Dengan fitur-fitur canggih seperti full page HD capture, visual editor, dan batch processing, Captune mengubah cara Anda mengambil dan mengedit screenshot.

## ✨ Fitur Utama

### 🔧 Full Page HD Smart Capture
- **Smart Stitching**: Tangkap seluruh halaman website dengan teknik viewport stitching
- **Dynamic Content Support**: Mendukung konten dinamis (lazy-load, infinite scroll, SPA)
- **Sticky Elements Control**: Opsi untuk menyertakan/menyembunyikan header/footer sticky
- **Retina Quality**: Output 1x, 2x, 3x scale untuk hasil super tajam
- **Multi Format**: Export ke PNG, JPEG, PDF, dan WebP

### 🎨 Visual Editor & Annotator
- **Canvas-based Editor**: Editor berbasis HTML5 canvas yang responsif
- **Rich Annotation Tools**:
  - ✏️ Text dengan berbagai font dan style
  - 📦 Shapes (rectangle, circle, arrow, line)
  - 🖊️ Free drawing dan highlight
  - 🌫️ Blur tool untuk sensor informasi sensitif
- **Layer Management**: Sistem layer dengan undo/redo
- **Export Options**: Multiple format dengan quality control

### 📑 Auto PDF Page Capture (Batch Mode)
- **Multi-URL Processing**: Input beberapa URL sekaligus
- **Auto Link Discovery**: Capture semua link dalam satu halaman
- **PDF Compilation**: Susun hasil capture menjadi satu file PDF
- **Drag & Drop Ordering**: Atur urutan halaman sebelum export

### 🌍 Multi-Device Emulator Capture
- **Device Simulation**: Desktop (1920px), Tablet (768px), Mobile (375px)
- **Responsive Testing**: Test tampilan di berbagai ukuran viewport
- **Batch Export**: Satu klik export semua device mode ke ZIP

### 📜 Long Conversation Capture
- **Auto-Expand**: Otomatis expand thread dan tombol "load more"
- **Comment Thread Mode**: Khusus untuk forum, Reddit, kolom diskusi
- **Smart Scrolling**: Deteksi dan tangkap konten panjang secara otomatis

### 🧰 Developer Overlay Mode
- **Visual Debugging**: Tampilkan grid layout, padding/margin outline
- **Element Info**: Bounding box dan informasi CSS
- **Perfect for UI Review**: Ideal untuk debugging visual layout

### 🖱️ Context Menu & Shortcuts
- **Right-click Actions**: "Capture Full Page", "Capture Mobile View", dll
- **Customizable Shortcuts**: 
  - `Ctrl+Shift+S` - Capture Full Page
  - `Ctrl+Shift+M` - Capture Mobile View
  - `Ctrl+Shift+L` - Capture with Links

### ⚙️ Export & Integration Options
- **Local Storage**: Simpan ke device
- **Clipboard Integration**: Copy hasil ke clipboard
- **Multiple Formats**: PNG, JPG, PDF, ZIP, JSON project files
- **Quality Control**: Pengaturan kompresi dan kualitas detail

## 🚀 Installation

### From Source (Developer Mode)

1. **Clone Repository**
   ```bash
   git clone https://github.com/farelrasyah/captune.git
   cd captune
   ```

2. **Load Extension**
   - Buka Chrome dan akses `chrome://extensions/`
   - Enable "Developer mode"
   - Klik "Load unpacked"
   - Pilih folder `Captune`

3. **Pin Extension**
   - Klik icon puzzle di toolbar Chrome
   - Pin Captune untuk akses mudah

### From Chrome Web Store
> Coming Soon - Extension akan tersedia di Chrome Web Store

## 📖 Usage Guide

### Basic Screenshot
1. Klik icon Captune di toolbar
2. Pilih jenis capture yang diinginkan
3. Tunggu proses selesai
4. Download atau edit hasil

### Visual Editor
1. Ambil screenshot atau load image existing
2. Klik "Visual Editor" 
3. Gunakan tools untuk annotate
4. Export hasil dalam format yang diinginkan

### Batch Capture
1. Pilih "All Links to PDF" atau "Multiple URLs"
2. Konfigurasi settings capture
3. Biarkan extension bekerja otomatis
4. Download hasil PDF

### Multi-Device Capture
1. Klik "Capture All & Export ZIP"
2. Extension akan capture dalam 3 viewport
3. Download file ZIP berisi semua hasil

## ⚡ Advanced Features

### Scheduled Capture
```javascript
// Auto capture setiap jam
scheduler.createSchedule({
  type: 'single-page',
  config: {
    url: 'https://example.com',
    autoSave: true
  },
  timing: {
    type: 'recurring',
    interval: 'hourly'
  }
});
```

### Custom Selectors
- Configure CSS selectors untuk expand buttons
- Set sticky element selectors
- Customize auto-expand behavior

### Developer API
```javascript
// Capture programmatically
chrome.runtime.sendMessage({
  action: 'captureFullPage',
  settings: {
    includeSticky: false,
    retinaQuality: true,
    outputFormat: 'png'
  }
});
```

## 🛠️ Configuration

### Settings Categories

#### General Settings
- Auto-save screenshots
- Notification preferences
- Default file naming pattern
- Theme selection (Light/Dark/Auto)

#### Capture Settings
- Default capture options
- Scroll delay configuration
- Maximum page height limits
- Device viewport sizes

#### Export Settings
- Default export format
- Quality settings per format
- Watermark configuration
- File size limitations

#### Keyboard Shortcuts
- Customizable hotkeys
- Context menu options
- Global vs page-specific shortcuts

#### Advanced Settings
- Performance tuning
- Developer mode features
- Custom CSS selectors
- Cache management

## 🏗️ Architecture

### File Structure
```
Captune/
├── manifest.json          # Extension manifest (v3)
├── popup.html/js          # Main UI popup
├── editor.html/js         # Visual editor
├── options.html/js        # Settings page
├── background.js          # Service worker
├── content.js            # Content script
├── capture.js            # Capture logic
├── canvas-utils.js       # Canvas utilities
├── scheduler.js          # Auto capture scheduler
├── styles/               # CSS files
│   ├── popup.css
│   ├── editor.css
│   └── options.css
├── icons/                # Extension icons
└── README.md
```

### Key Components

#### Background Script
- Context menu management
- Alarm/scheduling system
- Cross-tab communication
- Storage management

#### Content Script
- Page manipulation
- Full page capture logic
- Element selection
- Auto-expansion features

#### Popup Interface
- Quick capture controls
- Device mode selection
- Progress tracking
- Settings access

#### Visual Editor
- Canvas-based editing
- Tool system architecture
- Layer management
- Export pipeline

#### Scheduler System
- Cron-like scheduling
- Batch processing
- Error handling
- Notification system

## 🔧 Development

### Prerequisites
- Chrome Browser (v88+)
- Basic understanding of JavaScript
- Familiarity with Chrome Extension APIs

### Building
```bash
# Clone repository
git clone https://github.com/farelrasyah/captune.git

# Navigate to directory
cd captune

# Load in Chrome for development
# Go to chrome://extensions/
# Enable Developer mode
# Click "Load unpacked" and select the folder
```

### Testing
```bash
# Test capture functionality
npm run test:capture

# Test editor features
npm run test:editor

# Test batch processing
npm run test:batch
```

### Contributing
1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 API Reference

### Message Passing API

#### Capture Actions
```javascript
// Full page capture
chrome.tabs.sendMessage(tabId, {
  action: 'captureFullPage',
  settings: {
    includeSticky: boolean,
    retinaQuality: boolean,
    outputFormat: 'png|jpeg|webp|pdf'
  }
});

// Device capture
chrome.tabs.sendMessage(tabId, {
  action: 'captureDevice',
  device: {
    width: number,
    height: number,
    deviceScaleFactor: number
  }
});
```

#### Scheduler API
```javascript
// Create schedule
chrome.runtime.sendMessage({
  action: 'createSchedule',
  schedule: {
    type: 'single-page|multiple-pages|auto-monitor',
    config: {...},
    timing: {...}
  }
});
```

### Storage Schema
```javascript
// Settings
{
  includeSticky: boolean,
  retinaQuality: boolean,
  outputFormat: string,
  // ... other settings
}

// Schedules
{
  id: string,
  type: string,
  config: object,
  timing: object,
  status: 'active|paused|completed'
}
```

## 🚨 Troubleshooting

### Common Issues

#### Capture Failed
- **Problem**: Screenshot tidak dapat diambil
- **Solution**: Periksa permissions tab, reload halaman

#### Large Page Timeout
- **Problem**: Halaman terlalu besar untuk di-capture
- **Solution**: Increase max page height di settings

#### Export Failed
- **Problem**: Gagal download hasil
- **Solution**: Periksa storage permissions dan space

#### Editor Loading Issues
- **Problem**: Visual editor tidak loading
- **Solution**: Disable ad-blocker, check console errors

### Performance Tips
- Gunakan JPEG untuk file size lebih kecil
- Disable retina quality untuk performance
- Set max page height untuk halaman besar
- Clear cache secara berkala

## 📊 Supported Websites

### Fully Tested
- ✅ GitHub
- ✅ Google Docs
- ✅ Medium
- ✅ Reddit
- ✅ Twitter/X
- ✅ LinkedIn
- ✅ Stack Overflow
- ✅ Confluence
- ✅ Notion

### Partially Supported
- ⚠️ Facebook (limited by privacy settings)
- ⚠️ Instagram (limited by lazy loading)
- ⚠️ YouTube (video content limitations)

### Known Limitations
- Canvas-based content mungkin tidak ter-capture sempurna
- Video dan animated content akan di-capture sebagai static
- Beberapa SPA memerlukan wait time tambahan

## 🤝 Contributing

Kami welcome kontribusi dari community! Berikut cara berkontribusi:

### Types of Contributions
- 🐛 Bug reports
- 💡 Feature requests  
- 📝 Documentation improvements
- 🔧 Code contributions
- 🎨 UI/UX improvements

### Development Guidelines
- Follow existing code style
- Add tests for new features
- Update documentation
- Use semantic commit messages

### Issue Templates
Gunakan template yang tersedia untuk:
- Bug Report
- Feature Request
- Documentation Update

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Chrome Extension APIs** - Foundation untuk extension
- **HTML5 Canvas** - Visual editor functionality
- **Modern JavaScript** - ES6+ features
- **CSS Grid & Flexbox** - Responsive layouts
- **Community Feedback** - Feature requests dan bug reports

## 🔗 Links

- [Chrome Web Store](https://chrome.google.com/webstore) (Coming Soon)
- [Documentation](https://github.com/farelrasyah/captune/wiki)
- [Issue Tracker](https://github.com/farelrasyah/captune/issues)
- [Changelog](CHANGELOG.md)
- [Contributing Guide](CONTRIBUTING.md)

## 📞 Support

Butuh bantuan? Ada beberapa cara untuk mendapatkan support:

- 📧 **Email**: [farelrasyah@example.com](mailto:farelrasyah@example.com)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/farelrasyah/captune/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/farelrasyah/captune/discussions)
- 📖 **Documentation**: [Wiki](https://github.com/farelrasyah/captune/wiki)

---

**Made with ❤️ by Farel Rasyah**

> Captune - Making screenshot workflow professional and efficient.

---

## 📈 Roadmap

### Version 1.1.0 (Coming Soon)
- [ ] Cloud storage integration (Google Drive, Dropbox)
- [ ] Team collaboration features
- [ ] Advanced PDF generation with bookmarks
- [ ] Chrome DevTools integration

### Version 1.2.0 (Future)
- [ ] AI-powered auto-annotation
- [ ] Video capture (GIF/MP4)
- [ ] Extension API for third-party integration
- [ ] Mobile app companion

### Version 2.0.0 (Long-term)
- [ ] Cross-browser support (Firefox, Safari)
- [ ] Desktop application
- [ ] Enterprise features
- [ ] Advanced analytics and reporting

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=farelrasyah/captune&type=Date)](https://star-history.com/#farelrasyah/captune&Date)

---

**⭐ Star this repo if Captune helps you in your work!**
