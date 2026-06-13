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
};
