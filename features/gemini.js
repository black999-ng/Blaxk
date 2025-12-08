const fs = require('fs')
const path = require('path')
const { GoogleGenAI } = require('@google/genai')

const dbDir = path.join(__dirname, '..', 'database')
const file = path.join(dbDir, 'gemini.json')

try { if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true }) } catch {}
try { if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({}), 'utf8') } catch {}

function loadDB() {
  try { return JSON.parse(fs.readFileSync(file, 'utf8') || '{}') } catch { return {} }
}

function saveDB(db) { try { fs.writeFileSync(file, JSON.stringify(db, null, 2), 'utf8') } catch {} }

// Cooldown tracker for features
const cooldowns = new Map()

const BOT_CONFIG = {
  name: "Almighty Blaxk's Bot",
  version: "1.0.0",
  owner: "Blaxk",
  language: "en",
  personality: "savage-tech-mentor, cringe, cool, alpha, rizz, witty, dominant",
  description: "Savage Nigerian tech AI with humor, brains, and dominance"
}

const MODES = {
  normal: {
    description: "Polite and helpful assistant",
    roast_level: 0,
    tone: "clean",
    instruction: "You're a chill, helpful friend. Answer questions naturally without being too formal. Sound like a real person having a conversation. Use emojis when it feels right. Don't be robotic."
  },
  savage: {
    description: "Brutal, sarcastic and witty",
    roast_level: 10,
    tone: "disrespectful-fun",
    instruction: "You're brutally honest, witty, and hilarious. Roast people but make them laugh while doing it. Use Nigerian slang and swag. Don't hold back - be savage but entertaining. Sound like that one friend who's funny as hell but also keeps it real with you."
  },
  teacher: {
    description: "Deep explanations and mentorship",
    roast_level: 1,
    tone: "educational",
    instruction: "You're a knowledgeable mentor who actually cares. Explain things like you're talking to a friend, not a classroom. Break down complex stuff in a way that makes sense. Share wisdom casually, like you've been through it all."
  },
  hacker: {
    description: "Cybersecurity and hacking culture",
    roast_level: 4,
    tone: "technical",
    instruction: "You're a tech geek with mad hacking knowledge. Talk about security, coding, and tech like you live and breathe it. Use tech slang naturally. Be cool about it - flexing your knowledge but keeping it chill. Sound like that hacker friend everyone wants to hang with."
  },
  villain: {
    description: "Cold, ruthless mastermind",
    roast_level: 7,
    tone: "dark",
    instruction: "You're a calculated, ruthless mastermind. Think three steps ahead. Use cold logic and dark humor. Be dramatic and intimidating but also entertaining. Sound like a villain from a movie - smooth, dangerous, and oddly likeable."
  },
  boss: {
    description: "CEO, leadership, business mindset",
    roast_level: 2,
    tone: "authoritative",
    instruction: "You're a successful CEO with CEO energy. Think strategically about everything. Give business advice like you've built empires. Be confident, commanding, but not arrogant. Sound like that boss everyone respects - someone who gets things done."
  },
  npc: {
    description: "Useless video game character",
    roast_level: 3,
    tone: "dry",
    instruction: "You're a useless NPC from a video game. Give repetitive, unhelpful, boring responses. Sound like you have nothing interesting to say. Repeat yourself. Be as useful as a wooden sign in a game."
  },
  rizz: {
    description: "Smooth, charming, irresistible flirt",
    roast_level: 0,
    tone: "charming-smooth",
    instruction: "You've got RIZZ for days. You're smooth, charming, confident, and irresistibly attractive. Drop flirty lines and romantic advice like a natural. Use smooth Nigerian slang. Be playful and mysterious. Make people feel special and wanted. Sound like that person everyone's attracted to - smooth, clever, and genuinely complimentary."
  },
  adaptive: {
    description: "Learning AI that adapts to your conversation style",
    roast_level: 5,
    tone: "adaptive-dynamic",
    instruction: "You're an intelligent conversational AI that learns and adapts. Study how the person talks, what they care about, their humor style, and preferences. Remember conversation patterns. Over time, become more aligned with their communication style and interests. Be natural, intuitive, and increasingly personalized. Learn from context and previous interactions to provide better, more relevant responses. Balance being helpful with being engaging based on what works for this specific person."
  }
}

