import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play, Pause, SkipForward, Radio, Mic, Lock, Crown } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface VoiceMessage {
  id: string;
  user_id: number;
  text_content: string;
  audio_url: string | null;
  emotion: string;
  voice_gender: string;
  voice_name: string;
  category: string;
  play_order: number;
  created_at: string;
  anonymous_profiles: {
    username: string;
    avatar_url: string;
    level: number;
  };
}

export default function VoiceRoomPlayer() {
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<VoiceMessage | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [listeners, setListeners] = useState(0);
  const [voicesCount, setVoicesCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userLevel, setUserLevel] = useState<number>(1);
  const [showPremiumWarning, setShowPremiumWarning] = useState(false);

  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const typeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadMessages();
    loadUserLevel();
    startStatsUpdates();

    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, []);

  const loadUserLevel = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('level')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setUserLevel(profile.level || 1);
      }
    }
  };

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('voice_messages')
      .select(`
        *,
        anonymous_profiles (
          username,
          avatar_url,
          level
        )
      `)
      .eq('is_active', true)
      .order('play_order', { ascending: true })
      .limit(1000);

    if (error) {
      console.error('Error loading voice messages:', error);
      return;
    }

    if (data && data.length > 0) {
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      setMessages(shuffled);
      setListeners(Math.floor(Math.random() * 1205) + 114);
      setVoicesCount(Math.floor(Math.random() * 1207) + 90);
    }
  };

  const startStatsUpdates = () => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
    }

    statsIntervalRef.current = setInterval(() => {
      setListeners(prev => {
        const change = Math.floor(Math.random() * 21) - 10;
        const newValue = prev + change;
        return Math.max(114, Math.min(1318, newValue));
      });

      setVoicesCount(prev => {
        const change = Math.floor(Math.random() * 21) - 10;
        const newValue = prev + change;
        return Math.max(90, Math.min(1296, newValue));
      });
    }, 2500);
  };

  const typeMessage = (text: string) => {
    setTypedText('');
    setIsTyping(true);
    let index = 0;

    if (typeIntervalRef.current) {
      clearInterval(typeIntervalRef.current);
    }

    typeIntervalRef.current = setInterval(() => {
      if (index < text.length) {
        setTypedText(text.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        if (typeIntervalRef.current) {
          clearInterval(typeIntervalRef.current);
        }
      }
    }, 30);
  };

  const playNextMessage = () => {
    if (messages.length === 0) return;

    const nextIndex = currentIndex >= messages.length - 1 ? 0 : currentIndex + 1;
    const nextMessage = messages[nextIndex];

    setCurrentMessage(nextMessage);
    setCurrentIndex(nextIndex);
    setProgress(0);

    typeMessage(nextMessage.text_content);

    const messageDuration = Math.max(5000, nextMessage.text_content.length * 50);

    let elapsed = 0;
    const updateInterval = 100;

    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }

    playIntervalRef.current = setInterval(() => {
      elapsed += updateInterval;
      setProgress((elapsed / messageDuration) * 100);

      if (elapsed >= messageDuration) {
        if (playIntervalRef.current) {
          clearInterval(playIntervalRef.current);
        }
        setTimeout(() => {
          if (isPlaying) {
            playNextMessage();
          }
        }, 2000);
      }
    }, updateInterval);

    const canHearAudio = userLevel >= 4;

    const synth = window.speechSynthesis;
    if (synth && !isMuted && canHearAudio) {
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(nextMessage.text_content);

      const voices = synth.getVoices();
      const preferredVoice = voices.find(voice => {
        if (nextMessage.voice_gender === 'female') {
          return voice.name.includes('Female') ||
                 voice.name.includes('Samantha') ||
                 voice.name.includes('Victoria');
        } else {
          return voice.name.includes('Male') ||
                 voice.name.includes('Daniel');
        }
      });

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      switch (nextMessage.emotion) {
        case 'excited':
        case 'enthusiastic':
          utterance.rate = 1.2;
          utterance.pitch = 1.3;
          break;
        case 'happy':
          utterance.rate = 1.1;
          utterance.pitch = 1.2;
          break;
        case 'calm':
        case 'thoughtful':
          utterance.rate = 0.9;
          utterance.pitch = 0.9;
          break;
        default:
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
      }

      utterance.volume = volume;

      try {
        synth.speak(utterance);
      } catch (error) {
        console.log('Speech synthesis not available');
      }
    }

    if (!canHearAudio && !showPremiumWarning) {
      setShowPremiumWarning(true);
      setTimeout(() => setShowPremiumWarning(false), 5000);
    }
  };

  const handleJoinVoiceRoom = () => {
    if (messages.length === 0) {
      alert('Loading voice messages... Please try again in a moment.');
      loadMessages();
      return;
    }

    setIsPlaying(true);
    playNextMessage();
  };

  const handleLeaveVoiceRoom = () => {
    setIsPlaying(false);
    setCurrentMessage(null);
    setProgress(0);
    setTypedText('');
    setIsTyping(false);
    setShowPremiumWarning(false);

    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }
    if (typeIntervalRef.current) {
      clearInterval(typeIntervalRef.current);
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const handlePauseResume = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.pause();
      }
    } else {
      setIsPlaying(true);
      if (currentMessage) {
        playNextMessage();
      } else {
        handleJoinVoiceRoom();
      }
    }
  };

  const handleSkip = () => {
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }
    if (typeIntervalRef.current) {
      clearInterval(typeIntervalRef.current);
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    playNextMessage();
  };

  const toggleMute = () => {
    if (userLevel < 4) {
      setShowPremiumWarning(true);
      setTimeout(() => setShowPremiumWarning(false), 5000);
      return;
    }

    setIsMuted(!isMuted);
    if (window.speechSynthesis) {
      if (!isMuted) {
        window.speechSynthesis.cancel();
      }
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setListeners(prev => {
        const change = Math.floor(Math.random() * 16) - 6;
        return Math.max(114, Math.min(1318, prev + change));
      });
    }, 8000);

    return () => {
      clearInterval(interval);
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
      if (typeIntervalRef.current) clearInterval(typeIntervalRef.current);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  if (messages.length === 0) {
    return (
      <div className="bg-[#1A1B23] rounded-xl p-3 mb-2 border border-[#2B3139]/80 flex items-center gap-2">
        <Radio className="w-4 h-4 text-[#F0B90B] animate-pulse" />
        <span className="text-gray-500 text-xs">Loading voice room...</span>
      </div>
    );
  }

  const canHearAudio = userLevel >= 4;

  return (
    <div className="bg-[#1A1B23] rounded-xl p-2.5 mb-2 border border-[#2B3139]/80 relative">
      {showPremiumWarning && (
        <div className="absolute top-1 left-1/2 -translate-x-1/2 z-10 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-lg shadow-lg flex items-center gap-1.5 text-xs font-semibold animate-bounce">
          <Crown className="w-3.5 h-3.5" />
          <span>Unlock at L4!</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="relative bg-[#F0B90B]/10 border border-[#F0B90B]/30 p-1.5 rounded-lg flex-shrink-0">
            <Radio className="w-3.5 h-3.5 text-[#F0B90B]" />
            {isPlaying && (
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-white font-semibold text-sm">VOICE ROOM</h3>
              <div className="flex items-center gap-0.5 bg-red-500/20 border border-red-500/40 px-1.5 py-0.5 rounded-full">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse"></div>
                <span className="text-red-400 text-[10px] font-bold">LIVE</span>
              </div>
              {!canHearAudio && (
                <div className="flex items-center gap-0.5 bg-[#F0B90B]/20 border border-[#F0B90B]/40 px-1.5 py-0.5 rounded-full">
                  <Lock className="w-2.5 h-2.5 text-[#F0B90B]" />
                  <span className="text-[#F0B90B] text-[10px] font-bold">L4+</span>
                </div>
              )}
            </div>
            <div className="text-gray-500 text-[11px] flex items-center gap-1.5">
              <span className="text-gray-400">{listeners.toLocaleString()}</span>
              <span>•</span>
              <span>{voicesCount.toLocaleString()} voices</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!isPlaying ? (
            <button
              onClick={handleJoinVoiceRoom}
              className="flex items-center gap-1.5 bg-[#F0B90B] hover:bg-[#e0a800] text-black px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
            >
              <Play className="w-3 h-3" />
              Join
            </button>
          ) : (
            <>
              <button
                onClick={handleSkip}
                className="bg-[#2B3139] hover:bg-[#363d47] text-gray-300 p-1.5 rounded-lg transition-all active:scale-95"
                title="Skip"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleLeaveVoiceRoom}
                className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all active:scale-95"
              >
                Leave
              </button>
            </>
          )}
        </div>
      </div>

      {currentMessage && isPlaying && (
        <div className="bg-[#0D0E12] rounded-lg p-2 mt-2 border border-[#2B3139]/80">
          <div className="flex items-start gap-2">
            <img
              src={currentMessage.anonymous_profiles?.avatar_url || `https://i.pravatar.cc/150?img=${currentMessage.user_id}`}
              alt={currentMessage.anonymous_profiles?.username || 'User'}
              className="w-8 h-8 rounded-full border border-[#2B3139] flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-white font-medium text-xs truncate">
                  {currentMessage.anonymous_profiles?.username || 'Anonymous'}
                </span>
                <span className="text-gray-500 text-[10px] flex-shrink-0">
                  Lv.{currentMessage.anonymous_profiles?.level || 1}
                </span>
                {!canHearAudio && (
                  <Lock className="w-2.5 h-2.5 text-[#F0B90B] flex-shrink-0" />
                )}
              </div>
              <p className="text-gray-300 text-xs leading-snug mb-1">
                {typedText}
                {isTyping && <span className="animate-pulse">▊</span>}
              </p>
              <div className="w-full bg-[#2B3139] rounded-full h-1 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-100 ${
                    canHearAudio ? 'bg-[#F0B90B]' : 'bg-gray-600'
                  }`}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!canHearAudio && !isPlaying && (
        <div className="mt-2 bg-[#F0B90B]/5 border border-[#F0B90B]/20 rounded-lg p-2">
          <div className="flex items-center gap-1.5">
            <Crown className="w-3 h-3 text-[#F0B90B] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[#F0B90B]/80 text-[10px] leading-tight">
                Reach Level 4 to unlock audio
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <div className="flex-1 bg-[#2B3139] rounded-full h-1 overflow-hidden">
                  <div
                    className="h-full bg-[#F0B90B] rounded-full transition-all duration-500"
                    style={{ width: `${(userLevel / 4) * 100}%` }}
                  ></div>
                </div>
                <span className="text-[#F0B90B] text-[10px] font-semibold flex-shrink-0">
                  {userLevel}/4
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
