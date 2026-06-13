import type { DeskTab } from '../../components/DesktopNav';

export interface MorePageProps {
  onNavigate: (tab: DeskTab) => void;
}

export const openAuthRegister = () =>
  window.dispatchEvent(new CustomEvent('open-auth', { detail: { mode: 'register' } }));