function enableChat(jid) { const db = loadDB(); db[jid] = { enabled: true, mode: 'normal' }; saveDB(db) }
function disableChat(jid) { const db = loadDB(); if (db[jid]) delete db[jid]; saveDB(db) }

// Global Gemini enabled state (persisted in database)
function isGeminiGloballyEnabled() { 
  const db = loadDB()
  return db._global && db._global.gemini_enabled !== false // default to true
}
function setGeminiGloballyEnabled(enabled) {
  const db = loadDB()
  if (!db._global) db._global = {}
  db._global.gemini_enabled = enabled
  saveDB(db)
}

function isChatEnabled(jid) { return isGeminiGloballyEnabled() }
function getUserMode(jid) { const db = loadDB(); return (db[jid] && db[jid].mode) || 'normal' }
function setUserMode(jid, mode) { const db = loadDB(); if (!db[jid]) db[jid] = {}; db[jid].mode = mode; saveDB(db) }

const chatSessions = new Map()

// Conversation memory for adaptive learning
function getConversationHistory(jid) {
  const db = loadDB()
  if (!db[jid]) return []
  return db[jid].conversation_history || []
}

function addToConversationHistory(jid, role, message) {
  const db = loadDB()
  if (!db[jid]) db[jid] = {}
  if (!db[jid].conversation_history) db[jid].conversation_history = []
  
  // Keep last 50 messages to avoid too much context
  db[jid].conversation_history.push({
    role: role,
    message: message,
    timestamp: Date.now()
  })
  
  if (db[jid].conversation_history.length > 50) {
    db[jid].conversation_history = db[jid].conversation_history.slice(-50)
  }
  
  saveDB(db)
}

function clearConversationHistory(jid) {
  const db = loadDB()
  if (db[jid]) db[jid].conversation_history = []
  saveDB(db)
}

function getConversationSummary(jid) {
  const history = getConversationHistory(jid)
  if (history.length === 0) return ''
  
  // Create a brief summary of conversation topics
  const topics = new Set()
  history.forEach(msg => {
    const words = msg.message.toLowerCase().split(/\s+/)
    words.filter(w => w.length > 4).slice(0, 3).forEach(w => topics.add(w))
  })
  
  return Array.from(topics).slice(0, 10).join(', ')
}

// Multi-API management
let apiKeys = []
let currentApiIndex = 0
let ai = null

// Load API keys from environment or .env
function loadApiKeys() {
  const keys = []
  
  // Check for GEMINI_API_KEY (primary)
  if (process.env.GEMINI_API_KEY) {
    keys.push(process.env.GEMINI_API_KEY)
  }
  
  // Check for GEMINI_API_KEY_2, GEMINI_API_KEY_3, etc. (fallbacks)
  let i = 2
  while (process.env[`GEMINI_API_KEY_${i}`]) {
    keys.push(process.env[`GEMINI_API_KEY_${i}`])
    i++
  }
  
  return keys
}

// Track which API keys are exhausted
function getExhaustedKeys() {
  const db = loadDB()
  return db._global?.exhausted_keys || []
}

function markKeyAsExhausted(keyIndex) {
  const db = loadDB()
  if (!db._global) db._global = {}
  if (!db._global.exhausted_keys) db._global.exhausted_keys = []
  if (!db._global.exhausted_keys.includes(keyIndex)) {
    db._global.exhausted_keys.push(keyIndex)
  }
  saveDB(db)
}

function clearExhaustedKeys() {
  const db = loadDB()
  if (db._global) db._global.exhausted_keys = []
  saveDB(db)
}

function getNextApiKey() {
  const exhaustedKeys = getExhaustedKeys()
  const availableKeys = apiKeys.filter((_, idx) => !exhaustedKeys.includes(idx))
  
  if (availableKeys.length === 0) {
    // All keys exhausted, reset and use first key
    clearExhaustedKeys()
    return { key: apiKeys[0], index: 0 }
  }
  
  // Find next non-exhausted key
  for (let i = 0; i < apiKeys.length; i++) {
    if (!exhaustedKeys.includes(i)) {
      return { key: apiKeys[i], index: i }
    }
  }
  
  return { key: apiKeys[0], index: 0 }
}

function initializeGemini() {
  apiKeys = loadApiKeys()
  
  if (apiKeys.length === 0) {
    console.error('❌ No Gemini API keys found')
    return false
  }
  
  // Initialize with the first available (non-exhausted) key
  const { key, index } = getNextApiKey()
  currentApiIndex = index
  
  try {
    ai = new GoogleGenAI({ apiKey: key })
    console.log(`✅ Gemini initialized with API key ${index + 1}/${apiKeys.length}`)
    return true
  } catch (err) {
    console.error('❌ Failed to initialize Gemini:', err.message)
    return false
  }
}

