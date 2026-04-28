# MP Modern

MP Modern is an Electron-based music widget prototype for Linux desktops. It shows the current media title, artist, album artwork, playback progress, play/pause controls, next/previous controls, and a small animated visualizer-style display.

This project is not a complete Linux widget package. It is a small Electron app/code prototype that behaves like a desktop widget by using a transparent, frameless window and Linux window hints. It is meant to be run from the source folder, not installed as a polished system widget.

## What It Does

- Reads media metadata through `playerctl`
- Targets the `chromium` media player by default
- Shows title, artist, album art, elapsed time, and total duration
- Provides play/pause, next, and previous media commands
- Opens the current media source URL when the album art is clicked
- Samples album art colors to theme the widget
- Uses a canvas animation as a visualizer-style effect
- Tries to stay on the Linux desktop using `xprop` window hints

## What It Is Not

- Not a packaged Linux desktop widget
- Not a GNOME Shell, KDE Plasma, or Cinnamon widget/applet
- Not distributed as a `.deb`, AppImage, Flatpak, or system tray app
- Not guaranteed to work across all Linux desktop environments
- Not a full media player
- Not a real audio visualizer connected to playback analysis in the current UI

## Requirements

- Linux desktop environment with X11 support
- Node.js and npm
- `playerctl`
- `xprop`
- A media player that supports MPRIS, such as Chromium, Chrome, Spotify, or another compatible player

Install the Linux tools on Debian/Ubuntu-based systems:

```bash
sudo apt install playerctl x11-utils
```

## Setup

Install project dependencies:

```bash
npm install
```

Run the app:

```bash
npm start
```

## Player Target

The media player target is set in `preload.js`:

```js
const PLAYER = "chromium"
```

Change this value if you want to control another MPRIS player. For example:

```js
const PLAYER = "spotify"
```

You can list available players with:

```bash
playerctl -l
```

## Main Files

- `main.js` creates the Electron window and applies Linux/X11 window behavior.
- `preload.js` exposes safe media commands and metadata access to the renderer.
- `renderer.js` updates the UI, draws the animated bars, manages playback state, progress, album art, and theme colors.
- `index.html` contains the widget markup.
- `style.css` controls the visual design.

## Notes

The Linux desktop behavior depends on X11 window properties set through `xprop`. Some Wayland sessions or desktop environments may ignore these hints. If the widget does not stay on the desktop or hides unexpectedly, the project may need desktop-environment-specific handling.

