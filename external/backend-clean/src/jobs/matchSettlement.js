const { query, transaction } = require('../config/database');
const football = require('../services/footballService');
const walletService = require('../services/walletService');
const logger = require('../config/logger');

const settleBet = async (bet, match) => {
  const outcome = football.deriveOutcome(match);
  if (!outcome)
    return;

  const won = bet.pick === outcome;
  const newStatus = won ? 'won' : 'lost';

  try {
    await transaction(async (conn) => {
      const [updated] = await conn.execute(
        `UPDATE match_bets
         SET status = ?, result = ?, settled_at = NOW(), updated_at = NOW()
         WHERE id = ? AND status = 'pending'`,
        [newStatus, outcome, bet.id]
      );

      if (updated.affectedRows === 0)
        return;

      if (won) {
        await walletService.creditBalance(
          conn, bet.user_id, parseFloat(bet.potential_payout), 'trade_sell', 'match_bet', bet.id,
          `Won bet: ${bet.pick.toUpperCase()} | ${bet.home_team} ${match.homeScore}-${match.awayScore} ${bet.away_team}`
        );
      }
    });

    logger.info(`[match-settlement] Bet ${bet.id} settled: ${newStatus} (pick=${bet.pick}, result=${outcome})`);
  } catch (err) {
    logger.error(`[match-settlement] Failed to settle bet ${bet.id}: ${err.message}`);
  }
};

const runSettlement = async () => {
  try {
    const pendingBets = await query("SELECT * FROM match_bets WHERE status = 'pending'");
    if (!pendingBets.length)
      return;

    const byMatch = {};
    for (const bet of pendingBets) {
      if (!byMatch[bet.match_id]) byMatch[bet.match_id] = [];
      byMatch[bet.match_id].push(bet);
    }

    for (const [matchId, bets] of Object.entries(byMatch)) {
      let match;
      try {
        match = await football.getMatch(matchId);
      } catch (err) {
        logger.warn(`[match-settlement] Could not fetch match ${matchId}: ${err.message}`);
        continue;
      }

      if (match.status !== 'FINISHED')
        continue;

      for (const bet of bets) {
        await settleBet(bet, match);
      }
    }
  } catch (err) {
    logger.error('[match-settlement] runSettlement error:', err.message);
  }
};

const start = () => {
  logger.info('[match-settlement] Settlement job started (interval: 60s)');
  setInterval(runSettlement, 60_000);
  runSettlement();
};

module.exports = { start, runSettlement };