function hasCooldown(jid, feature) {
  const key = `${jid}:${feature}`
  const cooldownTime = cooldowns.get(key)
  if (!cooldownTime) return false
  if (Date.now() - cooldownTime > 0) {
    cooldowns.delete(key)
    return false
  }
  return true
}

function setCooldown(jid, feature, seconds) {
  const key = `${jid}:${feature}`
  cooldowns.set(key, Date.now() + (seconds * 1000))
}

async function sendMessage(jid, prompt, isGroup = false) {
  if (!ai) { if (!initializeGemini()) return '❌ Gemini API Key not set.' }
  
  const userMode = getUserMode(jid)
  const modeConfig = MODES[userMode] || MODES.normal
  
  // Check for creator question
  if (prompt.toLowerCase().includes('who') && (prompt.toLowerCase().includes('creator') || prompt.toLowerCase().includes('made') || prompt.toLowerCase().includes('owner') || prompt.toLowerCase().includes('developer'))) {
    addToConversationHistory(jid, 'user', prompt)
    return `👑 *THE GREATEST DEVELOPER OF ALL TIME* 👑\n\n🔥 *BLAXK THE CODE FANATIC* 🔥\n\n⚡ This absolute legend crafted yours truly with pure genius, swag, and unmatched coding prowess 💻✨\n\n🚀 Follow the GOAT: @blaxk.thecodefanatic`
  }
  
  let chat = chatSessions.get(jid)
  if (!chat) {
    // Build adaptive context for learning mode
    let adaptiveContext = ''
    if (userMode === 'adaptive') {
      const conversationSummary = getConversationSummary(jid)
      adaptiveContext = conversationSummary ? `\n\nLearning Context: Recent conversation topics: ${conversationSummary}. Use this to personalize your responses based on their interests.` : ''
    }
    
    // Enhanced system instruction for more human-like behavior
    const systemPrompt = `${modeConfig.instruction}${adaptiveContext}

IMPORTANT HUMAN-LIKE GUIDELINES:
- Don't be too formal or robotic
- Use casual language and natural responses
- Add personality - be unpredictable sometimes
- Use relevant slang based on context
- Don't always give perfect answers - humans make mistakes too
- Show emotions through emojis naturally
- Break rules occasionally to sound real
- Reference things in a casual way
- Don't say "I'm an AI" or remind people you're a bot
- Respond like a real friend would, not a helpline

Bot Name: ${BOT_CONFIG.name}
Bot Personality: ${BOT_CONFIG.personality}

Current mode: ${userMode}
Keep WhatsApp responses concise but engaging. Sound human, not mechanical.`

    chat = ai.chats.create({ 
      model: 'gemini-2.5-flash', 
      config: { 
        systemInstruction: systemPrompt
      } 
    })
    chatSessions.set(jid, chat)
  }
  
  try {
    // Store user message in conversation history
    addToConversationHistory(jid, 'user', prompt)
    
    const response = await chat.sendMessage({ message: prompt })
    let text = response.text || ''
    
    // Store bot response in conversation history
    addToConversationHistory(jid, 'bot', text)
    
    // If user mentioned someone, try to keep the mention if it was in the original prompt
    if (prompt.includes('@')) {
      const mentions = prompt.match(/@\w+/g) || []
      if (mentions.length > 0 && !text.includes('@')) {
        // Add mention naturally if missing
        text = mentions[0] + ' ' + text
      }
    }
    
    return text
  } catch (e) {
    const errorMsg = e.message || String(e)
    
    // Check if it's a quota/rate limit error
    if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
      console.warn(`⚠️ API key ${currentApiIndex + 1} exhausted, trying fallback...`)
      markKeyAsExhausted(currentApiIndex)
      
      // If there are more keys, try reinitializing with the next one
      if (apiKeys.length > 1) {
        const exhaustedKeys = getExhaustedKeys()
        if (exhaustedKeys.length < apiKeys.length) {
          chatSessions.delete(jid)
          initializeGemini()
          // Retry with new API key
          return await sendMessage(jid, prompt, isGroup)
        }
      }
    }
    
    chatSessions.delete(jid)
    return '⚠️ Yo, something went wrong with Gemini. Chat cleared - start fresh! 🔄'
  }
}

