import {
  COIN_MESSAGES,
  MARKET_BULLISH,
  MARKET_BEARISH,
  MARKET_GENERAL,
  TECHNICAL_ANALYSIS,
  EXCITED_REACTIONS,
  TRADING_WISDOM,
  NEWS_COMMENTS,
  MOTIVATIONAL_PROFITS,
  USERNAMES,
} from './live-chat-messages';

export interface ChatMessage {
  id: string;
  username: string;
  avatar: string;
  message: string;
  timestamp: number;
}

export interface ParticipantSlot {
  id: string;
  username: string;
  avatar: string;
  isNew?: boolean;
}

const recentMessages = new Set<string>();
const MAX_RECENT = 400;

interface ProfileSlot {
  username: string;
  avatar: string;
}

let loadedProfiles: ProfileSlot[] = [];

const DICEBEAR_STYLES = [
  'adventurer',
  'adventurer-neutral',
  'avataaars',
  'big-ears',
  'big-ears-neutral',
  'big-smile',
  'bottts',
  'croodles',
  'fun-emoji',
  'icons',
  'lorelei',
  'micah',
  'miniavs',
  'notionists',
  'open-peeps',
  'personas',
  'pixel-art',
  'rings',
  'shapes',
  'thumbs',
];

function getDicebearAvatar(seed: string): string {
  const style = DICEBEAR_STYLES[Math.floor(Math.random() * DICEBEAR_STYLES.length)];
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=80`;
}

function getPravatrAvatar(): string {
  const id = Math.floor(Math.random() * 70) + 1;
  return `https://i.pravatar.cc/80?img=${id}`;
}

function getMixedAvatar(username: string): string {
  const roll = Math.random();
  if (roll < 0.55) {
    return getPravatrAvatar();
  } else {
    return getDicebearAvatar(username + Math.random().toString(36).slice(2, 6));
  }
}

export function setLoadedProfiles(profiles: ProfileSlot[]) {
  loadedProfiles = profiles;
}

function getNextAvatar(username?: string): string {
  if (loadedProfiles.length > 0) {
    const roll = Math.random();
    if (roll < 0.6) {
      const p = loadedProfiles[Math.floor(Math.random() * loadedProfiles.length)];
      return p.avatar;
    } else {
      return getMixedAvatar(username || 'user' + Math.random());
    }
  }
  return getMixedAvatar(username || 'user' + Math.random());
}

function getRandomUsername(): string {
  if (loadedProfiles.length > 0) {
    const roll = Math.random();
    if (roll < 0.6) {
      const p = loadedProfiles[Math.floor(Math.random() * loadedProfiles.length)];
      return p.username;
    }
  }
  return USERNAMES[Math.floor(Math.random() * USERNAMES.length)];
}

function pickUniqueRandom(arr: string[]): string {
  const available = arr.filter(m => !recentMessages.has(m));
  const pool = available.length > 0 ? available : arr;
  const msg = pool[Math.floor(Math.random() * pool.length)];

  recentMessages.add(msg);
  if (recentMessages.size > MAX_RECENT) {
    const first = recentMessages.values().next().value;
    if (first) recentMessages.delete(first);
  }

  return msg;
}

function getCoinMessages(symbol: string): string[] {
  return COIN_MESSAGES[symbol] || COIN_MESSAGES.BTC;
}

function pickMessage(coinSymbol: string): string {
  const coinMsgs = getCoinMessages(coinSymbol);
  const roll = Math.random();

  if (roll < 0.55) {
    return pickUniqueRandom(coinMsgs);
  } else if (roll < 0.65) {
    return pickUniqueRandom(MOTIVATIONAL_PROFITS);
  } else if (roll < 0.73) {
    return pickUniqueRandom(MARKET_BULLISH);
  } else if (roll < 0.79) {
    return pickUniqueRandom(MARKET_GENERAL);
  } else if (roll < 0.87) {
    return pickUniqueRandom(TECHNICAL_ANALYSIS);
  } else if (roll < 0.93) {
    return pickUniqueRandom(NEWS_COMMENTS);
  } else if (roll < 0.97) {
    return pickUniqueRandom(EXCITED_REACTIONS);
  } else {
    return pickUniqueRandom(TRADING_WISDOM);
  }
}

export function generateInitialMessages(coinSymbol: string, count: number = 15): ChatMessage[] {
  const msgs: ChatMessage[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const username = getRandomUsername();
    msgs.push({
      id: `init-${i}-${Math.random()}`,
      username,
      avatar: getNextAvatar(username),
      message: pickMessage(coinSymbol),
      timestamp: now - (count - i) * 8000,
    });
  }

  return msgs;
}

export function generateNewMessage(coinSymbol: string): ChatMessage {
  const username = getRandomUsername();
  return {
    id: `msg-${Date.now()}-${Math.random()}`,
    username,
    avatar: getNextAvatar(username),
    message: pickMessage(coinSymbol),
    timestamp: Date.now(),
  };
}

const usedSlotIndexes = new Map<string, Set<number>>();

export function generateParticipantSlots(count: number = 5, roomId?: string): ParticipantSlot[] {
  const slots: ParticipantSlot[] = [];
  const usedIndexes = new Set<number>();
  const key = roomId || 'default';

  if (!usedSlotIndexes.has(key)) usedSlotIndexes.set(key, new Set());

  for (let i = 0; i < count; i++) {
    let username: string;
    let avatar: string;

    if (loadedProfiles.length >= count) {
      let idx: number;
      let attempts = 0;
      do {
        idx = Math.floor(Math.random() * loadedProfiles.length);
        attempts++;
      } while (usedIndexes.has(idx) && attempts < 50);
      usedIndexes.add(idx);

      const roll = Math.random();
      if (roll < 0.6) {
        username = loadedProfiles[idx].username;
        avatar = loadedProfiles[idx].avatar;
      } else {
        username = loadedProfiles[idx].username;
        avatar = getMixedAvatar(username);
      }
    } else {
      username = getRandomUsername();
      avatar = getMixedAvatar(username);
    }

    slots.push({ id: `slot-${i}-${Math.random()}`, username, avatar, isNew: false });
  }
  return slots;
}

export function generateSingleParticipant(roomId?: string): ParticipantSlot {
  let username: string;
  let avatar: string;

  if (loadedProfiles.length > 0 && Math.random() < 0.6) {
    const p = loadedProfiles[Math.floor(Math.random() * loadedProfiles.length)];
    username = p.username;
    avatar = Math.random() < 0.6 ? p.avatar : getMixedAvatar(p.username);
  } else {
    username = USERNAMES[Math.floor(Math.random() * USERNAMES.length)];
    avatar = getMixedAvatar(username);
  }

  return { id: `slot-new-${Date.now()}-${Math.random()}`, username, avatar, isNew: true };
}
