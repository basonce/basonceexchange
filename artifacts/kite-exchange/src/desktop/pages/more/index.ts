import type { ComponentType } from 'react';
import type { MorePageProps } from './types';
import VipPage from './VipPage';
import AffiliatePage from './AffiliatePage';
import ReferralPage from './ReferralPage';
import JuniorPage from './JuniorPage';
import LaunchpoolPage from './LaunchpoolPage';
import MegadropPage from './MegadropPage';
import MiningPoolPage from './MiningPoolPage';
import AiProPage from './AiProPage';
import PayPage from './PayPage';
import NftPage from './NftPage';
import FanTokenPage from './FanTokenPage';
import WalletPage from './WalletPage';
import ChainPage from './ChainPage';
import AcademyPage from './AcademyPage';
import CharityPage from './CharityPage';
import TravelRulePage from './TravelRulePage';
import AboutPage from './AboutPage';
import CareersPage from './CareersPage';
import PressPage from './PressPage';
import CommunityPage from './CommunityPage';
import AnnouncementsPage from './AnnouncementsPage';
import NewsPage from './NewsPage';
import NoticesPage from './NoticesPage';
import ApiPage from './ApiPage';
import FeesPage from './FeesPage';
import TradingRulesPage from './TradingRulesPage';
import HelpCenterPage from './HelpCenterPage';
import ChatSupportPage from './ChatSupportPage';
import SubmitRequestPage from './SubmitRequestPage';
import LawEnforcementPage from './LawEnforcementPage';
import CryptoGlossaryPage from './CryptoGlossaryPage';
import TradingGuidePage from './TradingGuidePage';
import TermsPage from './TermsPage';
import PrivacyPage from './PrivacyPage';
import CookiesPage from './CookiesPage';
import RiskWarningPage from './RiskWarningPage';

export const MORE_PAGE_COMPONENTS: Record<string, ComponentType<MorePageProps>> = {
  vip: VipPage,
  affiliate: AffiliatePage,
  referral: ReferralPage,
  junior: JuniorPage,
  launchpool: LaunchpoolPage,
  megadrop: MegadropPage,
  miningpool: MiningPoolPage,
  aipro: AiProPage,
  pay: PayPage,
  nft: NftPage,
  fantoken: FanTokenPage,
  wallet: WalletPage,
  chain: ChainPage,
  academy: AcademyPage,
  charity: CharityPage,
  travelrule: TravelRulePage,
  about: AboutPage,
  careers: CareersPage,
  press: PressPage,
  community: CommunityPage,
  announcements: AnnouncementsPage,
  news: NewsPage,
  notices: NoticesPage,
  api: ApiPage,
  fees: FeesPage,
  tradingrules: TradingRulesPage,
  helpcenter: HelpCenterPage,
  chatsupport: ChatSupportPage,
  submitrequest: SubmitRequestPage,
  lawenforcement: LawEnforcementPage,
  glossary: CryptoGlossaryPage,
  guide: TradingGuidePage,
  terms: TermsPage,
  privacy: PrivacyPage,
  cookies: CookiesPage,
  riskwarning: RiskWarningPage,
};
