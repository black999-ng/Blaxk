const axios = require('axios')

const API_KEY = 'cafc9122d48fdeb98c70b2caa834045b'
const BASE_URL = 'https://v3.football.api-sports.io/'

// Supported endpoints mapping
const endpoints = {
  fixtures: 'fixtures',
  status: 'status',
  timezone: 'timezone',
  countries: 'countries',
  leagues: 'leagues',
  'leagues/seasons': 'leagues/seasons',
  teams: 'teams',
  'teams/statistics': 'teams/statistics',
  'teams/seasons': 'teams/seasons',
  'teams/countries': 'teams/countries',
  venues: 'venues',
  standings: 'standings',
  coachs: 'coachs',
  players: 'players',
  'players/seasons': 'players/seasons',
  'players/profiles': 'players/profiles',
  'players/statistics': 'players/statistics',
  'players/teams': 'players/teams',
  'players/squads': 'players/squads',
  'players/topscorers': 'players/topscorers',
  'players/topassists': 'players/topassists',
  'players/topyellowcards': 'players/topyellowcards',
  'players/topredcards': 'players/topredcards',
  injuries: 'injuries',
  transfers: 'transfers',
  trophies: 'trophies',
}

// Main football command handler
async function footballCommand(cmd, args = []) {
  let endpoint = endpoints[cmd]
  if (!endpoint) {
    return `❌ Unknown football command: ${cmd}`
  }

  let url = BASE_URL + endpoint
  // Add query params if needed (e.g., for teams, players, etc.)
  if (args.length > 0) {
    url += '?' + args.map(a => a).join('&')
  }

  try {
    const response = await axios.get(url, {
      headers: {
        'x-apisports-key': API_KEY
      }
    })
    return formatFootballResponse(cmd, response.data)
  } catch (error) {
    return `⚠️ Error fetching football data: ${error.message}`
  }
}

// Format response for WhatsApp
function formatFootballResponse(cmd, data) {
  // Basic formatter, customize per endpoint
  if (!data || !data.response) return 'No data found.'
  switch (cmd) {
    case 'leagues':
      return data.response.map(l => `🏆 ${l.league.name} (${l.country.name})`).join('\n')
    case 'fixtures':
      return data.response.slice(0, 5).map(f => `⚽ ${f.teams.home.name} vs ${f.teams.away.name} - ${f.fixture.date}`).join('\n')
    case 'standings':
      return data.response[0]?.league?.standings[0]?.map(s => `${s.rank}. ${s.team.name} (${s.points} pts)`).join('\n') || 'No standings.'
    case 'players/topscorers':
      return data.response.map(p => `🥇 ${p.player.name} (${p.statistics[0].goals.total} goals)`).join('\n')
    case 'teams':
      return data.response.map(t => `👕 ${t.team.name} (${t.team.country})`).join('\n')
    default:
      return JSON.stringify(data.response, null, 2).slice(0, 2000) // Truncate for WhatsApp
  }
}

module.exports = {
  footballCommand,
  endpoints,
  formatFootballResponse
}
