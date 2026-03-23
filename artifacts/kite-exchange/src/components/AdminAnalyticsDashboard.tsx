import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Eye, Users, Globe, TrendingUp, Clock, MousePointer, X } from 'lucide-react';

interface OnlineUser {
  session_id: string;
  auth_user_id: string | null;
  username: string;
  avatar_url: string | null;
  current_page: string;
  country_code: string;
  country_name: string;
  device_type: string;
  last_activity_at: string;
  duration_on_current_page: number;
}

interface AnalyticsSummary {
  online_now: number;
  total_sessions_today: number;
  total_events_today: number;
  anonymous_visitors_today: number;
  registered_users_today: number;
  top_countries: Array<{ country_name: string; country_code: string; count: number }>;
  top_pages: Array<{ page_path: string; total_views: number; unique_visitors: number; avg_duration_seconds: number }>;
  conversion_funnel: {
    home_views: number;
    markets_views: number;
    trade_views: number;
    registrations: number;
  };
}

interface UserJourneyEvent {
  event_type: string;
  page_path: string;
  element_id?: string;
  element_text?: string;
  duration_seconds: number;
  created_at: string;
}

export default function AdminAnalyticsDashboard({ onClose }: { onClose: () => void }) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [userJourney, setUserJourney] = useState<UserJourneyEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
    const interval = setInterval(loadAnalytics, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedSession) {
      loadUserJourney(selectedSession);
    }
  }, [selectedSession]);

  useEffect(() => {
    const channel = supabase
      .channel('analytics_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'analytics_online_users'
      }, () => {
        loadOnlineUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAnalytics = async () => {
    try {
      const { data, error } = await supabase.rpc('get_analytics_summary');
      if (!error && data) {
        setSummary(data);
      }
      await loadOnlineUsers();
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOnlineUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('analytics_online_users')
        .select('*')
        .order('last_activity_at', { ascending: false });

      if (!error && data) {
        setOnlineUsers(data);
      }
    } catch (error) {
      console.error('Failed to load online users:', error);
    }
  };

  const loadUserJourney = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_user_journey', {
        p_session_id: sessionId
      });

      if (!error && data) {
        setUserJourney(data);
      }
    } catch (error) {
      console.error('Failed to load user journey:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'page_view': return '📄';
      case 'button_click': return '🖱️';
      case 'modal_open': return '🔲';
      case 'modal_close': return '✖️';
      case 'form_submit': return '📝';
      case 'user_registered': return '✅';
      default: return '•';
    }
  };

  const getDeviceEmoji = (device: string) => {
    switch (device) {
      case 'mobile': return '📱';
      case 'tablet': return '📱';
      case 'desktop': return '💻';
      default: return '🖥️';
    }
  };

  const calculateConversionRate = () => {
    if (!summary) return 0;
    const { home_views, registrations } = summary.conversion_funnel;
    if (home_views === 0) return 0;
    return ((registrations / home_views) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-gray-900 rounded-xl p-8">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-2xl w-full max-w-7xl max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Eye className="w-7 h-7 text-blue-400" />
              User Analytics Dashboard
            </h2>
            <p className="text-gray-400 text-sm mt-1">Real-time user tracking & behavior analysis</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 rounded-xl p-4 border border-green-700/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-400 text-sm">Online Now</p>
                  <p className="text-3xl font-bold text-white mt-1">{summary?.online_now || 0}</p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-400" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-300">Live tracking</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 rounded-xl p-4 border border-blue-700/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-400 text-sm">Sessions Today</p>
                  <p className="text-3xl font-bold text-white mt-1">{summary?.total_sessions_today || 0}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <Globe className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 rounded-xl p-4 border border-purple-700/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-400 text-sm">Events Today</p>
                  <p className="text-3xl font-bold text-white mt-1">{summary?.total_events_today || 0}</p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <MousePointer className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-900/50 to-orange-800/30 rounded-xl p-4 border border-orange-700/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-400 text-sm">Anonymous</p>
                  <p className="text-3xl font-bold text-white mt-1">{summary?.anonymous_visitors_today || 0}</p>
                </div>
                <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <Eye className="w-6 h-6 text-orange-400" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-900/50 to-emerald-800/30 rounded-xl p-4 border border-emerald-700/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-400 text-sm">Registered</p>
                  <p className="text-3xl font-bold text-white mt-1">{summary?.registered_users_today || 0}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Online Users & Countries */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Online Users */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                Live Users ({onlineUsers.length})
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {onlineUsers.map((user) => (
                  <div
                    key={user.session_id}
                    onClick={() => setSelectedSession(user.session_id)}
                    className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30 hover:border-blue-500/50 cursor-pointer transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {user.username?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium truncate">
                            {user.username || 'Anonymous'}
                          </span>
                          <span className="text-xs">{getDeviceEmoji(user.device_type)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">
                            {user.country_code} {user.country_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-blue-400">{user.current_page}</span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-500">{formatDuration(user.duration_on_current_page)}</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">{formatTime(user.last_activity_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Countries */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-400" />
                Top Countries Today
              </h3>
              <div className="space-y-2">
                {summary?.top_countries?.slice(0, 10).map((country, index) => (
                  <div key={country.country_code} className="flex items-center gap-3">
                    <span className="text-gray-500 font-medium w-6">{index + 1}</span>
                    <span className="text-2xl">{country.country_code}</span>
                    <span className="text-white flex-1">{country.country_name}</span>
                    <span className="text-blue-400 font-bold">{country.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Pages & Conversion Funnel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Pages */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                Popular Pages
              </h3>
              <div className="space-y-3">
                {summary?.top_pages?.slice(0, 8).map((page) => (
                  <div key={page.page_path} className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{page.page_path}</span>
                      <span className="text-blue-400 font-bold">{page.total_views} views</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>{page.unique_visitors} unique</span>
                      <span>•</span>
                      <span>Avg {formatDuration(page.avg_duration_seconds)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Conversion Funnel */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Conversion Funnel
              </h3>
              {summary?.conversion_funnel && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="bg-blue-900/30 rounded-lg p-4 border-l-4 border-blue-500">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">Home Page Views</span>
                        <span className="text-2xl font-bold text-blue-400">{summary.conversion_funnel.home_views}</span>
                      </div>
                      <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }}></div>
                      </div>
                    </div>

                    <div className="bg-purple-900/30 rounded-lg p-4 border-l-4 border-purple-500">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">Markets Page</span>
                        <span className="text-2xl font-bold text-purple-400">{summary.conversion_funnel.markets_views}</span>
                      </div>
                      <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${(summary.conversion_funnel.markets_views / summary.conversion_funnel.home_views * 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="bg-orange-900/30 rounded-lg p-4 border-l-4 border-orange-500">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">Trade Page</span>
                        <span className="text-2xl font-bold text-orange-400">{summary.conversion_funnel.trade_views}</span>
                      </div>
                      <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full"
                          style={{ width: `${(summary.conversion_funnel.trade_views / summary.conversion_funnel.home_views * 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="bg-green-900/30 rounded-lg p-4 border-l-4 border-green-500">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">Registrations</span>
                        <span className="text-2xl font-bold text-green-400">{summary.conversion_funnel.registrations}</span>
                      </div>
                      <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${(summary.conversion_funnel.registrations / summary.conversion_funnel.home_views * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-900/50 to-blue-900/50 rounded-lg p-4 border border-green-700/30">
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Conversion Rate</p>
                      <p className="text-4xl font-bold text-green-400 mt-1">{calculateConversionRate()}%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* User Journey Modal */}
          {selectedSession && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-gray-900 rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-y-auto border border-gray-700">
                <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Clock className="w-6 h-6 text-blue-400" />
                    User Journey
                  </h3>
                  <button
                    onClick={() => setSelectedSession(null)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {userJourney.map((event, index) => (
                      <div
                        key={index}
                        className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30 hover:border-blue-500/30 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{getEventIcon(event.event_type)}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">{event.event_type.replace('_', ' ')}</span>
                              {event.duration_seconds > 0 && (
                                <>
                                  <span className="text-gray-600">•</span>
                                  <span className="text-gray-400 text-sm">{formatDuration(event.duration_seconds)}</span>
                                </>
                              )}
                            </div>
                            <p className="text-blue-400 text-sm mt-1">{event.page_path}</p>
                            {event.element_id && (
                              <p className="text-gray-500 text-xs mt-1">
                                {event.element_text || event.element_id}
                              </p>
                            )}
                            <p className="text-gray-600 text-xs mt-2">{new Date(event.created_at).toLocaleString('tr-TR')}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
