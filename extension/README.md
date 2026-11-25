# StackScout AI Chrome Extension

Apply to jobs faster with AI-powered tools directly from LinkedIn, Indeed, and Glassdoor.

## Features

- **One-click apply** — Click "Apply with StackScout AI" on any job posting
- **Job extraction** — Automatically extracts job title, company, location, and description
- **AI-powered** — Get match scores, tailored resumes, and cover letters
- **Auto-apply** — Submit applications directly to Greenhouse/Lever/email

## Installation

### Development

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension` folder

### Production (Chrome Web Store)

1. Package the extension as a `.zip` file
2. Upload to Chrome Web Store Developer Dashboard
3. Submit for review

## Usage

1. Navigate to a job posting on LinkedIn, Indeed, or Glassdoor
2. Click the "Apply with StackScout AI" button (bottom right)
3. Or click the extension icon in the toolbar
4. StackScout will open with the job pre-filled

## Files

- `manifest.json` — Extension configuration
- `content.js` — Injects apply button on job pages + message handling
- `content.css` — Styles for injected button
- `popup.html` — Extension popup UI
- `popup.js` — Popup logic
- `icon16.png` — Extension icon (16x16)
- `icon48.png` — Extension icon (48x48)
- `icon128.png` — Extension icon (128x128)
- `icon*.svg` — SVG sources (kept for future regeneration)

## Permissions

- `activeTab` — Access current tab URL
- `storage` — Save job details for StackScout
- `host_permissions` — Access LinkedIn, Indeed, Glassdoor

## Notes

- Icons are PNG files — required for Chrome Web Store submission
- SVG sources are kept for regenerating icons at different sizes
- Regenerate PNGs with: `magick -background none -font "/System/Library/Fonts/Helvetica.ttc" -density 300 icon128.svg -resize 128x128 icon128.png`
- The extension detects job pages automatically and shows the apply button
