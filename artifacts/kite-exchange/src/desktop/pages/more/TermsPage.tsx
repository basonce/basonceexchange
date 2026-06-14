import { useState } from 'react';
import { FileText, ScrollText, ArrowRight, ChevronRight } from 'lucide-react';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';

const LAST_UPDATED = 'January 14, 2026';

interface Section {
  id: string;
  num: string;
  title: string;
  body: string[];
}

const SECTIONS: Section[] = [
  {
    id: 'acceptance',
    num: '1',
    title: 'Acceptance of Terms',
    body: [
      'These Terms of Service ("Terms") govern your access to and use of the Basonce platform, including our websites, mobile applications, application programming interfaces, and all related products and services (collectively, the "Services"). By creating an account, accessing, or using any part of the Services, you confirm that you have read, understood, and agree to be bound by these Terms in their entirety.',
      'If you do not agree with any provision of these Terms, you must not access or use the Services. We may require you to affirmatively accept these Terms before completing registration or before using specific features.',
    ],
  },
  {
    id: 'eligibility',
    num: '2',
    title: 'Eligibility',
    body: [
      'You must be at least 18 years of age, or the age of legal majority in your jurisdiction, and possess full legal capacity to enter into a binding contract. By using the Services you represent and warrant that you meet these requirements.',
      'The Services are not available to persons located in, resident in, or organized under the laws of any jurisdiction subject to comprehensive sanctions, or to any person on an applicable sanctions or restricted-parties list. You are responsible for ensuring that your use of the Services is lawful in your jurisdiction.',
    ],
  },
  {
    id: 'accounts',
    num: '3',
    title: 'Account Registration & Security',
    body: [
      'To access most features you must register for an account and complete identity verification ("KYC") as required by applicable law. You agree to provide accurate, current, and complete information and to keep it updated.',
      'You are solely responsible for maintaining the confidentiality of your credentials, including passwords, two-factor authentication devices, and API keys. You are responsible for all activity that occurs under your account. Notify us immediately of any unauthorized access or suspected breach of security.',
    ],
  },
  {
    id: 'services',
    num: '4',
    title: 'Description of Services',
    body: [
      'Basonce provides a digital-asset trading venue together with related custodial, conversion, staking, and informational tools. Availability of specific products may vary by jurisdiction and may be modified, suspended, or discontinued at our discretion.',
      'Nothing in the Services constitutes investment, financial, legal, or tax advice. Any market data, analytics, or educational content is provided for general information only and should not be relied upon as the basis for any transaction.',
    ],
  },
  {
    id: 'verification',
    num: '5',
    title: 'Identity Verification & Compliance',
    body: [
      'We operate a risk-based compliance program in accordance with anti-money-laundering ("AML") and counter-terrorist-financing ("CTF") obligations. We may request additional documentation, impose limits, delay transactions, or freeze accounts where reasonably necessary to meet our legal and regulatory duties.',
      'You agree to cooperate with all verification, screening, and audit requests. Failure to provide requested information may result in restriction or termination of access to the Services.',
    ],
  },
  {
    id: 'prohibited',
    num: '6',
    title: 'Prohibited Activities',
    body: [
      'You must not use the Services to engage in any unlawful, fraudulent, or abusive conduct. Prohibited activities include, without limitation: market manipulation, wash trading, spoofing, money laundering, financing of terrorism, evasion of sanctions, unauthorized access to systems, and any use that infringes the rights of others.',
      'You may not deploy bots, scrapers, or other automated means to access the Services except through our published APIs and within applicable rate limits. We reserve the right to investigate and take action, including reporting to authorities, in respect of any suspected violation.',
    ],
  },
  {
    id: 'fees',
    num: '7',
    title: 'Fees & Payments',
    body: [
      'Trading, withdrawal, conversion, and other applicable fees are published in our fee schedule and may be updated from time to time. By transacting on the platform you authorize us to deduct applicable fees from your account.',
      'Network and blockchain fees are determined by the relevant network and are outside our control. You are responsible for any taxes arising from your use of the Services.',
    ],
  },
  {
    id: 'risk',
    num: '8',
    title: 'Assumption of Risk',
    body: [
      'Digital assets are highly volatile and may lose value rapidly and without warning. Leverage and derivatives products can amplify both gains and losses, and you may lose more than your initial deposit on margin products. You acknowledge that you understand and voluntarily assume these risks.',
      'You are responsible for evaluating the merits and risks of any transaction. We do not guarantee profits, the performance of any asset, or the continued availability of any market.',
    ],
  },
  {
    id: 'ip',
    num: '9',
    title: 'Intellectual Property',
    body: [
      'All content, software, trademarks, logos, and other materials made available through the Services are owned by or licensed to Basonce and are protected by intellectual-property laws. Except as expressly permitted, you may not copy, modify, distribute, or create derivative works from any part of the Services.',
    ],
  },
  {
    id: 'liability',
    num: '10',
    title: 'Disclaimers & Limitation of Liability',
    body: [
      'The Services are provided on an "as is" and "as available" basis without warranties of any kind, whether express or implied, including warranties of merchantability, fitness for a particular purpose, and non-infringement.',
      'To the maximum extent permitted by law, Basonce and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or for any loss of profits, revenues, data, or goodwill arising out of or in connection with your use of the Services.',
    ],
  },
  {
    id: 'termination',
    num: '11',
    title: 'Suspension & Termination',
    body: [
      'We may suspend or terminate your access to the Services, in whole or in part, at any time and without prior notice where we reasonably believe it is necessary to protect the platform, comply with law, or address a violation of these Terms.',
      'Upon termination, your right to use the Services ceases immediately. Provisions that by their nature should survive termination — including fees owed, intellectual property, disclaimers, and limitations of liability — will survive.',
    ],
  },
  {
    id: 'governing-law',
    num: '12',
    title: 'Governing Law & Dispute Resolution',
    body: [
      'These Terms are governed by and construed in accordance with the laws of the jurisdiction in which the relevant Basonce contracting entity is incorporated, without regard to conflict-of-law principles.',
      'Any dispute arising out of or relating to these Terms shall be resolved through binding arbitration on an individual basis, except where prohibited by applicable law. We may update these Terms from time to time; continued use after changes take effect constitutes acceptance of the revised Terms.',
    ],
  },
];

