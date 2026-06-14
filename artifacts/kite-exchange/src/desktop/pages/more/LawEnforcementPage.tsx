import { Scale, FileCheck, ShieldCheck, Lock, Globe2, AlertTriangle, ChevronRight, CheckCircle2, Building2 } from 'lucide-react';
import type { MorePageProps } from './types';

const PROCESS = [
  {
    title: 'Valid legal authority required',
    desc: 'Basonce discloses customer information only in response to legally valid and binding requests issued under applicable law, such as a subpoena, court order, search warrant or mutual legal assistance treaty (MLAT) request.',
  },
  {
    title: 'Official channels only',
    desc: 'Requests must originate from an official government or law enforcement email domain and be submitted on agency letterhead by an authorized officer. Requests received through other channels cannot be processed.',
  },
  {
    title: 'Scope and proportionality',
    desc: 'Each request is reviewed for legal sufficiency, jurisdiction, specificity and proportionality. Overly broad or vague requests will be narrowed or declined in accordance with our policies.',
  },
  {
    title: 'User notification',
    desc: 'Where permitted by law and absent a valid non-disclosure order, Basonce may notify affected users of a request for their information before disclosure.',
  },
];

const CHECKLIST = [
  'Issuing agency name, jurisdiction and case/reference number.',
  'Full name and credentials of the requesting officer.',
  'Legal instrument (subpoena, court order, warrant or MLAT) attached as a signed PDF.',
  'Specific account identifiers: registered email, UID, or wallet/transaction hashes.',
  'Precise date range and data categories requested.',
  'A valid return email on an official government domain for secure delivery.',
];

const DATA_TYPES = [
  { type: 'Basic subscriber information', instrument: 'Subpoena', example: 'Registered name, email, sign-up date, country' },
  { type: 'KYC / identity records', instrument: 'Court order', example: 'Verified identity documents, verification level' },
  { type: 'Transaction history', instrument: 'Court order', example: 'Deposits, withdrawals, internal transfers' },
  { type: 'Trading activity', instrument: 'Court order', example: 'Order and trade records over a period' },
  { type: 'Login & device data', instrument: 'Court order / warrant', example: 'IP addresses, timestamps, device fingerprints' },
  { type: 'Account preservation', instrument: 'Preservation request', example: 'Temporary hold pending legal process' },
];

const STEPS = [
  { title: 'Prepare your request', desc: 'Compile the signed legal instrument and identifiers per the checklist.' },
  { title: 'Submit via secure portal', desc: 'Send from an official domain to the law enforcement response team.' },
  { title: 'Verification & triage', desc: 'Our compliance team validates authenticity, jurisdiction and scope.' },
  { title: 'Secure delivery', desc: 'Responsive records are delivered through an encrypted, authenticated channel.' },
];

const JURISDICTIONS = [
  { region: 'Domestic requests', note: 'Processed directly under the laws of the issuing jurisdiction.' },
  { region: 'Foreign requests', note: 'Generally require MLAT, letters rogatory, or an applicable treaty channel.' },
  { region: 'Emergency disclosure', note: 'Considered where there is an imminent risk of death or serious physical harm.' },
];

