# Grayscale Chrome Extension

A minimalist Chrome extension for distraction-free browsing by converting web pages to grayscale.

## Features

- **Minimalist Design**: Clean, simple interface with no distractions
- **Grayscale Mode**: Converts web pages to grayscale to reduce visual stimulation
- **Language Support**: Switch between Turkish (TR) and English (EN)
- **Dark Theme**: Toggle between light and dark themes in the popup
- **Easy Toggle**: Simple on/off switch in the popup interface
- **Real-time Updates**: Instantly applies changes without page refresh
- **Persistent Settings**: Settings are saved and restored across browser sessions

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension should now appear in your extensions list

## Usage

### Via Popup
1. Click the Grayscale icon in your browser toolbar
2. Toggle the "Siyah-Beyaz Mod" (B&W Mode) switch to enable/disable grayscale mode
3. Click the language button (TR/EN) to switch between Turkish and English
4. Click the theme button (🌙/☀️) to switch between light and dark themes

### Via Context Menu
1. Right-click on any webpage
2. Select "Toggle Grayscale" from the context menu

## Design Philosophy

This extension follows minimalist principles:
- Clean white background with subtle borders
- Simple typography using system fonts
- Minimal color palette (black, white, grays)
- No unnecessary animations or effects
- Compact, focused interface

## Files Structure

```
Grayscale/
├── manifest.json          # Extension manifest
├── popup.html             # Minimalist popup interface
├── popup.css              # Clean, minimal styling
├── popup.js               # Popup functionality
├── background.js          # Background service worker
├── content.js             # Content script for page manipulation
├── content.css            # Styles for grayscale effect
├── icons/                 # Extension icons
└── README.md              # This file
```

## Technical Details

### Grayscale Implementation
The extension uses CSS filters to apply grayscale effects:
```css
.sovereign-grayscale {
    filter: grayscale(100%) !important;
    -webkit-filter: grayscale(100%) !important;
    transition: filter 0.5s ease-in-out !important;
}
```

### Storage
Settings are stored using Chrome's storage API for persistence across sessions.

### Content Script Injection
The content script injects styles and applies the grayscale class to the document element based on user preferences.

## Browser Compatibility

This extension is compatible with:
- Chrome (Manifest V3)
- Edge (Chromium-based)
- Other Chromium-based browsers

## License

This project is open source and available under the MIT License.
