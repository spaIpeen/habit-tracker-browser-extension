# Habit Tracker Pro

A Chrome extension for tracking daily habits with visualization, statistics, and reminders.

## Features

- Track daily habits with categories
- View streak visualization and statistics
- Export and import habit data
- Daily reminders via notifications
- Light and dark theme support
- Responsive design

## Development Notes

### Width Constraints

The extension is designed to maintain a minimum width of 350px to ensure proper display of all UI elements. This is enforced through several CSS rules:

- The `html` and `body` elements have explicit `width` and `min-width` properties set to 350px with `!important` flags
- The `.app-container` has a minimum width of 320px
- All sections have a minimum width of 300px
- Form inputs, buttons, and other interactive elements have appropriate minimum widths
- A general rule ensures all interactive elements maintain a minimum touch target size of 44px

These constraints were added to prevent the extension from rendering too narrow, which could make the UI unusable.

### Viewport Settings

The HTML includes specific viewport meta tags to control the rendering:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0">
<meta name="width" content="350">
```

### Responsive Design

While the extension has a minimum width of 350px, it also includes responsive design elements to handle different screen sizes:

- Media queries for screens under 400px wide
- Flexible layouts using CSS Grid and Flexbox
- Percentage-based widths for many elements

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. The extension should now be installed and accessible from the Chrome toolbar

## License

[MIT License](LICENSE)