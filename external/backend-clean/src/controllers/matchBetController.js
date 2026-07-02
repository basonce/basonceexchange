const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../config/database');
const football = require('../services/footballService');
const walletService = require('../services/walletService');
const logger = require('../config/logger');

const MIN_STAKE = 1;
const MAX_STAKE = 1000;

exports.placeBet = async (req, res) => {
  try {
    const userId = req.user.id;
    const { match_id, pick, stake_usdt, odds = 1.9 } = req.body;

    if (!match_id) {
      return res.status(400).json({ success: false, message: 'match_id is required' });
    }
    if (!['home', 'draw', 'away'].includes(pick)) {
      return res.status(400).json({ success: false, message: "pick must be 'home', 'draw', or 'away'" });
    }
    const stake = parseFloat(stake_usdt);
    if (!stake || stake < MIN_STAKE || stake > MAX_STAKE) {
      return res.status(400).json({ success: false, message: `Stake must be between ${MIN_STAKE} and ${MAX_STAKE} USDT` });
    }

    let match;
    try {
      match = await football.getMatch(match_id);
    } catch (err) {
      logger.error('footballService.getMatch error:', err.message);
      return res.status(503).json({ success: false, message: 'Could not fetch match data. Try again.' });
    }

    if (!match || !match.homeTeam) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }
    if (['FINISHED', 'IN_PLAY', 'PAUSED'].includes(match.status)) {
      return res.status(400).json({ success: false, message: 'Match already started or finished — cannot place bet' });
    }

    const oddsVal = parseFloat(odds);
    const potentialPayout = parseFloat((stake * oddsVal).toFixed(8));
    const betId = uuidv4();

    await transaction(async (conn) => {
      await walletService.debitBalance(
        conn, userId, stake, 'trade_buy', 'match_bet', betId,
        `Bet ${pick.toUpperCase()} on ${match.homeTeam} vs ${match.awayTeam}`
      );

      await conn.execute(
        `INSERT INTO match_bets
          (id, user_id, match_id, home_team, away_team, kickoff_at, pick, stake_usdt, odds, potential_payout, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [betId, userId, String(match_id), match.homeTeam, match.awayTeam, match.kickoff, pick, stake, oddsVal, potentialPayout]
      );
    });

    res.status(201).json({
      success: true,
      message: 'Bet placed',
      data: {
        bet_id: betId,
        match: `${match.homeTeam} vs ${match.awayTeam}`,
        kickoff: match.kickoff,
        pick,
        stake_usdt: stake,
        odds: oddsVal,
        potential_payout: potentialPayout,
        status: 'pending',
      },
    });
  } catch (err) {
    if (err.message === 'Insufficient balance') {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }
    logger.error('placeBet error:', err);
    res.status(500).json({ success: false, message: 'Failed to place bet' });
  }
};

exports.getUpcomingMatches = async (req, res) => {
  try {
    const competition = (req.params.competition || 'PL').toUpperCase();
    const matches = await football.getMatchesByCompetition(competition, 'SCHEDULED,TIMED');
    res.json({ success: true, data: matches });
  } catch (err) {
    logger.error('getUpcomingMatches error:', err.message);
    res.status(503).json({ success: false, message: 'Could not fetch upcoming matches' });
  }
};

exports.getMyBets = async (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM match_bets WHERE user_id = ?';
    const params = [req.user.id];
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC LIMIT 100';

    const bets = await query(sql, params);
    res.json({ success: true, data: bets });
  } catch (err) {
    logger.error('getMyBets error:', err);
    res.status(500).json({ success: false, message: 'Failed to get bets' });
  }
};

exports.getBet = async (req, res) => {
  try {
    const [bet] = await query(
      'SELECT * FROM match_bets WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!bet) return res.status(404).json({ success: false, message: 'Bet not found' });
    res.json({ success: true, data: bet });
  } catch (err) {
    logger.error('getBet error:', err);
    res.status(500).json({ success: false, message: 'Failed to get bet' });
  }
};
