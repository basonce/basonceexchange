import { supabase } from './supabase';

export interface Agent {
  id: string;
  name: string;
  country_code: string;
  country_name: string;
  avatar_url: string;
  status: string;
  languages: string[];
  specialty: string;
  flag: string;
  flag_emoji?: string;
  language_code?: string;
  timezone: string;
  region: string;
  active_tickets: number;
}

interface AssignmentOptions {
  countryCode?: string;
  language?: string;
  specialty?: 'trading' | 'deposits' | 'technical' | 'account';
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickWeightedRandom<T>(arr: T[]): T {
  if (arr.length <= 3) return pickRandom(arr);
  const topCandidates = arr.slice(0, Math.min(8, arr.length));
  return pickRandom(topCandidates);
}

const LANG_NAME_TO_CODE: Record<string, string> = {
  'turkish': 'tr', 'english': 'en', 'spanish': 'es', 'german': 'de',
  'french': 'fr', 'italian': 'it', 'dutch': 'nl', 'portuguese': 'pt',
  'russian': 'ru', 'polish': 'pl', 'chinese': 'zh', 'japanese': 'ja',
  'korean': 'ko', 'arabic': 'ar', 'hindi': 'hi',
};

function langMatches(agentLangs: string[], language: string): boolean {
  const needle = language.toLowerCase();
  const needleCode = LANG_NAME_TO_CODE[needle] || needle;
  return agentLangs.some((lang: string) => {
    const l = lang.toLowerCase();
    return l === needleCode || l === needle || l.includes(needle) || needle.includes(l);
  });
}

export async function assignBestAgent(options: AssignmentOptions = {}): Promise<Agent | null> {
  try {
    const { countryCode, language = 'English', specialty } = options;

    const { data: allAgents } = await supabase
      .from('support_agents')
      .select('*')
      .eq('status', 'online')
      .order('active_tickets', { ascending: true })
      .limit(100);

    if (!allAgents || allAgents.length === 0) return null;

    let pool = allAgents;

    if (countryCode) {
      const countryAgents = allAgents.filter(a => a.country_code === countryCode.toUpperCase());
      if (countryAgents.length > 0) pool = countryAgents;
    }

    const langAgents = pool.filter(a => langMatches(a.languages, language));
    if (langAgents.length > 0) pool = langAgents;

    if (specialty) {
      const specAgents = pool.filter(a => a.specialty === specialty);
      if (specAgents.length > 0) pool = specAgents;
    }

    if (pool.length === 0) pool = allAgents;

    pool.sort((a, b) => a.active_tickets - b.active_tickets);
    return pickWeightedRandom(pool) as Agent;
  } catch (error) {
    console.error('Error assigning agent:', error);
    return null;
  }
}

export async function assignAgentByCountry(countryCode: string): Promise<Agent | null> {
  return assignBestAgent({ countryCode });
}

export async function getAgentsByRegion(region: string): Promise<Agent[]> {
  try {
    const { data, error } = await supabase
      .from('support_agents')
      .select('*')
      .eq('region', region)
      .eq('status', 'online')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as Agent[];
  } catch (error) {
    console.error('Error fetching agents by region:', error);
    return [];
  }
}

export async function getAllAgents(): Promise<Agent[]> {
  try {
    const { data, error } = await supabase
      .from('support_agents')
      .select('*')
      .eq('status', 'online')
      .order('country_name', { ascending: true });

    if (error) throw error;
    return (data || []) as Agent[];
  } catch (error) {
    console.error('Error fetching all agents:', error);
    return [];
  }
}

export async function getAgentStats() {
  try {
    const { data, error } = await supabase
      .from('support_agents')
      .select('country_code, region, status')
      .eq('status', 'online');

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      byRegion: {} as Record<string, number>,
      byCountry: {} as Record<string, number>
    };

    data?.forEach(agent => {
      stats.byRegion[agent.region] = (stats.byRegion[agent.region] || 0) + 1;
      stats.byCountry[agent.country_code] = (stats.byCountry[agent.country_code] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error('Error fetching agent stats:', error);
    return { total: 0, byRegion: {}, byCountry: {} };
  }
}
