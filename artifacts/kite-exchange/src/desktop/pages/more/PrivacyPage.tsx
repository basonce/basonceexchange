import { useState } from 'react';
import { Lock, ShieldCheck, ArrowRight, ChevronRight, Database } from 'lucide-react';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';

const LAST_UPDATED = 'February 3, 2026';

interface Section {
  id: string;
  num: string;
  title: string;
  body: string[];
}

const DATA_TABLE: { category: string; examples: string; purpose: string }[] = [
  { category: 'Identity Data', examples: 'Full name, date of birth, nationality, government ID', purpose: 'Account creation and KYC verification' },
  { category: 'Contact Data', examples: 'Email address, phone number, residential address', purpose: 'Communication and security notices' },
  { category: 'Financial Data', examples: 'Wallet addresses, transaction history, bank details', purpose: 'Processing trades, deposits and withdrawals' },
  { category: 'Technical Data', examples: 'IP address, device identifiers, browser type', purpose: 'Security, fraud prevention and analytics' },
  { category: 'Usage Data', examples: 'Pages viewed, features used, session duration', purpose: 'Improving and personalizing the platform' },
  { category: 'Biometric Data', examples: 'Facial-match data from liveness checks', purpose: 'Identity verification and account recovery' },
];

const SECTIONS: Section[] = [
  {
    id: 'intro',
    num: '1',
    title: 'Introduction',
    body: [
      'This Privacy Policy explains how Basonce collects, uses, discloses, and safeguards your personal data when you use our platform. We are committed to protecting your privacy and handling your data in a transparent and lawful manner.',
      'By using the Services you acknowledge the practices described in this Policy. Where required by law, we will obtain your consent for specific processing activities.',
    ],
  },
  {
    id: 'collect',
    num: '2',
    title: 'Data We Collect',
    body: [
      'We collect personal data that you provide directly, data generated through your use of the Services, and data obtained from third parties such as identity-verification providers, blockchain analytics firms, and sanctions-screening services. The summary table above sets out the principal categories of data we process.',
    ],
  },
  {
    id: 'use',
    num: '3',
    title: 'How We Use Your Data',
    body: [
      'We use your data to provide and operate the Services; verify your identity and prevent fraud; comply with legal and regulatory obligations; secure our systems; communicate with you; and improve and personalize your experience.',
      'We may use aggregated or de-identified data, which can no longer be associated with you, for research, analytics, and business reporting.',
    ],
  },
  {
    id: 'legal-bases',
    num: '4',
    title: 'Legal Bases for Processing',
    body: [
      'Where data-protection law applies, we rely on one or more of the following legal bases: performance of a contract with you; compliance with a legal obligation; our legitimate interests in operating a secure and effective platform; and your consent, where applicable.',
      'You may withdraw consent at any time where processing is based on consent, without affecting the lawfulness of prior processing.',
    ],
  },
  {
    id: 'sharing',
    num: '5',
    title: 'How We Share Your Data',
    body: [
      'We do not sell your personal data. We may share data with service providers acting on our behalf, affiliated entities, regulators and law-enforcement authorities where legally required, and with parties to a corporate transaction such as a merger or acquisition.',
      'All third parties are required to protect your data and use it only for the purposes for which it was disclosed.',
    ],
  },
  {
    id: 'transfers',
    num: '6',
    title: 'International Transfers',
    body: [
      'Your data may be transferred to and processed in countries other than your own. Where we transfer personal data across borders, we implement appropriate safeguards such as standard contractual clauses or equivalent mechanisms to ensure your data remains protected.',
    ],
  },
  {
    id: 'retention',
    num: '7',
    title: 'Data Retention',
    body: [
      'We retain personal data for as long as necessary to provide the Services and to meet our legal, regulatory, accounting, and reporting obligations. Retention periods for AML and financial records are typically governed by statute and may extend several years after account closure.',
    ],
  },
  {
    id: 'rights',
    num: '8',
    title: 'Your Rights',
    body: [
      'Depending on your jurisdiction, you may have the right to access, correct, delete, restrict, or object to the processing of your personal data, as well as the right to data portability and the right to lodge a complaint with a supervisory authority.',
      'To exercise your rights, contact us through the channels described in the Contact section. We may need to verify your identity before responding to a request.',
    ],
  },
  {
    id: 'security',
    num: '9',
    title: 'Data Security',
    body: [
      'We employ technical and organizational measures designed to protect your data, including encryption in transit and at rest, access controls, network segmentation, continuous monitoring, and the majority of customer funds held in cold storage. No system is perfectly secure, and we cannot guarantee absolute security.',
    ],
  },
  {
    id: 'children',
    num: '10',
    title: 'Children\u2019s Privacy',
    body: [
      'The Services are not directed to individuals under the age of 18. We do not knowingly collect personal data from minors. If we become aware that we have collected such data, we will take steps to delete it.',
    ],
  },
  {
    id: 'contact',
    num: '11',
    title: 'Changes & Contact',
    body: [
      'We may update this Privacy Policy from time to time. Material changes will be notified through the platform or by other appropriate means. The "Last updated" date reflects the latest revision.',
      'For privacy enquiries or to exercise your rights, please contact our Data Protection team through your account support center.',
    ],
  },
];

