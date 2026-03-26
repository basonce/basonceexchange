let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
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
    tone(440, 0.15, 'sine', 0.2, 0);
    tone(349, 0.25, 'sine', 0.2, 0.15);
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

let newUserAlarmTimer: ReturnType<typeof setInterval> | null = null;
let alarmCount = 0;

export function startNewUserAlarm() {
  alarmCount = 0;
  if (newUserAlarmTimer) clearInterval(newUserAlarmTimer);
  sounds.newUser();
  newUserAlarmTimer = setInterval(() => {
    alarmCount++;
    if (alarmCount >= 6) {
      if (newUserAlarmTimer) clearInterval(newUserAlarmTimer);
      newUserAlarmTimer = null;
      return;
    }
    sounds.newUser();
  }, 10000);
}

export function stopAlarm() {
  if (newUserAlarmTimer) {
    clearInterval(newUserAlarmTimer);
    newUserAlarmTimer = null;
  }
}

export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

export function sendBrowserNotification(title: string, body: string, icon?: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: icon || '/admin-monitor/favicon.ico', silent: true });
  }
}
