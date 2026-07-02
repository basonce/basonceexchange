const axios = require('axios');
const logger = require('../config/logger');

const FD_BASE = 'https://api.football-data.org/v4';
const FD_KEY  = process.env.FOOTBALL_DATA_API_KEY;

const cache = new Map();
const CACHE_TTL = 60_000;

const isFresh = (ts) => Date.now() - ts < CACHE_TTL;

const client = axios.create({
  baseURL: FD_BASE,
  headers: { 'X-Auth-Token': FD_KEY },
  timeout: 8000,
});

const getMatch = async (matchId) => {
  if (cache.has(matchId) && isFresh(cache.get(matchId).ts)) {
    return cache.get(matchId).data;
  }

  const { data } = await client.get(`/matches/${matchId}`);
  const m = data;

  const result = {
    id:         m.id,
    status:     m.status,
    homeTeam:   m.homeTeam?.name,
    awayTeam:   m.awayTeam?.name,
    kickoff:    m.utcDate,
    homeScore:  m.score?.fullTime?.home,
    awayScore:  m.score?.fullTime?.away,
    winner: m.score?.winner,
  };

  cache.set(matchId, { data: result, ts: Date.now() });
  return result;
};

const getMatchesByCompetition = async (competitionCode, status = null) => {
  const cacheKey = `comp:${competitionCode}:${status || 'all'}`;
  if (cache.has(cacheKey) && isFresh(cache.get(cacheKey).ts)) {
    return cache.get(cacheKey).data;
  }

  const params = status ? { status } : {};
  const { data } = await client.get(`/competitions/${competitionCode}/matches`, { params });

  const matches = (data.matches || []).map((m) => ({
    id:        m.id,
    status:    m.status,
    homeTeam:  m.homeTeam?.name,
    awayTeam:  m.awayTeam?.name,
    kickoff:   m.utcDate,
    homeScore: m.score?.fullTime?.home,
    awayScore: m.score?.fullTime?.away,
    winner:    m.score?.winner,
  }));

  cache.set(cacheKey, { data: matches, ts: Date.now() });
  return matches;
};

const deriveOutcome = (match) => {
  if (match.status !== 'FINISHED') return null;
  if (match.winner === 'HOME_TEAM') return 'home';
  if (match.winner === 'AWAY_TEAM') return 'away';
  if (match.winner === 'DRAW')
    return 'draw';
  if (typeof match.homeScore === 'number' && typeof match.awayScore === 'number') {
    if (match.homeScore > match.awayScore) return 'home';
    if (match.awayScore > match.homeScore) return 'away';
    return 'draw';
  }
  return null;
};

module.exports = { getMatch, getMatchesByCompetition, deriveOutcome };