export default function LawEnforcementPage({ onNavigate }: MorePageProps) {
  void onNavigate;
  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] font-sans pb-24">
      {/* Serious hero */}
      <section className="bg-[#000] border-b border-[#2B3139]">
        <div className="max-w-[1100px] mx-auto px-6 py-20">
          <div className="flex items-start gap-6">
            <div className="hidden md:flex w-16 h-16 rounded-2xl bg-[#1E2329] border border-[#2B3139] items-center justify-center shrink-0">
              <Scale className="w-8 h-8 text-[#F0B90B]" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#848E9C] uppercase tracking-[0.2em] mb-4">Compliance · Legal & Regulatory</div>
              <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight mb-5 leading-tight">
                Law Enforcement Request Portal
              </h1>
              <p className="text-[#B7BDC6] text-lg max-w-3xl leading-relaxed">
                Basonce is committed to lawful cooperation with government agencies while protecting the privacy and due-process rights of our users. This portal outlines how authorized officials may request customer information through valid legal process.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Notice banner */}
      <section className="max-w-[1100px] mx-auto px-6 -mt-8">
        <div className="bg-[#181A20] border border-[#F0B90B]/30 rounded-xl p-5 flex items-start gap-4 shadow-xl shadow-black/40">
          <AlertTriangle className="w-5 h-5 text-[#F0B90B] shrink-0 mt-0.5" />
          <p className="text-sm text-[#B7BDC6] leading-relaxed">
            This page is intended solely for use by verified law enforcement and government agencies. It is not a channel for consumer support. Customers seeking account assistance should use the Help Center or submit a support request.
          </p>
        </div>
      </section>

      {/* Legal process explainer */}
      <section className="max-w-[1100px] mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-white mb-3">Our legal process principles</h2>
        <p className="text-[#848E9C] mb-10 max-w-3xl">Disclosure is governed by applicable law and the following principles.</p>
        <div className="grid md:grid-cols-2 gap-5">
          {PROCESS.map((p, i) => (
            <div key={p.title} className="bg-[#181A20] border border-[#2B3139] rounded-xl p-7">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded bg-[#1E2329] text-[#F0B90B] flex items-center justify-center text-sm font-bold shrink-0 tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="font-bold text-white">{p.title}</h3>
              </div>
              <p className="text-sm text-[#848E9C] leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Required documentation checklist */}
      <section className="bg-[#181A20] border-y border-[#2B3139] py-20">
        <div className="max-w-[1100px] mx-auto px-6 grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FileCheck className="w-6 h-6 text-[#F0B90B]" />
              <h2 className="text-2xl font-bold text-white">Required documentation</h2>
            </div>
            <p className="text-[#848E9C] leading-relaxed mb-6">
              To avoid delays, every request must include the following. Incomplete submissions will be returned for correction.
            </p>
            <div className="bg-[#0B0E11] border border-[#2B3139] rounded-xl p-6">
              <ul className="space-y-4">
                {CHECKLIST.map((c) => (
                  <li key={c} className="flex gap-3 text-sm text-[#B7BDC6] leading-relaxed">
                    <CheckCircle2 className="w-5 h-5 text-[#0ECB81] shrink-0 mt-0.5" />
                    <span className="min-w-0">{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Secure submission steps */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-6 h-6 text-[#F0B90B]" />
              <h2 className="text-2xl font-bold text-white">Secure submission</h2>
            </div>
            <p className="text-[#848E9C] leading-relaxed mb-6">
              All requests and responses are handled through authenticated, encrypted channels to preserve evidentiary integrity.
            </p>
            <div className="border border-[#2B3139] rounded-xl overflow-hidden">
              {STEPS.map((s, i) => (
                <div
                  key={s.title}
                  className={`flex items-start gap-4 p-5 bg-[#0B0E11] ${i !== 0 ? 'border-t border-[#2B3139]' : ''}`}
                >
                  <div className="w-8 h-8 rounded-full bg-[#1E2329] text-[#F0B90B] flex items-center justify-center text-sm font-bold shrink-0 tabular-nums">
                    {i + 1}
                  </div>
                  <div>
                    <div className="font-bold text-white mb-1">{s.title}</div>
                    <div className="text-sm text-[#848E9C] leading-relaxed">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Data request types table */}
      <section className="max-w-[1100px] mx-auto px-6 py-20">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-6 h-6 text-[#F0B90B]" />
          <h2 className="text-2xl font-bold text-white">Data request types</h2>
        </div>
        <p className="text-[#848E9C] mb-8 max-w-3xl">
          The level of legal process required depends on the sensitivity of the data requested. The matrix below is provided as general guidance and does not constitute legal advice.
        </p>
        <div className="border border-[#2B3139] rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#1E2329] text-xs uppercase tracking-wider text-[#848E9C]">
                <th className="px-6 py-4 font-semibold">Data category</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">Typical instrument</th>
                <th className="px-6 py-4 font-semibold hidden md:table-cell">Examples</th>
              </tr>
            </thead>
            <tbody>
              {DATA_TYPES.map((d, i) => (
                <tr key={d.type} className={`bg-[#0B0E11] ${i !== 0 ? 'border-t border-[#2B3139]' : ''}`}>
                  <td className="px-6 py-4 font-medium text-white align-top">{d.type}</td>
                  <td className="px-6 py-4 align-top">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-[#F0B90B]/10 text-[#F0B90B] whitespace-nowrap">{d.instrument}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#848E9C] hidden md:table-cell align-top">{d.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Jurisdiction notes */}
      <section className="bg-[#181A20] border-y border-[#2B3139] py-20">
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="flex items-center gap-2 mb-3">
            <Globe2 className="w-6 h-6 text-[#F0B90B]" />
            <h2 className="text-2xl font-bold text-white">Jurisdiction notes</h2>
          </div>
          <p className="text-[#848E9C] mb-10 max-w-3xl">
            Cross-border requests must follow the appropriate legal channels for international cooperation.
          </p>
          <div className="grid md:grid-cols-3 gap-5">
            {JURISDICTIONS.map((j) => (
              <div key={j.region} className="bg-[#0B0E11] border border-[#2B3139] rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-[#848E9C]" />
                  <h3 className="font-bold text-white">{j.region}</h3>
                </div>
                <p className="text-sm text-[#848E9C] leading-relaxed">{j.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing contact block */}
      <section className="max-w-[900px] mx-auto px-6 py-20">
        <div className="bg-[#0d1014] border border-[#2B3139] rounded-2xl p-10 text-center">
          <Lock className="w-8 h-8 text-[#F0B90B] mx-auto mb-5" />
          <h2 className="text-2xl font-bold text-white mb-3">Submitting a request</h2>
          <p className="text-[#848E9C] max-w-xl mx-auto mb-6 leading-relaxed">
            Authorized officials should submit requests, on official letterhead and from a verifiable government domain, to the Basonce Law Enforcement Response Team for review and secure handling.
          </p>
          <div className="inline-flex items-center gap-2 bg-[#181A20] border border-[#2B3139] rounded-lg px-5 py-3">
            <span className="text-sm text-[#848E9C]">Reference channel</span>
            <ChevronRight className="w-4 h-4 text-[#5E6673]" />
            <span className="text-sm font-semibold text-[#F0B90B]">Law Enforcement Response Team</span>
          </div>
          <p className="text-xs text-[#5E6673] mt-6 max-w-lg mx-auto">
            Nothing on this page constitutes a waiver of any objection, including objections relating to jurisdiction, legal sufficiency or user privacy rights.
          </p>
        </div>
      </section>
    </div>
  );
}
