import { useState, useRef, useEffect, useMemo } from 'react';
import { casinoApi, type PlayResult, type BonanzaSpin } from '../../lib/casino-api';
import { GOLD, GREEN, RED, TEXT, SUB, BORDER, fmt, BetBar, playBtn } from './shared';

import imgHeart from '@assets/sweet_bonanza/sym_heart.png';
import imgPurple from '@assets/sweet_bonanza/sym_purple.png';
import imgGreen from '@assets/sweet_bonanza/sym_green.png';
import imgBlue from '@assets/sweet_bonanza/sym_blue.png';
import imgApple from '@assets/sweet_bonanza/sym_apple.png';
import imgPlum from '@assets/sweet_bonanza/sym_plum.png';
import imgGrape from '@assets/sweet_bonanza/sym_grape.png';
import imgWatermelon from '@assets/sweet_bonanza/sym_watermelon.png';
import imgBanana from '@assets/sweet_bonanza/sym_banana.png';
import imgScatter from '@assets/sweet_bonanza/sym_scatter.png';
import imgMult from '@assets/sweet_bonanza/sym_mult.png';

import sndSpin from '@assets/sweet_bonanza/snd_spin.mp3';
import sndPop from '@assets/sweet_bonanza/snd_pop.mp3';
import sndWin from '@assets/sweet_bonanza/snd_win.mp3';
import sndBigwin from '@assets/sweet_bonanza/snd_bigwin.mp3';
import sndScatter from '@assets/sweet_bonanza/snd_scatter.mp3';
import sndMult from '@assets/sweet_bonanza/snd_mult.mp3';
import sndTick from '@assets/sweet_bonanza/snd_tick.mp3';
import musicFs from '@assets/sweet_bonanza/music_fs.mp3';

const SYM = [imgHeart, imgPurple, imgGreen, imgBlue, imgApple, imgPlum, imgGrape, imgWatermelon, imgBanana, imgScatter, imgMult];
const SND: Record<string, string> = { spin: sndSpin, pop: sndPop, win: sndWin, bigwin: sndBigwin, scatter: sndScatter, mult: sndMult, tick: sndTick };

// top pays (12+) for the mini paytable
const PAYTABLE: { sym: number; pay: number }[] = [
  { sym: 0, pay: 50 }, { sym: 1, pay: 25 }, { sym: 2, pay: 15 }, { sym: 3, pay: 12 },
  { sym: 4, pay: 10 }, { sym: 5, pay: 8 }, { sym: 6, pay: 5 }, { sym: 7, pay: 4 }, { sym: 8, pay: 2 },
];

const IDLE_GRID = [0, 4, 6, 1, 7, 2, 8, 3, 5, 0, 4, 1, 2, 6, 7, 3, 8, 5, 1, 0, 6, 4, 2, 7, 8, 5, 3, 1, 0, 6];

const KEYFRAMES = `
@keyframes candyDrop{0%{transform:translateY(-44px) scale(.82);opacity:0}60%{opacity:1}100%{transform:translateY(0) scale(1);opacity:1}}
@keyframes candyPop{0%{transform:scale(1)}35%{transform:scale(1.3)}100%{transform:scale(0);opacity:0}}
@keyframes bannerPop{0%{transform:scale(.55);opacity:0}60%{transform:scale(1.06);opacity:1}100%{transform:scale(1);opacity:1}}
@keyframes multZoom{0%{transform:scale(.3);opacity:0}45%{transform:scale(1.25);opacity:1}100%{transform:scale(1);opacity:1}}
@keyframes scatGlow{0%,100%{filter:drop-shadow(0 0 6px #ffd54f)}50%{filter:drop-shadow(0 0 18px #ffd54f)}}
@keyframes confettiFall{0%{transform:translateY(-16px) rotate(0deg);opacity:1}100%{transform:translateY(460px) rotate(680deg);opacity:0}}
@keyframes resultPop{0%{transform:scale(.5) translateY(14px);opacity:0}55%{transform:scale(1.08);opacity:1}100%{transform:scale(1);opacity:1}}
@keyframes winGlow{0%,100%{filter:drop-shadow(0 0 14px rgba(14,203,129,.55))}50%{filter:drop-shadow(0 0 32px rgba(255,213,79,.9))}}
@keyframes coinBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
`;