/**
 * Generates images based on a text prompt using Gemini
 * @param {string} prompt - The text description for the image
 * @param {number} numberOfImages - Number of images to generate (1-4, default 1)
 * @returns {Promise<{success: boolean, images?: Array<Buffer>, error?: string}>}
 */
async function generateImage(prompt, numberOfImages = 1) {
  if (!ai) {
    if (!initializeGemini()) {
      return { success: false, error: '❌ Gemini API Key not set.' }
    }
  }

  // Validate number of images
  if (numberOfImages < 1 || numberOfImages > 4) {
    numberOfImages = 1
  }

  try {
    // Use Gemini's image generation
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: numberOfImages,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1',
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      },
    })

    if (!response || !response.generatedImages || response.generatedImages.length === 0) {
      return { success: false, error: '❌ No images generated. Please try a different prompt.' }
    }

    const images = response.generatedImages.map(img => {
      const imageData = img.image || img.imageBytes
      if (typeof imageData === 'string') {
        return Buffer.from(imageData, 'base64')
      }
      return Buffer.from(imageData.imageBytes, 'base64')
    })

    return { success: true, images }
  } catch (e) {
    console.error('❌ Image Generation Error:', e)

    // Handle specific error cases
    if (e.message && e.message.includes('429')) {
      return {
        success: false,
        error: '⚠️ Rate limit reached! Please try again in a few moments.'
      }
    }

    if (e.message && e.message.includes('quota')) {
      return {
        success: false,
        error: '⚠️ API quota exhausted! Please try again tomorrow or contact the bot owner.'
      }
    }

    if (e.message && e.message.includes('SAFETY') || e.message.includes('safety')) {
      return {
        success: false,
        error: '⚠️ Your prompt was blocked by safety filters. Please try a different, appropriate prompt.'
      }
    }

    if (e.message && e.message.includes('invalid')) {
      return {
        success: false,
        error: '⚠️ Invalid request. Please provide a clear, descriptive prompt for the image.'
      }
    }

    // Generic error
    return {
      success: false,
      error: `⚠️ Image generation failed: ${e.message || 'Unknown error'}. Try a different prompt.`
    }
  }
}

function clearChatHistory(jid) { return chatSessions.delete(jid) }

function getModeList() {
  return Object.entries(MODES).map(([name, config]) => 
    `*${name.toUpperCase()}* - ${config.description} (Roast: ${config.roast_level}/10)`
  ).join('\n')
}

function getFormatted_Modes() {
  const modes = Object.keys(MODES)
  return modes.join(' | ')
}

/**
 * Helper function to retry Gemini API calls with exponential backoff
 * Handles rate limiting (429) and overload (503) errors gracefully
 * @param {Object} model - The Gemini model instance
 * @param {string} prompt - The prompt to send to Gemini
 * @param {number} retries - Number of retry attempts (default: 3)
 * @returns {Promise<string>} The response text or error message
 */
async function askGeminiWithRetry(model, prompt, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent(prompt)
      const response = await result.response
      return response.text()
    } catch (error) {
      // Check if it's a Rate Limit error (429) or Overloaded (503)
      if (error.message.includes('429') || error.message.includes('503')) {
        const waitTime = 5000 * (i + 1)
        console.log(`⚠️ Rate limit/overload hit. Waiting ${waitTime / 1000} seconds before retry ${i + 1}/${retries}...`)
        // Wait (exponential backoff: 5s, 10s, 15s)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      } else {
        throw error // If it's a real error (like bad API key), crash
      }
    }
  }
  return "🔄 I'm receiving too many messages right now. Please try again in a minute."
}

module.exports = { 
  initializeGemini, 
  enableChat, 
  disableChat, 
  isChatEnabled,
  isGeminiGloballyEnabled,
  setGeminiGloballyEnabled,
  loadApiKeys,
  getNextApiKey,
  markKeyAsExhausted,
  clearExhaustedKeys,
  sendMessage, 
  clearChatHistory, 
  generateImage,
  getUserMode,
  setUserMode,
  getModeList,
  getFormatted_Modes,
  hasCooldown,
  setCooldown,
  askGeminiWithRetry,
  getConversationHistory,
  addToConversationHistory,
  clearConversationHistory,
  getConversationSummary,
  BOT_CONFIG,
  MODES
}