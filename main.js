const { app, BrowserWindow, screen } = require('electron')
const { execFile } = require('child_process')
const path = require('path')

const WINDOW_WIDTH = 460
const WINDOW_HEIGHT = 140
const SCREEN_MARGIN = 24

function createWindow() {

  const preloadPath = path.resolve(__dirname, 'preload.js')
  const { workArea } = screen.getPrimaryDisplay()
  const x = workArea.x + workArea.width - WINDOW_WIDTH - SCREEN_MARGIN
  const y = workArea.y + workArea.height - WINDOW_HEIGHT - SCREEN_MARGIN

  const windowOptions = {
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: false,
    focusable: false,
    movable: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  }

  const win = new BrowserWindow(windowOptions)

  win.setSkipTaskbar(true)
  win.setFocusable(false)
  win.setAlwaysOnTop(false)
  keepWindowOnScreen(win)
  win.loadFile(path.join(__dirname, 'index.html'))
  win.webContents.once('did-finish-load', () => {
    applyDesktopWindowHints(win)
    startHomeScreenVisibility(win)
  })
}

app.whenReady().then(createWindow)

function keepWindowOnScreen(win) {
  const clampToScreen = () => {
    const bounds = win.getBounds()
    const { workArea } = screen.getDisplayMatching(bounds)

    const x = Math.max(workArea.x, Math.min(bounds.x, workArea.x + workArea.width - bounds.width))
    const y = Math.max(workArea.y, Math.min(bounds.y, workArea.y + workArea.height - bounds.height))

    if (x !== bounds.x || y !== bounds.y) {
      win.setBounds({ x, y, width: bounds.width, height: bounds.height })
    }
  }

  win.on('move', clampToScreen)
  screen.on('display-metrics-changed', clampToScreen)
}

function applyDesktopWindowHints(win) {
  if (process.platform !== 'linux') {
    return
  }

  const handle = win.getNativeWindowHandle()
  const windowId = handle.length >= 4 ? handle.readUInt32LE(0).toString() : ""

  if (!windowId) {
    return
  }

  execFile('xprop', [
    '-id',
    windowId,
    '-f',
    '_NET_WM_WINDOW_TYPE',
    '32a',
    '-set',
    '_NET_WM_WINDOW_TYPE',
    '_NET_WM_WINDOW_TYPE_DESKTOP'
  ], () => {})

  execFile('xprop', [
    '-id',
    windowId,
    '-f',
    '_NET_WM_STATE',
    '32a',
    '-set',
    '_NET_WM_STATE',
    '_NET_WM_STATE_BELOW'
  ], () => {})
}

function startHomeScreenVisibility(win) {
  if (process.platform !== 'linux') {
    return
  }

  const interval = setInterval(() => {
    updateHomeScreenVisibility(win)
  }, 500)

  win.on('closed', () => {
    clearInterval(interval)
  })

  updateHomeScreenVisibility(win)
}

function updateHomeScreenVisibility(win) {
  if (win.isDestroyed()) {
    return
  }

  execFile('xprop', ['-root', '_NET_ACTIVE_WINDOW'], (rootError, stdout) => {
    if (rootError || win.isDestroyed()) {
      return
    }

    const match = stdout.match(/window id # (0x[0-9a-f]+)/i)
    const activeWindowId = match ? match[1] : ""

    if (!activeWindowId || activeWindowId === '0x0') {
      showWidgetWithoutFocus(win)
      return
    }

    const widgetWindowId = getNativeWindowId(win)
    if (widgetWindowId && Number.parseInt(activeWindowId, 16) === widgetWindowId) {
      showWidgetWithoutFocus(win)
      return
    }

    execFile('xprop', ['-id', activeWindowId, '_NET_WM_WINDOW_TYPE'], (typeError, typeOutput) => {
      if (typeError || win.isDestroyed()) {
        return
      }

      if (typeOutput.includes('_NET_WM_WINDOW_TYPE_DESKTOP')) {
        showWidgetWithoutFocus(win)
      } else {
        win.hide()
      }
    })
  })
}

function showWidgetWithoutFocus(win) {
  if (win.isVisible()) {
    return
  }

  if (typeof win.showInactive === 'function') {
    win.showInactive()
  } else {
    win.show()
  }
}

function getNativeWindowId(win) {
  const handle = win.getNativeWindowHandle()
  return handle.length >= 4 ? handle.readUInt32LE(0) : 0
}
