const canvas = document.getElementById("visualizer")
const ctx = canvas.getContext("2d")
const card = document.querySelector(".card")
const art = document.getElementById("art")
const playIcon = document.getElementById("playIcon")
const elapsed = document.getElementById("elapsed")
const duration = document.getElementById("duration")
const progressFill = document.getElementById("progressFill")

let bars = []
let barTargets = []
let seeds = []
let playing = false
const fallbackAccent = { r: 224, g: 43, b: 142 }
let accent = fallbackAccent
let lastTargetUpdate = 0
let currentArt = ""
let currentSourceUrl = ""

const playSvg = `
  <svg viewBox="0 0 24 24" aria-hidden="true" class="play-svg">
    <path d="M9 6.5v11l8.5-5.5L9 6.5Z" />
  </svg>
`

const pauseSvg = `
  <svg viewBox="0 0 24 24" aria-hidden="true" class="pause-svg">
    <rect x="8" y="6.5" width="3" height="11" rx="0.8" />
    <rect x="13" y="6.5" width="3" height="11" rx="0.8" />
  </svg>
`

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const width = Math.max(1, Math.round(rect.width))
  const height = Math.max(1, Math.round(rect.height))

  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const count = Math.max(24, Math.floor(width / 6))
  if (count !== bars.length) {
    bars = new Array(count).fill(2)
    barTargets = new Array(count).fill(2)
    seeds = new Array(count).fill(0).map((_, i) => Math.sin(i * 12.9898) * 43758.5453 % 1)
  }
}

resizeCanvas()
window.addEventListener("resize", resizeCanvas)

function draw() {
  const rect = canvas.getBoundingClientRect()
  const width = rect.width
  const height = rect.height
  const now = performance.now()

  ctx.clearRect(0, 0, width, height)

  if (playing && now - lastTargetUpdate > 85) {
    const pulse = 0.58 + Math.sin(now * 0.0035) * 0.2 + Math.sin(now * 0.0012) * 0.12

    for (let i = 0; i < barTargets.length; i++) {
      const position = i / Math.max(1, barTargets.length - 1)
      const wave = Math.sin(now * 0.0024 + i * 0.54) * 0.5 + 0.5
      const drift = Math.sin(now * 0.0015 + seeds[i] * 9) * 0.5 + 0.5
      const centerLift = 1 - Math.abs(position - 0.5) * 0.22

      barTargets[i] = 3 + (height - 5) * centerLift * (0.24 + pulse * 0.32 + wave * 0.25 + drift * 0.13)
    }

    lastTargetUpdate = now
  }

  const barWidth = 3
  const gap = Math.max(2.5, (width - bars.length * barWidth) / Math.max(1, bars.length - 1))
  const gradient = ctx.createLinearGradient(0, height, 0, 0)

  gradient.addColorStop(0, `rgba(${accent.r}, ${accent.g}, ${accent.b}, 0.35)`)
  gradient.addColorStop(1, `rgba(${accent.r}, ${accent.g}, ${accent.b}, 0.88)`)
  ctx.fillStyle = gradient
  ctx.shadowColor = `rgba(${accent.r}, ${accent.g}, ${accent.b}, 0.22)`
  ctx.shadowBlur = 8

  for (let i = 0; i < bars.length; i++) {
    if (playing) {
      bars[i] += (barTargets[i] - bars[i]) * 0.13
    } else {
      bars[i] += (2 - bars[i]) * 0.1
    }

    const barHeight = Math.max(1.5, Math.min(height - 2, bars[i]))
    const x = i * (barWidth + gap)
    roundedRect(ctx, x, height - barHeight, barWidth, barHeight, 1.5)
    ctx.fill()
  }

  ctx.shadowBlur = 0
  requestAnimationFrame(draw)
}

draw()

async function update() {
  const data = await window.media.getInfo()

  playing = data.status === "Playing"

  document.getElementById("title").innerText = data.title || "Nothing Playing"
  document.getElementById("artist").innerText = data.artist || ""
  currentSourceUrl = /^https?:\/\//.test(data.url || "") ? data.url : ""
  art.classList.toggle("is-clickable", Boolean(currentSourceUrl))
  updateProgress(data.position, data.length)

  if (data.art) {
    let url = data.art
    if (url.startsWith("file://")) {
      url = url.replace("file://", "")
    }

    if (url !== currentArt) {
      currentArt = url
      if (/^https?:\/\//.test(url)) {
        art.crossOrigin = "anonymous"
      } else {
        art.removeAttribute("crossorigin")
      }
      art.src = url
    }
  } else if (currentArt) {
    currentArt = ""
    art.removeAttribute("src")
    setAccent(fallbackAccent)
  }

  if (playing) {
    playIcon.innerHTML = pauseSvg
    playIcon.classList.add("is-playing")
  } else {
    playIcon.innerHTML = playSvg
    playIcon.classList.remove("is-playing")
  }
}

