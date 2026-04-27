const { contextBridge } = require('electron')
const { exec, execFile } = require('child_process')
const recorder = require('node-record-lpcm16')

const PLAYER = "chromium"

function run(cmd) {
  return new Promise((resolve) => {
    exec(`bash -lc "${cmd}"`, (err, stdout) => {
      resolve((stdout || "").trim())
    })
  })
}

let audioStream = null

function startAudioStream(sendData) {
  audioStream = recorder.record({
    sampleRate: 44100,
    channels: 1,
    audioType: 'raw'
  })

  audioStream.stream().on('data', (data) => {
    sendData(Array.from(data))
  })
}

contextBridge.exposeInMainWorld('media', {

  startVisualizer: (callback) => {
    startAudioStream(callback)
  },

  command: (action) => {
    exec(`bash -lc "playerctl --player=${PLAYER} ${action}"`)
  },

  openSource: (url) => {
    if (!/^https?:\/\//.test(url || "")) {
      return
    }

    execFile('xdg-open', [url], () => {})
  },

  getInfo: async () => {
    const title = await run(`playerctl --player=${PLAYER} metadata title`)
    const artist = await run(`playerctl --player=${PLAYER} metadata artist`)
    const art = await run(`playerctl --player=${PLAYER} metadata mpris:artUrl`)
    const status = await run(`playerctl --player=${PLAYER} status`)
    const position = await run(`playerctl --player=${PLAYER} position`)
    const length = await run(`playerctl --player=${PLAYER} metadata mpris:length`)
    const url = await run(`playerctl --player=${PLAYER} metadata xesam:url`)

    return { title, artist, art, status, position, length, url }
  }

})