export default function BonanzaGame({ balance, onBalance }: { balance: number; onBalance: (n: number) => void }) {
  const [bet, setBet] = useState('1');
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'anim'>('idle');
  const [grid, setGrid] = useState<number[]>(IDLE_GRID);
  const [gen, setGen] = useState(0);
  const [popping, setPopping] = useState<Set<number>>(new Set());
  const [multMap, setMultMap] = useState<Record<number, number>>({});
  const [glow, setGlow] = useState<Set<number>>(new Set());
  const [banner, setBanner] = useState<string | null>(null);
  const [fs, setFs] = useState<{ cur: number; total: number } | null>(null);
  const [bigMult, setBigMult] = useState<number | null>(null);
  const [winDisp, setWinDisp] = useState(0);
  const [result, setResult] = useState<PlayResult | null>(null);
  const [err, setErr] = useState('');
  const [muted, setMuted] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [shownPayout, setShownPayout] = useState(0);

  const runId = useRef(0);
  const genRef = useRef(0);
  const roundXRef = useRef(0);
  const sounds = useRef<Record<string, HTMLAudioElement>>({});
  const music = useRef<HTMLAudioElement | null>(null);
  const mutedRef = useRef(false);
  useEffect(() => { mutedRef.current = muted; if (muted && music.current) music.current.pause(); }, [muted]);

  useEffect(() => {
    Object.entries(SND).forEach(([k, src]) => { const a = new Audio(src); a.preload = 'auto'; sounds.current[k] = a; });
    const m = new Audio(musicFs); m.loop = true; m.volume = 0.35; music.current = m;
    return () => { runId.current++; try { m.pause(); } catch { /* noop */ } };
  }, []);

  // Animated count-up of the final payout shown on the result card
  useEffect(() => {
    if (phase === 'idle' && result && result.payout > 0) {
      let raf = 0; const start = performance.now(); const dur = 850; const to = result.payout;
      const tick = (t: number) => {
        const k = Math.min(1, (t - start) / dur);
        setShownPayout(to * (1 - Math.pow(1 - k, 3)));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }
    setShownPayout(0);
  }, [result, phase]);

  const play = (name: string, vol = 1) => {
    if (mutedRef.current) return;
    const base = sounds.current[name]; if (!base) return;
    const c = base.cloneNode(true) as HTMLAudioElement; c.volume = vol; c.play().catch(() => {});
  };
  const startMusic = () => { if (!mutedRef.current && music.current) { music.current.currentTime = 0; music.current.play().catch(() => {}); } };
  const stopMusic = () => { if (music.current) { try { music.current.pause(); } catch { /* noop */ } } };

  const bump = (cells: number[]) => { genRef.current++; setGen(genRef.current); setGrid(cells.slice()); setPopping(new Set()); setMultMap({}); };

  const setWin = (x: number, betNum: number) => { roundXRef.current = x; setWinDisp(x * betNum); };

  async function playOne(spin: BonanzaSpin, isFree: boolean, guard: () => void, sleep: (ms: number) => Promise<void>, betNum: number) {
    const tumbles = spin.tumbles;
    bump(tumbles[0].cells); play('spin', 0.5); await sleep(360); guard();
    const pre = roundXRef.current;
    let stepAcc = 0;
    for (let ti = 0; ti < tumbles.length; ti++) {
      const tum = tumbles[ti];
      if (ti > 0) { bump(tum.cells); await sleep(330); guard(); }
      if (tum.removed.length) {
        setPopping(new Set(tum.removed)); play('pop', 0.85);
        const stepX = tum.wins.reduce((a, w) => a + w.pay, 0);
        stepAcc += stepX; setWin(pre + stepAcc, betNum); play('tick', 0.4);
        await sleep(520); guard();
        setPopping(new Set()); await sleep(70); guard();
      }
    }
    if (isFree && spin.mults.length) {
      const mm: Record<number, number> = {}; spin.mults.forEach((m) => { mm[m.pos] = m.value; });
      setMultMap(mm); play('mult'); await sleep(700); guard();
      if (spin.win > 0 && spin.multSum > 0) {
        setBigMult(spin.multSum); play('bigwin', 0.7); await sleep(320); guard();
        setWin(pre + spin.win, betNum); await sleep(820); guard(); setBigMult(null);
      } else { setWin(pre + spin.win, betNum); }
      setMultMap({});
    } else {
      setWin(pre + spin.win, betNum);
    }
    if (spin.scatPay > 0) setWin(roundXRef.current + spin.scatPay, betNum);
    if (spin.win > 0 && !isFree) play('win', 0.7);
  }

  const run = async () => {
    setErr(''); setResult(null);
    const betNum = parseFloat(bet) || 0;
    if (betNum < 0.1) { setErr('Min bet is 0.1 USDT'); return; }
    if (betNum > balance + 1e-9) { setErr('Insufficient USDT balance'); return; }

    setPhase('spinning');
    let r: PlayResult;
    try { r = await casinoApi.playBonanza(betNum); }
    catch (e: any) { setErr(e.message || 'Error'); setPhase('idle'); return; }
    const seq = r.sequence;
    if (!seq || !Array.isArray(seq.spins) || seq.spins.length === 0) {
      setErr('No game data returned'); setPhase('idle'); return;
    }

    const myRun = ++runId.current;
    const guard = () => { if (runId.current !== myRun) throw 'abort'; };
    const sleep = (ms: number) => new Promise<void>((res, rej) => setTimeout(() => (runId.current !== myRun ? rej('abort') : res()), ms));

    setPhase('anim'); roundXRef.current = 0; setWin(0, betNum); setGlow(new Set()); setBigMult(null); setBanner(null);
    try {
      const spins = seq.spins;
      await playOne(spins[0], false, guard, sleep, betNum);

      if (seq.freeSpinsCount > 0) {
        setGlow(new Set(spins[0].scatPos)); play('scatter'); await sleep(750); guard();
        setBanner(`\uD83C\uDF6D ${seq.freeSpinsCount} FREE SPINS`); startMusic(); await sleep(2000); guard();
        setBanner(null); setGlow(new Set());
        const fsTotal = spins.length - 1;
        for (let i = 1; i < spins.length; i++) { setFs({ cur: i, total: fsTotal }); await playOne(spins[i], true, guard, sleep, betNum); }
        stopMusic(); setFs(null);
        setBanner(`FREE SPINS WIN  ${fmt(roundXRef.current * betNum)} USDT`); await sleep(1900); guard(); setBanner(null);
      }

      onBalance(r.balance);
      setResult(r);
      setWin(betNum > 0 ? r.payout / betNum : 0, betNum);
      if (r.payout >= betNum * 8) play('bigwin');
      else if (r.payout > 0) play('win');
      setPhase('idle');
    } catch (e) {
      if (e !== 'abort') { stopMusic(); setPhase('idle'); }
    }
  };

  const busy = phase !== 'idle';
  const hasWin = !!result && result.payout > 0;
  const mult = result?.multiplier ?? 0;
  const net = mult >= 1;
  const mega = mult >= 8;
  const confetti = useMemo(() => {
    if (!result || result.payout <= 0) return [];
    const n = result.multiplier >= 8 ? 70 : result.multiplier >= 1 ? 42 : 18;
    const colors = ['#ff4fa3', '#ffd54f', '#0ECB81', '#7c3aa8', '#4fc3f7', '#ff7043'];
    return Array.from({ length: n }, (_, i) => ({
      left: Math.random() * 100, color: colors[i % colors.length],
      delay: Math.random() * 0.5, dur: 1.1 + Math.random() * 1.2,
      size: 6 + Math.random() * 8, rot: Math.random() * 360,
    }));
  }, [result]);

  return (
    <div>
      <style>{KEYFRAMES}</style>

      {/* ── BOARD ── */}
      <div style={{
        position: 'relative', borderRadius: 18, marginBottom: 12, overflow: 'hidden',
        background: 'linear-gradient(165deg,#4a1d6e 0%,#2a1147 55%,#1a0d2e 100%)',
        border: `1px solid #6d3aa855`, boxShadow: '0 10px 30px rgba(124,58,168,0.25)', padding: 10,
      }}>
        {/* top chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, minHeight: 26 }}>
          <div style={{ fontWeight: 900, fontSize: 13, color: '#ffd54f', letterSpacing: 0.4, flex: 1 }}>🍬 SWEET CANDY</div>
          {fs && (
            <div style={{ fontSize: 12, fontWeight: 800, color: '#1A1200', background: '#ffd54f', borderRadius: 20, padding: '4px 10px' }}>
              FREE SPIN {fs.cur}/{fs.total}
            </div>
          )}
          {winDisp > 0 && (
            <div style={{ fontSize: 12, fontWeight: 800, color: GREEN, background: 'rgba(14,203,129,0.14)', border: `1px solid ${GREEN}55`, borderRadius: 20, padding: '4px 10px' }}>
              +{fmt(winDisp)}
            </div>
          )}
          <button onClick={() => setMuted((v) => !v)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: 8, width: 30, height: 26, cursor: 'pointer', fontSize: 13 }}>
            {muted ? '🔇' : '🔊'}
          </button>
        </div>

        {/* grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 5 }}>
          {grid.map((s, i) => {
            const pop = popping.has(i);
            const isGlow = glow.has(i);
            return (
              <div key={`${gen}-${i}`} style={{
                position: 'relative', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 10, background: 'rgba(255,255,255,0.05)',
                animation: pop ? 'candyPop .5s ease forwards' : 'candyDrop .33s ease',
              }}>
                <img src={SYM[s]} alt="" draggable={false} style={{
                  width: '86%', height: '86%', objectFit: 'contain', userSelect: 'none',
                  filter: isGlow ? 'drop-shadow(0 0 14px #ffd54f)' : 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))',
                  animation: isGlow ? 'scatGlow 0.9s ease-in-out infinite' : undefined,
                }} />
                {multMap[i] !== undefined && (
                  <div style={{
                    position: 'absolute', bottom: '6%', left: '50%', transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg,#ffd54f,#ff9800)', color: '#3a1500', fontWeight: 900,
                    fontSize: 'clamp(10px,3vw,15px)', padding: '1px 7px', borderRadius: 20, border: '1px solid #fff7',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.4)', whiteSpace: 'nowrap',
                  }}>{multMap[i]}×</div>
                )}
              </div>
            );
          })}
        </div>

        {/* banner overlay */}
        {banner && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(20,8,40,0.55)', backdropFilter: 'blur(2px)' }}>
            <div style={{
              animation: 'bannerPop .4s ease', textAlign: 'center', padding: '18px 26px', borderRadius: 18,
              background: 'linear-gradient(135deg,#ff4fa3,#ffd54f)', color: '#3a0030', fontWeight: 900,
              fontSize: 'clamp(18px,5.5vw,26px)', boxShadow: '0 10px 40px rgba(255,79,163,0.5)', maxWidth: '90%',
            }}>{banner}</div>
          </div>
        )}

        {/* big multiplier flash */}
        {bigMult !== null && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ animation: 'multZoom .5s ease', fontWeight: 900, fontSize: 'clamp(42px,15vw,90px)', color: '#ffd54f', textShadow: '0 0 30px #ff9800, 0 4px 10px rgba(0,0,0,0.6)' }}>
              {bigMult}×
            </div>
          </div>
        )}

        {/* result overlay */}
        {phase === 'idle' && result && (
          <div onClick={() => setResult(null)} style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(8,3,20,0.66)', backdropFilter: 'blur(3px)', cursor: 'pointer', zIndex: 6,
          }}>
            {hasWin && (
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                {confetti.map((c, i) => (
                  <div key={i} style={{
                    position: 'absolute', top: -16, left: `${c.left}%`, width: c.size, height: c.size * 0.55,
                    background: c.color, borderRadius: 2, transform: `rotate(${c.rot}deg)`,
                    animation: `confettiFall ${c.dur}s ${c.delay}s ease-in forwards`,
                  }} />
                ))}
              </div>
            )}
            <div style={{
              position: 'relative', textAlign: 'center', padding: '22px 30px', borderRadius: 22, maxWidth: '92%',
              animation: hasWin ? 'resultPop .45s ease, winGlow 1.5s ease-in-out infinite' : 'resultPop .4s ease',
              background: mega ? 'linear-gradient(135deg,#ffd54f 0%,#ff7043 48%,#ff4fa3 100%)'
                : net ? 'linear-gradient(135deg,#0ECB81 0%,#7be07b 55%,#ffd54f 100%)'
                : hasWin ? 'linear-gradient(135deg,#ffb74d,#ff8a3d)'
                : 'linear-gradient(135deg,#2a1147,#15091f)',
              border: hasWin ? '2px solid #ffffffcc' : '1px solid #6d3aa8aa',
              boxShadow: '0 16px 50px rgba(0,0,0,0.55)',
            }}>
              {hasWin ? (
                <>
                  <div style={{ fontSize: 'clamp(15px,4.4vw,20px)', fontWeight: 900, letterSpacing: 1, color: '#3a0030', textShadow: '0 1px 0 #ffffff66' }}>
                    {mega ? '💥 MEGA WIN!' : net ? '🎉 YOU WIN!' : '✨ NICE WIN'}
                  </div>
                  <div style={{ fontSize: 'clamp(32px,10vw,50px)', fontWeight: 900, color: '#fff', lineHeight: 1.05, margin: '6px 0 0',
                    textShadow: '0 2px 0 rgba(0,0,0,0.25), 0 0 22px rgba(255,255,255,0.55)', animation: 'coinBob 1.2s ease-in-out infinite' }}>
                    +{fmt(shownPayout)}
                  </div>
                  <div style={{ fontSize: 'clamp(12px,3.4vw,15px)', fontWeight: 900, color: '#3a0030', marginTop: 2 }}>USDT</div>
                  <div style={{ display: 'inline-block', marginTop: 12, padding: '5px 16px', borderRadius: 22, background: 'rgba(0,0,0,0.3)', color: '#fff', fontWeight: 900, fontSize: 'clamp(13px,3.6vw,16px)' }}>
                    {result.multiplier}× WIN
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 'clamp(22px,6.5vw,30px)', fontWeight: 900, color: '#fff', letterSpacing: 1 }}>NO WIN</div>
                  <div style={{ fontSize: 13, color: '#cbb8e6', marginTop: 8, fontWeight: 700 }}>🍬 Tap to spin again</div>
                </>
              )}
              <div style={{ fontSize: 10, color: hasWin ? '#3a0030aa' : '#8a78a8', marginTop: 14, fontWeight: 800, letterSpacing: 0.5 }}>TAP TO DISMISS</div>
            </div>
          </div>
        )}
      </div>

      {/* paytable toggle */}
      <button onClick={() => setShowPay((v) => !v)} style={{ background: 'none', border: `1px solid ${BORDER}`, color: SUB, borderRadius: 10, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', marginBottom: 10, width: '100%' }}>
        {showPay ? 'Hide paytable ▲' : 'ⓘ How it works · Paytable ▼'}
      </button>
      {showPay && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12, marginBottom: 12, fontSize: 12, color: SUB, lineHeight: 1.6 }}>
          <div style={{ marginBottom: 8 }}>Land <b style={{ color: TEXT }}>8 or more</b> of any candy <b style={{ color: TEXT }}>anywhere</b> to win. Winning candies burst and new ones tumble down for more wins. Land <b style={{ color: GOLD }}>4+ lollipops</b> 🍭 to trigger <b style={{ color: GOLD }}>10 free spins</b>, where multiplier bombs 💣 (2×–100×) add up and boost your win.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginTop: 8 }}>
            {PAYTABLE.map((p) => (
              <div key={p.sym} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.25)', borderRadius: 8, padding: '4px 6px' }}>
                <img src={SYM[p.sym]} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
                <span style={{ color: TEXT, fontWeight: 800 }}>{p.pay}×</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 11 }}>Pays shown for 12+ symbols (×total bet). Outcomes are decided on the server — provably fair. Max win 1000×.</div>
        </div>
      )}

      <BetBar bet={bet} setBet={setBet} balance={balance} disabled={busy} />
      {err && <div style={{ color: RED, fontSize: 13, marginBottom: 8 }}>{err}</div>}
      <button onClick={run} disabled={busy} style={playBtn(!busy, '#ff4fa3')}>
        {phase === 'spinning' ? 'SPINNING…' : phase === 'anim' ? 'PLAYING…' : '🍬 SPIN'}
      </button>
    </div>
  );
}
