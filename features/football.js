const axios = require('axios');

const API_KEY = 'cafc9122d48fdeb98c70b2caa834045b';
const BASE_URL = 'https://v3.football.api-sports.io';

// Helper: Make API request with timeout
async function fetchFootballAPI(endpoint, params = {}) {
    try {
        const response = await axios.get(`${BASE_URL}/${endpoint}`, {
            headers: { 'x-apisports-key': API_KEY },
            params,
            timeout: 10000
        });
        
        // Check for account suspension or errors
        if (response.data.errors && Object.keys(response.data.errors).length > 0) {
            const errorMsg = Object.values(response.data.errors).join(' | ');
            throw new Error(errorMsg);
        }
        
        return response.data;
    } catch (error) {
        throw new Error(`API Error: ${error.message}`);
    }
}

// Format current date as YYYY-MM-DD
function getTodayDate() {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

// ==================== MAIN HANDLER ====================
async function handleFootballCommand(args) {
    if (args.length === 0) {
        return getFootballHelp();
    }

    const subcommand = args[0].toLowerCase();
    const params = args.slice(1);

    try {
        switch (subcommand) {
            case 'help':
                return getFootballHelp();
            
            case 'leagues':
                return await getLeagues();
            
            case 'fixtures':
                return await getFixtures(params);
            
            case 'today':
                return await getTodayMatches();
            
            case 'live':
                return await getLiveMatches();
            
            case 'standings':
                return await getStandings(params);
            
            case 'team':
                return await getTeamInfo(params);
            
            case 'players':
                return await getSquad(params);
            
            case 'h2h':
                return await getHeadToHead(params);
            
            case 'scorers':
                return await getTopScorers(params);
            
            case 'next':
                return await getNextFixtures(params);
            
            case 'results':
                return await getResults(params);
            
            default:
                return `❌ Unknown subcommand: ${subcommand}\n\n${getFootballHelp()}`;
        }
    } catch (error) {
        return `⚠️ Error: ${error.message}`;
    }
}

// ==================== SUBCOMMANDS ====================

function getFootballHelp() {
    return `⚽ *FOOTBALL COMMANDS*

📋 *Available Subcommands:*

1. ${'.football help'} - Show this menu
2. ${'.football leagues'} - List all leagues
3. ${'.football fixtures <league_id> <season>'} - League fixtures
4. ${'.football today'} - Today's matches
5. ${'.football live'} - Currently live matches
6. ${'.football standings <league_id> <season>'} - League table
7. ${'.football team <team_id>'} - Team info
8. ${'.football players <team_id> <season>'} - Team squad
9. ${'.football h2h <team1_id> <team2_id>'} - Head-to-head
10. ${'.football scorers <league_id> <season>'} - Top scorers
11. ${'.football next <team_id>'} - Next 5 fixtures
12. ${'.football results <league_id> <season>'} - Past results

📌 *Example Usage:*
• ${'.football leagues'}
• ${'.football fixtures 39 2024'}
• ${'.football standings 39 2024'}
• ${'.football team 33'}`;
}

async function getLeagues() {
    const data = await fetchFootballAPI('leagues');
    if (!data.response || data.response.length === 0) {
        return '❌ No leagues found';
    }

    const leagues = data.response.slice(0, 20);
    const text = leagues
        .map(l => `🏆 ${l.league.name} (${l.country.name}) - ID: ${l.league.id}`)
        .join('\n');

    return `*FOOTBALL LEAGUES*\n\n${text}\n\n📌 Use league ID with other commands`;
}

async function getFixtures(params) {
    if (params.length < 2) {
        return `❌ Missing parameters\n\n📝 Usage: ${'.football fixtures <league_id> <season>'}`;
    }

    const [leagueId, season] = params;
    const data = await fetchFootballAPI('fixtures', {
        league: leagueId,
        season: season
    });

    if (!data.response || data.response.length === 0) {
        return '❌ No fixtures found for this league';
    }

    const fixtures = data.response.slice(0, 10);
    const text = fixtures
        .map(f => {
            const date = new Date(f.fixture.date).toLocaleDateString();
            const home = f.teams.home.name;
            const away = f.teams.away.name;
            const status = f.fixture.status.short;
            return `⚽ ${home} vs ${away}\n📅 ${date} | 🏁 ${status}`;
        })
        .join('\n\n');

    return `*LEAGUE FIXTURES*\n\n${text}`;
}

async function getTodayMatches() {
    const today = getTodayDate();
    const data = await fetchFootballAPI('fixtures', {
        date: today
    });

    if (!data.response || data.response.length === 0) {
        return '❌ No matches scheduled for today';
    }

    const matches = data.response;
    const text = matches
        .map(m => {
            const league = m.league.name;
            const home = m.teams.home.name;
            const away = m.teams.away.name;
            const status = m.fixture.status.short;
            const time = new Date(m.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `⚽ [${league}]\n${home} vs ${away}\n🕐 ${time} | ${status}`;
        })
        .join('\n\n');

    return `*TODAY'S MATCHES - ${today}*\n\n${text}`;
}

async function getLiveMatches() {
    const data = await fetchFootballAPI('fixtures', {
        live: 'all'
    });

    if (!data.response || data.response.length === 0) {
        return '❌ No live matches at the moment';
    }

    const matches = data.response;
    const text = matches
        .map(m => {
            const league = m.league.name;
            const home = m.teams.home.name;
            const homeGoals = m.goals.home;
            const away = m.teams.away.name;
            const awayGoals = m.goals.away;
            const status = m.fixture.status.short;
            return `🔴 *LIVE* [${league}]\n${home} *${homeGoals} - ${awayGoals}* ${away}\n${status}`;
        })
        .join('\n\n');

    return `*🔴 LIVE MATCHES*\n\n${text}`;
}

async function getStandings(params) {
    if (params.length < 2) {
        return `❌ Missing parameters\n\n📝 Usage: ${'.football standings <league_id> <season>'}`;
    }

    const [leagueId, season] = params;
    const data = await fetchFootballAPI('standings', {
        league: leagueId,
        season: season
    });

    if (!data.response || data.response.length === 0) {
        return '❌ No standings found';
    }

    const standings = data.response[0].league.standings[0].slice(0, 10);
    const text = standings
        .map(s => `${s.rank}. ${s.team.name} - ${s.points} PTS (${s.all.played}P)`)
        .join('\n');

    return `*LEAGUE STANDINGS*\n\n${text}`;
}

async function getTeamInfo(params) {
    if (params.length === 0) {
        return `❌ Missing parameter\n\n📝 Usage: ${'.football team <team_id>'}`;
    }

    const teamId = params[0];
    const data = await fetchFootballAPI('teams', {
        id: teamId
    });

    if (!data.response || data.response.length === 0) {
        return '❌ Team not found';
    }

    const team = data.response[0];
    const info = `
*${team.team.name}*

🌍 Country: ${team.team.country}
🏟️ Stadium: ${team.venue?.name || 'N/A'}
📅 Founded: ${team.team.founded || 'N/A'}
🔗 ID: ${team.team.id}
`.trim();

    return info;
}

async function getSquad(params) {
    if (params.length < 2) {
        return `❌ Missing parameters\n\n📝 Usage: ${'.football players <team_id> <season>'}`;
    }

    const [teamId, season] = params;
    const data = await fetchFootballAPI('players', {
        team: teamId,
        season: season
    });

    if (!data.response || data.response.length === 0) {
        return '❌ No squad data found';
    }

    const players = data.response.slice(0, 15);
    const text = players
        .map(p => {
            const name = p.player.name;
            const pos = p.statistics[0]?.games?.position || 'N/A';
            const age = p.player.age || 'N/A';
            const nat = p.player.nationality || 'N/A';
            return `${name} - ${pos} (${age}y) ${nat}`;
        })
        .join('\n');

    return `*TEAM SQUAD*\n\n${text}`;
}

async function getHeadToHead(params) {
    if (params.length < 2) {
        return `❌ Missing parameters\n\n📝 Usage: ${'.football h2h <team1_id> <team2_id>'}`;
    }

    const [team1, team2] = params;
    const data = await fetchFootballAPI('fixtures', {
        h2h: `${team1}-${team2}`
    });

    if (!data.response || data.response.length === 0) {
        return '❌ No head-to-head data found';
    }

    const matches = data.response.slice(0, 5);
    const text = matches
        .map(m => {
            const date = new Date(m.fixture.date).toLocaleDateString();
            const home = m.teams.home.name;
            const homeGoals = m.goals.home;
            const away = m.teams.away.name;
            const awayGoals = m.goals.away;
            const winner = homeGoals > awayGoals ? home : awayGoals > homeGoals ? away : 'Draw';
            return `${date}: ${home} ${homeGoals} - ${awayGoals} ${away}\n🏆 ${winner}`;
        })
        .join('\n\n');

    return `*HEAD-TO-HEAD LAST 5 MATCHES*\n\n${text}`;
}

async function getTopScorers(params) {
    if (params.length < 2) {
        return `❌ Missing parameters\n\n📝 Usage: ${'.football scorers <league_id> <season>'}`;
    }

    const [leagueId, season] = params;
    const data = await fetchFootballAPI('players/topscorers', {
        league: leagueId,
        season: season
    });

    if (!data.response || data.response.length === 0) {
        return '❌ No scorer data found';
    }

    const scorers = data.response.slice(0, 10);
    const text = scorers
        .map((p, i) => {
            const name = p.player.name;
            const club = p.statistics[0]?.team?.name || 'N/A';
            const goals = p.statistics[0]?.goals?.total || 0;
            return `${i + 1}. ${name} (${club}) - ${goals} goals`;
        })
        .join('\n');

    return `*TOP SCORERS*\n\n${text}`;
}

async function getNextFixtures(params) {
    if (params.length === 0) {
        return `❌ Missing parameter\n\n📝 Usage: ${'.football next <team_id>'}`;
    }

    const teamId = params[0];
    const data = await fetchFootballAPI('fixtures', {
        team: teamId,
        next: 5
    });

    if (!data.response || data.response.length === 0) {
        return '❌ No upcoming fixtures found';
    }

    const fixtures = data.response;
    const text = fixtures
        .map(f => {
            const date = new Date(f.fixture.date).toLocaleDateString();
            const home = f.teams.home.name;
            const away = f.teams.away.name;
            const league = f.league.name;
            return `⚽ ${home} vs ${away}\n📅 ${date} [${league}]`;
        })
        .join('\n\n');

    return `*NEXT 5 FIXTURES*\n\n${text}`;
}

async function getResults(params) {
    if (params.length < 2) {
        return `❌ Missing parameters\n\n📝 Usage: ${'.football results <league_id> <season>'}`;
    }

    const [leagueId, season] = params;
    const data = await fetchFootballAPI('fixtures', {
        league: leagueId,
        season: season,
        status: 'FT'
    });

    if (!data.response || data.response.length === 0) {
        return '❌ No finished matches found';
    }

    const results = data.response.slice(0, 10);
    const text = results
        .map(m => {
            const date = new Date(m.fixture.date).toLocaleDateString();
            const home = m.teams.home.name;
            const homeGoals = m.goals.home;
            const away = m.teams.away.name;
            const awayGoals = m.goals.away;
            return `${home} ${homeGoals} - ${awayGoals} ${away} (${date})`;
        })
        .join('\n');

    return `*FINISHED MATCHES*\n\n${text}`;
}

module.exports = {
    handleFootballCommand,
    getFootballHelp
};
