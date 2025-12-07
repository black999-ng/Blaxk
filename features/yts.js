const ytdl = require('@distube/ytdl-core')
const yts = require('yt-search')
const fs = require('fs')
const path = require('path')

const ytIdRegex = /(?:http(?:s|):\/\/|)(?:(?:www\.|)youtube(?:\-nocookie|)\.com\/(?:watch\?.*(?:|\&)v=|embed|shorts\/|v\/)|youtu\.be\/)([-_0-9A-Za-z]{11})/

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

async function ytsSearchText(match) {
  if (!match) return '*Example : yts baymax*'
  const vid = ytIdRegex.exec(match)
  if (vid) {
    const url = `https://www.youtube.com/watch?v=${vid[1]}`
    const info = await ytdl.getInfo(url)
    const d = info.videoDetails
    const title = d.title
    const duration = formatDuration(d.lengthSeconds || 0)
    const view = d.viewCount || 0
    const published = d.publishDate || ''
    const description = d.description || ''
    return `*Title :* ${title}\n*Time :* ${duration}\n*Views :* ${view}\n*Publish :* ${published}\n*Desc :* ${description}`
  }
  const results = await yts(match)
  const videos = results.videos.slice(0, 5)
  const msg = videos
    .map(v => `• *${v.title.trim()}*\n*Views :* ${v.views}\n*Time :* ${v.timestamp}\n*Author :* ${v.author.name}\n*Url :* ${v.url}\n\n`)
    .join('')
  return msg.trim()
}

async function buildSong(match) {
  let url = match
  const vid = ytIdRegex.exec(match)
  if (vid) url = `https://www.youtube.com/watch?v=${vid[1]}`
  
  const info = await ytdl.getInfo(url)
  const title = info.videoDetails.title
  const downloadsDir = path.join(__dirname, '..', 'downloads')
  if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true })
  const sanitized = title.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '_')
  const outputPath = path.join(downloadsDir, `${sanitized}.mp3`)
  
  return new Promise((resolve, reject) => {
    const stream = ytdl(url, { quality: 'highestaudio', filter: 'audioonly' })
    const ws = fs.createWriteStream(outputPath)
    
    stream.on('error', reject)
    ws.on('error', reject)
    ws.on('finish', () => resolve({ path: outputPath, fileName: `${sanitized}.mp3`, mimetype: 'audio/mpeg' }))
    
    stream.pipe(ws)
  })
}

async function buildVideo(match) {
  let url = match
  const vid = ytIdRegex.exec(match)
  if (vid) url = `https://www.youtube.com/watch?v=${vid[1]}`
  
  const info = await ytdl.getInfo(url)
  const title = info.videoDetails.title
  const downloadsDir = path.join(__dirname, '..', 'downloads')
  if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true })
  const sanitized = title.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '_')
  const outputPath = path.join(downloadsDir, `${sanitized}.mp4`)
  
  return new Promise((resolve, reject) => {
    const stream = ytdl(url, { quality: 'highest' })
    const ws = fs.createWriteStream(outputPath)
    
    stream.on('error', reject)
    ws.on('error', reject)
    ws.on('finish', () => resolve({ path: outputPath, fileName: `${sanitized}.mp4` }))
    
    stream.pipe(ws)
  })
}

module.exports = { ytsSearchText, buildSong, buildVideo }