setInterval(update, 1000)
update()

function toggle() {
  window.media.command("play-pause")
}

function next() {
  window.media.command("next")
}

function prev() {
  window.media.command("previous")
}

art.addEventListener("click", () => {
  if (currentSourceUrl) {
    window.media.openSource(currentSourceUrl)
  }
})

function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)

  context.beginPath()
  context.moveTo(x + r, y)
  context.arcTo(x + width, y, x + width, y + height, r)
  context.arcTo(x + width, y + height, x, y + height, r)
  context.arcTo(x, y + height, x, y, r)
  context.arcTo(x, y, x + width, y, r)
  context.closePath()
}

function updateProgress(position, length) {
  const current = Number.parseFloat(position)
  const total = Number.parseFloat(length) / 1000000

  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) {
    elapsed.innerText = "00:00"
    duration.innerText = "00:00"
    progressFill.style.width = "0%"
    return
  }

  elapsed.innerText = formatTime(current)
  duration.innerText = formatTime(total)
  progressFill.style.width = `${Math.min(100, Math.max(0, current / total * 100))}%`
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safe / 60)
  const remainder = safe % 60

  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
}

art.addEventListener("load", () => {
  requestAnimationFrame(() => updateAccentFromArt(art))
})

function updateAccentFromArt(image) {
  try {
    const sample = document.createElement("canvas")
    const sampleCtx = sample.getContext("2d", { willReadFrequently: true })

    sample.width = 48
    sample.height = 48
    sampleCtx.drawImage(image, 0, 0, sample.width, sample.height)

    const data = sampleCtx.getImageData(0, 0, sample.width, sample.height).data
    let best = null
    let bestScore = -1

    for (let i = 0; i < data.length; i += 16) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]
      const hsl = rgbToHsl(r, g, b)
      const brightness = (r + g + b) / 765

      if (a < 220 || brightness < 0.12 || brightness > 0.88 || hsl.s < 0.08) {
        continue
      }

      const score = hsl.s * 0.58 + (1 - Math.abs(brightness - 0.45)) * 0.42
      if (score > bestScore) {
        bestScore = score
        best = hsl
      }
    }

    if (!best) {
      setAccent(fallbackAccent)
      return
    }

    const muted = hslToRgb(best.h, Math.min(0.42, best.s * 0.62), Math.min(0.64, Math.max(0.42, best.l * 0.72)))
    setAccent(muted)
  } catch {
    setAccent(fallbackAccent)
  }
}

function setAccent(color) {
  accent = color
  const hsl = rgbToHsl(color.r, color.g, color.b)
  const saturation = Math.min(0.42, Math.max(0.16, hsl.s * 0.58))
  const panel = hslToRgb(hsl.h, saturation, 0.24)
  const panelDeep = hslToRgb(hsl.h, Math.max(0.12, saturation * 0.7), 0.1)
  const title = hslToRgb(hsl.h, Math.min(0.34, saturation + 0.08), 0.86)
  const muted = hslToRgb(hsl.h, Math.min(0.28, saturation), 0.74)
  const play = hslToRgb(hsl.h, Math.min(0.3, saturation + 0.06), 0.88)
  const track = hslToRgb(hsl.h, Math.min(0.48, saturation + 0.12), 0.2)

  card.style.setProperty("--accent", `rgb(${color.r}, ${color.g}, ${color.b})`)
  card.style.setProperty("--accent-soft", `rgba(${color.r}, ${color.g}, ${color.b}, 0.2)`)
  card.style.setProperty("--panel", `rgba(${panel.r}, ${panel.g}, ${panel.b}, 0.88)`)
  card.style.setProperty("--panel-deep", `rgba(${panelDeep.r}, ${panelDeep.g}, ${panelDeep.b}, 0.93)`)
  card.style.setProperty("--title-color", `rgba(${title.r}, ${title.g}, ${title.b}, 0.98)`)
  card.style.setProperty("--muted-color", `rgba(${muted.r}, ${muted.g}, ${muted.b}, 0.72)`)
  card.style.setProperty("--time-color", `rgba(${muted.r}, ${muted.g}, ${muted.b}, 0.78)`)
  card.style.setProperty("--play-bg", `rgba(${play.r}, ${play.g}, ${play.b}, 0.94)`)
  card.style.setProperty("--progress-track", `rgba(${track.r}, ${track.g}, ${track.b}, 0.62)`)
}

function rgbToHsl(r, g, b) {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    if (max === g) h = (b - r) / d + 2
    if (max === b) h = (r - g) / d + 4

    h /= 6
  }

  return { h, s, l }
}

function hslToRgb(h, s, l) {
  const hueToRgb = (p, q, t) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  if (s === 0) {
    const value = Math.round(l * 255)
    return { r: value, g: value, b: value }
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q

  return {
    r: Math.round(hueToRgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, h) * 255),
    b: Math.round(hueToRgb(p, q, h - 1 / 3) * 255)
  }
}
