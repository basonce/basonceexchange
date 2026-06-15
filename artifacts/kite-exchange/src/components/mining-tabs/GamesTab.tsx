import { useState, useEffect } from 'react';
import { TrendingUp, Clock, Trophy, Coins, AlertCircle } from 'lucide-react';
import { supabase, getCurrentUser } from '../../lib/supabase';

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(num);
};

interface GameType {
  id: string;
  name: string;
  icon: string;
  min_bet: number;
  max_bet: number;
  house_edge: number;
  description: string;
}

interface GameStats {
  total_bets: number;
  total_wagered: number;
  total_won: number;
  total_profit: number;
  biggest_win: number;
  win_streak: number;
}

interface BigWin {
  username: string;
  avatar_url: string;
  game_name: string;
  game_icon: string;
  bet_amount: number;
  multiplier: number;
  payout: number;
  profit: number;
  created_at: string;
}

export default function GamesTab() {
  const [games, setGames] = useState<GameType[]>([]);
  const [userStats, setUserStats] = useState<GameStats | null>(null);
  const [bigWins, setBigWins] = useState<BigWin[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [betAmount, setBetAmount] = useState('10');
  const [isPlaying, setIsPlaying] = useState(false);
  const [eqBalance, setEqBalance] = useState(0);

  // Game-specific states
  const [coinChoice, setCoinChoice] = useState<'heads' | 'tails'>('heads');
  const [diceTarget, setDiceTarget] = useState(50);
  const [crashMultiplier, setCrashMultiplier] = useState(1.0);
  const [minesCount, setMinesCount] = useState(3);
  const [minesRevealed, setMinesRevealed] = useState<number[]>([]);

  // Game result
  const [gameResult, setGameResult] = useState<{
    won: boolean;
    payout: number;
    profit: number;
    multiplier: number;
    message: string;
  } | null>(null);

  useEffect(() => {
    loadGames();
    loadUserStats();
    loadBigWins();
    loadEqBalance();
  }, []);

  const loadGames = async () => {
    const demoGames: GameType[] = [
      {
        id: '1',
        name: 'Coin Flip',
        icon: '🪙',
        min_bet: 1,
        max_bet: 1000,
        house_edge: 2,
        description: 'Classic heads or tails'
      },
      {
        id: '2',
        name: 'Dice Roll',
        icon: '🎲',
        min_bet: 1,
        max_bet: 1000,
        house_edge: 2.5,
        description: 'Roll and win big'
      },
      {
        id: '3',
        name: 'Crash',
        icon: '🚀',
        min_bet: 1,
        max_bet: 5000,
        house_edge: 3,
        description: 'Cashout before crash'
      },
      {
        id: '4',
        name: 'Mines',
        icon: '💎',
        min_bet: 1,
        max_bet: 1000,
        house_edge: 2,
        description: 'Find diamonds, avoid mines'
      }
    ];
    setGames(demoGames);
  };

  const loadUserStats = async () => {
    setUserStats({
      total_bets: 0,
      total_wagered: 0,
      total_won: 0,
      total_profit: 0,
      biggest_win: 0,
      win_streak: 0
    });
  };

  const loadBigWins = async () => {
    const demoWins: BigWin[] = [
      {
        username: 'CryptoKing',
        avatar_url: 'https://i.pravatar.cc/150?img=12',
        game_name: 'Crash',
        game_icon: '🚀',
        bet_amount: 50,
        multiplier: 12.5,
        payout: 625,
        profit: 575,
        created_at: new Date().toISOString()
      },
      {
        username: 'DiamondHands',
        avatar_url: 'https://i.pravatar.cc/150?img=23',
        game_name: 'Mines',
        game_icon: '💎',
        bet_amount: 100,
        multiplier: 5.2,
        payout: 520,
        profit: 420,
        created_at: new Date().toISOString()
      }
    ];
    setBigWins(demoWins);
  };

  const loadEqBalance = async () => {
    const user = await getCurrentUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_balances')
      .select('eq_amount')
      .eq('user_id', user.id)
      .eq('symbol', 'USDT')
      .maybeSingle();

    if (data) setEqBalance(Number(data.eq_amount || 0));
  };

  const playCoinFlip = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    setGameResult(null);

    try {
      const bet = parseFloat(betAmount);
      if (bet < selectedGame!.min_bet || bet > selectedGame!.max_bet) {
        throw new Error(`Bet must be between ${selectedGame!.min_bet} and ${selectedGame!.max_bet} EQ`);
      }

      if (bet > eqBalance) {
        throw new Error('Insufficient EQ balance');
      }

      // Generate random result
      const result = Math.random() < 0.49 ? 'heads' : 'tails'; // 49% win chance (2% house edge)
      const won = result === coinChoice;
      const multiplier = won ? 1.96 : 0; // 2x with house edge
      const payout = won ? bet * multiplier : 0;
      const profit = payout - bet;

      // Update balance
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const newBalance = eqBalance - bet + payout;
      await supabase
        .from('user_balances')
        .update({ eq_amount: newBalance })
        .eq('user_id', user.id)
        .eq('symbol', 'USDT');

      console.log('Game played:', { bet, multiplier, payout, profit });

      setEqBalance(newBalance);
      setGameResult({
        won,
        payout,
        profit,
        multiplier,
        message: won ? `${result.toUpperCase()}! You won!` : `${result.toUpperCase()}! You lost!`
      });

      await loadUserStats();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsPlaying(false);
    }
  };

  const playDice = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    setGameResult(null);

    try {
      const bet = parseFloat(betAmount);
      if (bet < selectedGame!.min_bet || bet > selectedGame!.max_bet) {
        throw new Error(`Bet must be between ${selectedGame!.min_bet} and ${selectedGame!.max_bet} EQ`);
      }

      if (bet > eqBalance) {
        throw new Error('Insufficient EQ balance');
      }

      // Roll dice (1-100)
      const roll = Math.floor(Math.random() * 100) + 1;
      const won = roll > diceTarget;

      // Calculate multiplier based on target (higher target = higher multiplier)
      const winChance = (100 - diceTarget) / 100;
      const theoreticalMultiplier = (1 / winChance) * 0.975; // With 2.5% house edge
      const multiplier = won ? theoreticalMultiplier : 0;
      const payout = won ? bet * multiplier : 0;
      const profit = payout - bet;

      // Update balance
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const newBalance = eqBalance - bet + payout;
      await supabase
        .from('user_balances')
        .update({ eq_amount: newBalance })
        .eq('user_id', user.id)
        .eq('symbol', 'USDT');

      console.log('Dice played:', { bet, multiplier, payout, profit, roll });

      setEqBalance(newBalance);
      setGameResult({
        won,
        payout,
        profit,
        multiplier,
        message: `Rolled ${roll}! ${won ? 'You won!' : 'You lost!'}`
      });

      await loadUserStats();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsPlaying(false);
    }
  };

  const playCrash = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    setGameResult(null);

    try {
      const bet = parseFloat(betAmount);
      if (bet < selectedGame!.min_bet || bet > selectedGame!.max_bet) {
        throw new Error(`Bet must be between ${selectedGame!.min_bet} and ${selectedGame!.max_bet} EQ`);
      }

      if (bet > eqBalance) {
        throw new Error('Insufficient EQ balance');
      }

      // Generate crash point (with 3% house edge)
      const e = -Math.log(1 - Math.random() * 0.97);
      const crashPoint = Math.max(1.01, 100 / (100 - e * 100));

      // User's cashout point
      const cashoutMultiplier = parseFloat(crashMultiplier.toFixed(2));
      const won = crashPoint >= cashoutMultiplier;
      const multiplier = won ? cashoutMultiplier : 0;
      const payout = won ? bet * multiplier : 0;
      const profit = payout - bet;

      // Update balance
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const newBalance = eqBalance - bet + payout;
      await supabase
        .from('user_balances')
        .update({ eq_amount: newBalance })
        .eq('user_id', user.id)
        .eq('symbol', 'USDT');

      console.log('Crash played:', { bet, multiplier, payout, profit, crashPoint });

      setEqBalance(newBalance);
      setGameResult({
        won,
        payout,
        profit,
        multiplier,
        message: `Crashed at ${crashPoint.toFixed(2)}x! ${won ? 'You won!' : 'You lost!'}`
      });

      await loadUserStats();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsPlaying(false);
    }
  };

  const playMines = async (cellIndex: number) => {
    if (isPlaying) return;
    if (minesRevealed.includes(cellIndex)) return;

    // If first click, place bet
    if (minesRevealed.length === 0) {
      const bet = parseFloat(betAmount);
      if (bet < selectedGame!.min_bet || bet > selectedGame!.max_bet) {
        alert(`Bet must be between ${selectedGame!.min_bet} and ${selectedGame!.max_bet} EQ`);
        return;
      }

      if (bet > eqBalance) {
        alert('Insufficient EQ balance');
        return;
      }
    }

    setIsPlaying(true);

    try {
      // Generate mines (25 cells, user-selected number of mines)
      let minePositions: number[] = [];
      if (minesRevealed.length === 0) {
        const allPositions = Array.from({ length: 25 }, (_, i) => i);
        for (let i = 0; i < minesCount; i++) {
          const randomIndex = Math.floor(Math.random() * allPositions.length);
          minePositions.push(allPositions[randomIndex]);
          allPositions.splice(randomIndex, 1);
        }
        // Store in state (in real app, store server-side)
        (window as any).__minePositions = minePositions;
      } else {
        minePositions = (window as any).__minePositions || [];
      }

      const hitMine = minePositions.includes(cellIndex);
      const newRevealed = [...minesRevealed, cellIndex];
      setMinesRevealed(newRevealed);

      if (hitMine) {
        // Lost - hit a mine
        const bet = parseFloat(betAmount);
        const user = await getCurrentUser();
        if (!user) throw new Error('Not authenticated');

        const newBalance = eqBalance - bet;
        await supabase
          .from('user_balances')
          .update({ eq_balance: newBalance })
          .eq('user_id', user.id);

        console.log('Mines lost:', { bet, mines: minesCount });

        setEqBalance(newBalance);
        setGameResult({
          won: false,
          payout: 0,
          profit: -bet,
          multiplier: 0,
          message: 'BOOM! You hit a mine!'
        });

        await loadUserStats();
        setTimeout(() => setMinesRevealed([]), 2000);
      } else {
        // Safe - continue or cashout
        const safeRevealed = newRevealed.filter(i => !minePositions.includes(i));
        const multiplier = Math.pow(25 / (25 - minesCount), safeRevealed.length) * 0.98; // With 2% house edge

        setGameResult({
          won: true,
          payout: parseFloat(betAmount) * multiplier,
          profit: parseFloat(betAmount) * (multiplier - 1),
          multiplier: multiplier,
          message: `Safe! Current multiplier: ${multiplier.toFixed(2)}x`
        });
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsPlaying(false);
    }
  };

  const cashoutMines = async () => {
    if (minesRevealed.length === 0) return;

    try {
      const bet = parseFloat(betAmount);
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const safeRevealed = minesRevealed.length;
      const multiplier = Math.pow(25 / (25 - minesCount), safeRevealed) * 0.98;
      const payout = bet * multiplier;
      const profit = payout - bet;

      const newBalance = eqBalance - bet + payout;
      await supabase
        .from('user_balances')
        .update({ eq_amount: newBalance })
        .eq('user_id', user.id)
        .eq('symbol', 'USDT');

      console.log('Mines cashout:', { bet, multiplier, payout, profit });

      setEqBalance(newBalance);
      setGameResult({
        won: true,
        payout,
        profit,
        multiplier,
        message: `Cashed out at ${multiplier.toFixed(2)}x!`
      });

      await loadUserStats();
      setMinesRevealed([]);
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (selectedGame) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] pb-24">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#1a1f2e] to-[#0a0e1a] border-b border-gray-800 px-4 py-4">
          <button
            onClick={() => {
              setSelectedGame(null);
              setGameResult(null);
              setMinesRevealed([]);
            }}
            className="text-gray-400 hover:text-white mb-3"
          >
            ← Back to Games
          </button>
          <div className="flex items-center gap-3">
            <div className="text-4xl">{selectedGame.icon}</div>
            <div>
              <h2 className="text-2xl font-black text-white">{selectedGame.name}</h2>
              <p className="text-sm text-gray-400">{selectedGame.description}</p>
            </div>
          </div>
          <div className="mt-3 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Your EQ Balance:</span>
              <span className="text-white font-bold">{formatNumber(eqBalance)} EQ</span>
            </div>
          </div>
        </div>

        {/* Game Area */}
        <div className="max-w-md mx-auto px-4 py-6">
          {/* Game Result */}
          {gameResult && (
            <div className={`mb-4 p-4 rounded-xl border-2 ${
              gameResult.won
                ? 'bg-green-500/10 border-green-500'
                : 'bg-red-500/10 border-red-500'
            }`}>
              <div className="text-center">
                <div className={`text-2xl font-black mb-2 ${
                  gameResult.won ? 'text-green-400' : 'text-red-400'
                }`}>
                  {gameResult.message}
                </div>
                {gameResult.won && (
                  <div className="text-white">
                    <div className="text-xl font-bold">+{formatNumber(gameResult.profit)} EQ</div>
                    <div className="text-sm text-gray-400">{gameResult.multiplier.toFixed(2)}x multiplier</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Coin Flip Game */}
          {selectedGame.name === 'Coin Flip' && (
            <div className="space-y-4">
              <div className="bg-[#1a1f2e] rounded-xl p-6 border border-gray-800">
                <label className="text-sm text-gray-400 mb-2 block">Choose Side</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setCoinChoice('heads')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      coinChoice === 'heads'
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-3xl mb-2">👑</div>
                    <div className="text-white font-bold">HEADS</div>
                  </button>
                  <button
                    onClick={() => setCoinChoice('tails')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      coinChoice === 'tails'
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-3xl mb-2">🦅</div>
                    <div className="text-white font-bold">TAILS</div>
                  </button>
                </div>
              </div>

              <div className="bg-[#1a1f2e] rounded-xl p-6 border border-gray-800">
                <label className="text-sm text-gray-400 mb-2 block">Bet Amount (EQ)</label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="w-full bg-[#0a0e1a] text-white rounded-lg px-4 py-3 border border-gray-700"
                  min={selectedGame.min_bet}
                  max={selectedGame.max_bet}
                />
              </div>

              <button
                onClick={playCoinFlip}
                disabled={isPlaying}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-black py-4 rounded-xl disabled:opacity-50"
              >
                {isPlaying ? 'FLIPPING...' : 'FLIP COIN (1.96x)'}
              </button>
            </div>
          )}

          {/* Dice Roll Game */}
          {selectedGame.name === 'Dice Roll' && (
            <div className="space-y-4">
              <div className="bg-[#1a1f2e] rounded-xl p-6 border border-gray-800">
                <label className="text-sm text-gray-400 mb-2 block">Roll Over {diceTarget}</label>
                <input
                  type="range"
                  min="1"
                  max="95"
                  value={diceTarget}
                  onChange={(e) => setDiceTarget(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1</span>
                  <span className="text-white font-bold">{diceTarget}</span>
                  <span>100</span>
                </div>
                <div className="mt-3 text-center">
                  <div className="text-sm text-gray-400">Win Chance: {(100 - diceTarget)}%</div>
                  <div className="text-lg text-blue-400 font-bold">
                    Multiplier: {(((100 / (100 - diceTarget)) * 0.975)).toFixed(2)}x
                  </div>
                </div>
              </div>

              <div className="bg-[#1a1f2e] rounded-xl p-6 border border-gray-800">
                <label className="text-sm text-gray-400 mb-2 block">Bet Amount (EQ)</label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="w-full bg-[#0a0e1a] text-white rounded-lg px-4 py-3 border border-gray-700"
                  min={selectedGame.min_bet}
                  max={selectedGame.max_bet}
                />
              </div>

              <button
                onClick={playDice}
                disabled={isPlaying}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-black py-4 rounded-xl disabled:opacity-50"
              >
                {isPlaying ? 'ROLLING...' : 'ROLL DICE'}
              </button>
            </div>
          )}

          {/* Crash Game */}
          {selectedGame.name === 'Crash' && (
            <div className="space-y-4">
              <div className="bg-[#1a1f2e] rounded-xl p-6 border border-gray-800">
                <label className="text-sm text-gray-400 mb-2 block">Auto Cashout Multiplier</label>
                <input
                  type="number"
                  step="0.1"
                  min="1.01"
                  max="100"
                  value={crashMultiplier}
                  onChange={(e) => setCrashMultiplier(parseFloat(e.target.value))}
                  className="w-full bg-[#0a0e1a] text-white rounded-lg px-4 py-3 border border-gray-700"
                />
                <div className="mt-3 text-center text-2xl font-black text-blue-400">
                  {crashMultiplier.toFixed(2)}x
                </div>
              </div>

              <div className="bg-[#1a1f2e] rounded-xl p-6 border border-gray-800">
                <label className="text-sm text-gray-400 mb-2 block">Bet Amount (EQ)</label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="w-full bg-[#0a0e1a] text-white rounded-lg px-4 py-3 border border-gray-700"
                  min={selectedGame.min_bet}
                  max={selectedGame.max_bet}
                />
              </div>

              <button
                onClick={playCrash}
                disabled={isPlaying}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-black py-4 rounded-xl disabled:opacity-50"
              >
                {isPlaying ? 'LAUNCHING...' : 'START GAME'}
              </button>
            </div>
          )}

          {/* Mines Game */}
          {selectedGame.name === 'Mines' && (
            <div className="space-y-4">
              {minesRevealed.length === 0 && (
                <>
                  <div className="bg-[#1a1f2e] rounded-xl p-6 border border-gray-800">
                    <label className="text-sm text-gray-400 mb-2 block">Number of Mines</label>
                    <select
                      value={minesCount}
                      onChange={(e) => setMinesCount(parseInt(e.target.value))}
                      className="w-full bg-[#0a0e1a] text-white rounded-lg px-4 py-3 border border-gray-700"
                    >
                      <option value={1}>1 Mine (Easy)</option>
                      <option value={3}>3 Mines (Medium)</option>
                      <option value={5}>5 Mines (Hard)</option>
                      <option value={10}>10 Mines (Expert)</option>
                    </select>
                  </div>

                  <div className="bg-[#1a1f2e] rounded-xl p-6 border border-gray-800">
                    <label className="text-sm text-gray-400 mb-2 block">Bet Amount (EQ)</label>
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      className="w-full bg-[#0a0e1a] text-white rounded-lg px-4 py-3 border border-gray-700"
                      min={selectedGame.min_bet}
                      max={selectedGame.max_bet}
                    />
                  </div>
                </>
              )}

              {/* Mine Field */}
              <div className="bg-[#1a1f2e] rounded-xl p-4 border border-gray-800">
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 25 }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => playMines(i)}
                      disabled={isPlaying || minesRevealed.includes(i)}
                      className={`aspect-square rounded-lg border-2 text-2xl transition-all ${
                        minesRevealed.includes(i)
                          ? ((window as any).__minePositions?.includes(i))
                            ? 'bg-red-500/20 border-red-500'
                            : 'bg-green-500/20 border-green-500'
                          : 'bg-[#0a0e1a] border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      {minesRevealed.includes(i) && (
                        ((window as any).__minePositions?.includes(i)) ? '💣' : '💎'
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {minesRevealed.length > 0 && !gameResult?.message.includes('BOOM') && (
                <button
                  onClick={cashoutMines}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-black py-4 rounded-xl"
                >
                  CASHOUT {gameResult?.multiplier.toFixed(2)}x
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] pb-24">
      {/* Header with Stats */}
      <div className="bg-gradient-to-br from-[#1a1f2e] to-[#0a0e1a] border-b border-gray-800 px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-3xl">🎮</div>
          <div>
            <h1 className="text-2xl font-black text-white">EQ GAMES</h1>
            <p className="text-sm text-gray-400">Multiply Your Mining Earnings!</p>
          </div>
        </div>

        {/* User Stats */}
        {userStats && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#1a1f2e] rounded-lg p-3 border border-gray-800">
              <div className="text-xs text-gray-400 mb-1">Total Profit</div>
              <div className={`text-lg font-bold ${userStats.total_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {userStats.total_profit >= 0 ? '+' : ''}{formatNumber(userStats.total_profit)} EQ
              </div>
            </div>
            <div className="bg-[#1a1f2e] rounded-lg p-3 border border-gray-800">
              <div className="text-xs text-gray-400 mb-1">Win Streak</div>
              <div className="text-lg font-bold text-blue-400">
                {userStats.win_streak} 🔥
              </div>
            </div>
          </div>
        )}

        {/* Balance */}
        <div className="mt-3 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">EQ Balance:</span>
            <span className="text-xl font-bold text-white">{formatNumber(eqBalance)} EQ</span>
          </div>
        </div>
      </div>

      {/* Games Grid */}
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          {games.map((game) => (
            <button
              key={game.id}
              onClick={() => setSelectedGame(game)}
              className="bg-gradient-to-br from-[#1a1f2e] to-[#0a0e1a] rounded-xl p-6 border border-gray-800 hover:border-blue-500 transition-all group"
            >
              <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">{game.icon}</div>
              <div className="text-white font-bold mb-1">{game.name}</div>
              <div className="text-xs text-gray-400">{game.house_edge}% edge</div>
            </button>
          ))}
        </div>

        {/* Big Wins Feed */}
        <div className="bg-[#1a1f2e] rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="text-white font-bold">Recent Big Wins</span>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {bigWins.map((win, idx) => (
              <div key={idx} className="bg-[#0a0e1a] rounded-lg p-3 border border-gray-700">
                <div className="flex items-center gap-3">
                  <img
                    src={win.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${win.username}`}
                    alt={win.username}
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold text-sm truncate">{win.username}</div>
                    <div className="text-xs text-gray-400">{win.game_icon} {win.game_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-bold text-sm">+{formatNumber(win.profit)}</div>
                    <div className="text-xs text-gray-500">{win.multiplier.toFixed(2)}x</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Warning */}
        <div className="mt-4 bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0" />
            <div className="text-xs text-gray-400">
              <div className="text-orange-400 font-bold mb-1">Play Responsibly</div>
              Games are provably fair with built-in house edge. Only bet what you can afford to lose. 18+ only.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