export default function PrivacyPage({ onNavigate }: MorePageProps) {
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] font-sans pb-24">
      {/* Document Header */}
      <section className="bg-[#181A20] border-b border-[#2B3139]">
        <div className="max-w-[1200px] mx-auto px-6 py-16">
          <div className="flex items-center gap-2 text-xs text-[#848E9C] mb-6 uppercase tracking-widest">
            <span>Legal</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#EAECEF]">Privacy Policy</span>
          </div>
          <div className="flex items-start gap-5">
            <div className="shrink-0 w-14 h-14 rounded-xl bg-[#2B3139] flex items-center justify-center">
              <Lock className="w-7 h-7 text-[#F0B90B]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight mb-3">Privacy Policy</h1>
              <p className="text-[#B7BDC6] max-w-3xl leading-relaxed">
                How Basonce collects, uses, and protects your personal data, and the rights you have over it. Your trust is
                the foundation of our platform.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-[#848E9C]">
                <ShieldCheck className="w-4 h-4" />
                <span>Last updated: <span className="text-[#EAECEF] font-medium">{LAST_UPDATED}</span></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="max-w-[1200px] mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10">
        {/* TOC */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <div className="text-xs font-semibold text-[#848E9C] uppercase tracking-widest mb-4">Table of Contents</div>
            <nav className="space-y-1">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  onClick={() => setActive(s.id)}
                  className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active === s.id
                      ? 'bg-[#1E2329] text-[#F0B90B]'
                      : 'text-[#848E9C] hover:text-[#EAECEF] hover:bg-[#181A20]'
                  }`}
                >
                  <span className="tabular-nums shrink-0 w-5">{s.num}.</span>
                  <span className="min-w-0">{s.title}</span>
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Sections */}
        <main className="min-w-0">
          {/* Signature module: data-we-collect summary table */}
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-[#F0B90B]" />
              <h2 className="text-lg font-bold text-white">Data We Collect — At a Glance</h2>
            </div>
            <div className="border border-[#2B3139] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="bg-[#1E2329] text-left text-[#848E9C] uppercase text-xs tracking-wider">
                      <th className="px-5 py-3 font-semibold">Category</th>
                      <th className="px-5 py-3 font-semibold">Examples</th>
                      <th className="px-5 py-3 font-semibold">Primary Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DATA_TABLE.map((row, i) => (
                      <tr key={i} className={`${i !== 0 ? 'border-t border-[#2B3139]' : ''} bg-[#181A20]`}>
                        <td className="px-5 py-4 font-semibold text-[#EAECEF] whitespace-nowrap">{row.category}</td>
                        <td className="px-5 py-4 text-[#B7BDC6]">{row.examples}</td>
                        <td className="px-5 py-4 text-[#848E9C]">{row.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-12">
            {SECTIONS.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-[#F0B90B] font-bold text-lg tabular-nums">{s.num}.</span>
                  <h2 className="text-xl font-bold text-white tracking-tight">{s.title}</h2>
                </div>
                <div className="space-y-4 pl-0 lg:pl-8">
                  {s.body.map((p, i) => (
                    <p key={i} className="text-[#B7BDC6] text-[15px] leading-relaxed">{p}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Closing CTA */}
          <div className="mt-16 bg-[#181A20] border border-[#2B3139] rounded-xl p-8 text-center">
            <h3 className="text-xl font-bold text-white mb-3">Your data, protected by design</h3>
            <p className="text-[#848E9C] mb-6 max-w-xl mx-auto">
              Join millions of users who trust Basonce with bank-grade encryption and rigorous privacy controls.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={openAuthRegister}
                className="px-8 py-3 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors flex items-center gap-2"
              >
                Create Account
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate('home')}
                className="px-8 py-3 bg-transparent border border-[#2B3139] hover:bg-[#2B3139] text-white font-bold rounded-lg transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
