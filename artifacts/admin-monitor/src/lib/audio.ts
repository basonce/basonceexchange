let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.3, delay = 0) {
  const ac = getCtx();
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.connect(g);
  g.connect(ac.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + delay);
  g.gain.setValueAtTime(0, ac.currentTime + delay);
  g.gain.linearRampToValueAtTime(gain, ac.currentTime + delay + 0.01);
  g.gain.linearRampToValueAtTime(0, ac.currentTime + delay + duration);
  osc.start(ac.currentTime + delay);
  osc.stop(ac.currentTime + delay + duration + 0.05);
}

// ── Sound effects (single play) ───────────────────────────────
export const sounds = {
  newUser: () => {
    tone(523, 0.15, 'sine', 0.25, 0);
    tone(659, 0.15, 'sine', 0.25, 0.1);
    tone(784, 0.25, 'sine', 0.3, 0.2);
  },
  deposit: () => {
    tone(1046, 0.1, 'sine', 0.2, 0);
    tone(1318, 0.1, 'sine', 0.2, 0.08);
    tone(1568, 0.1, 'sine', 0.2, 0.16);
    tone(2093, 0.25, 'sine', 0.3, 0.24);
  },
  withdrawal: () => {
    tone(440, 0.15, 'sine', 0.3, 0);
    tone(349, 0.25, 'sine', 0.3, 0.15);
    tone(294, 0.35, 'sine', 0.35, 0.38);
  },
  support: () => {
    tone(880, 0.08, 'sine', 0.2, 0);
    tone(880, 0.08, 'sine', 0.2, 0.15);
    tone(880, 0.15, 'sine', 0.25, 0.3);
  },
  security: () => {
    for (let i = 0; i < 6; i++) {
      tone(i % 2 === 0 ? 880 : 660, 0.1, 'square', 0.15, i * 0.12);
    }
  },
  critical: () => {
    for (let i = 0; i < 8; i++) {
      tone(i % 2 === 0 ? 1200 : 800, 0.08, 'square', 0.2, i * 0.1);
    }
  },
  visitor: () => {
    tone(440, 0.08, 'sine', 0.1, 0);
    tone(550, 0.1, 'sine', 0.12, 0.1);
  },
  success: () => {
    tone(523, 0.1, 'sine', 0.2, 0);
    tone(784, 0.2, 'sine', 0.25, 0.1);
  },
};

// ── Persistent alarm engine (1 minute = 6× every 10s) ────────
// Each category has its own repeating timer — stop button kills them all
const activeAlarms = new Map<string, ReturnType<typeof setInterval>>();

function startPersistentAlarm(category: string, soundFn: () => void) {
  // If same category already ringing, restart it
  if (activeAlarms.has(category)) clearInterval(activeAlarms.get(category)!);

  soundFn(); // play immediately

  let count = 0;
  const timer = setInterval(() => {
    count++;
    if (count >= 5) { // 5 more after initial = 6 total × 10s = 60s
      clearInterval(timer);
      activeAlarms.delete(category);
      return;
    }
    soundFn();
  }, 10_000);

  activeAlarms.set(category, timer);
}

export function stopAlarm() {
  activeAlarms.forEach(t => clearInterval(t));
  activeAlarms.clear();
}

export function hasActiveAlarms() {
  return activeAlarms.size > 0;
}

// ── Named alarm starters — use these in monitor.ts ───────────
export function startNewUserAlarm()   { startPersistentAlarm('user',       sounds.newUser); }
export function startWithdrawalAlarm(){ startPersistentAlarm('withdrawal', sounds.withdrawal); }
export function startDepositAlarm()   { startPersistentAlarm('deposit',    sounds.deposit); }
export function startSupportAlarm()   { startPersistentAlarm('support',    sounds.support); }
export function startSecurityAlarm()  { startPersistentAlarm('security',   sounds.security); }
export function startCriticalAlarm()  { startPersistentAlarm('critical',   sounds.critical); }
export function startPositionAlarm()  { startPersistentAlarm('position',   sounds.success); }

// ── Browser notification ──────────────────────────────────────
let silentNode: ScriptProcessorNode | null = null;
let silentStarted = false;

export function startSilentAudioLoop() {
  if (silentStarted) return;
  silentStarted = true;
  try {
    const ac = getCtx();
    const bufSize = 4096;
    silentNode = ac.createScriptProcessor(bufSize, 1, 1);
    silentNode.onaudioprocess = () => {};
    silentNode.connect(ac.destination);
    const osc = ac.createOscillator();
    const gainNode = ac.createGain();
    gainNode.gain.setValueAtTime(0.0001, ac.currentTime);
    osc.connect(gainNode);
    gainNode.connect(ac.destination);
    osc.start();
    console.log('[audio] silent loop started — tab throttling prevented');
  } catch (e) {
    console.warn('[audio] silent loop failed:', e);
  }
}

export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

export function sendBrowserNotification(title: string, body: string, icon?: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: icon || '/admin-monitor/favicon.ico', silent: false });
  }
}