export default function TermsPage({ onNavigate }: MorePageProps) {
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] font-sans pb-24">
      {/* Document Header */}
      <section className="bg-[#181A20] border-b border-[#2B3139]">
        <div className="max-w-[1200px] mx-auto px-6 py-16">
          <div className="flex items-center gap-2 text-xs text-[#848E9C] mb-6 uppercase tracking-widest">
            <span>Legal</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#EAECEF]">Terms of Service</span>
          </div>
          <div className="flex items-start gap-5">
            <div className="shrink-0 w-14 h-14 rounded-xl bg-[#2B3139] flex items-center justify-center">
              <ScrollText className="w-7 h-7 text-[#F0B90B]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight mb-3">Terms of Service</h1>
              <p className="text-[#B7BDC6] max-w-3xl leading-relaxed">
                The agreement between you and Basonce that governs your access to and use of our platform and services.
                Please read these Terms carefully and retain a copy for your records.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-[#848E9C]">
                <FileText className="w-4 h-4" />
                <span>Last updated: <span className="text-[#EAECEF] font-medium">{LAST_UPDATED}</span></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Body: TOC + Sections */}
      <div className="max-w-[1200px] mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10">
        {/* Sticky TOC */}
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
          <div className="bg-[#181A20] border border-[#2B3139] rounded-xl p-6 mb-10">
            <div className="text-sm text-[#B7BDC6] leading-relaxed">
              This document is a binding legal agreement. By using Basonce you accept all terms below. If any provision is
              found unenforceable, the remaining provisions will continue in full force and effect.
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
            <h3 className="text-xl font-bold text-white mb-3">Ready to start trading on Basonce?</h3>
            <p className="text-[#848E9C] mb-6 max-w-xl mx-auto">
              Create your account in minutes and access global crypto markets with institutional-grade security.
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
