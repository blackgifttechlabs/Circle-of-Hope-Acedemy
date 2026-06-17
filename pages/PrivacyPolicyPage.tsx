import React from 'react';
import { LandingHeader } from '../components/LandingHeader';
import { PublicFooter } from '../components/PublicFooter';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="border-b border-slate-200 py-8 last:border-b-0">
    <h2 className="text-xl font-black text-coha-900">{title}</h2>
    <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">{children}</div>
  </section>
);

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LandingHeader />
      <main className="mx-auto max-w-4xl px-6 pb-16 pt-32">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-coha-500">Circle of Hope Academy</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-coha-900">Privacy Policy</h1>
        <p className="mt-4 text-sm font-semibold text-slate-500">Last updated: 17 June 2026</p>

        <Section title="1. Who We Are">
          <p>Circle of Hope Academy collects and uses personal information to operate the school, manage admissions, provide education, manage care services, communicate with parents or guardians, and keep school records.</p>
        </Section>

        <Section title="2. Information We Collect">
          <p>We may collect learner names, dates of birth, identity or birth certificate information, parent or guardian contact details, emergency contacts, addresses, academic records, assessment records, attendance records, homework submissions, payment proofs, receipts, hostel information, care logs, medication information, medical documents, and application documents.</p>
          <p>Some information may be sensitive, including child information, disability-related information, health information, medication records, and uploaded documents.</p>
        </Section>

        <Section title="3. Why We Use Information">
          <p>We use information for admissions, enrolment, assessment, classroom support, hostel care, medication administration, payment verification, parent communication, legal or regulatory recordkeeping, safeguarding, and school administration.</p>
        </Section>

        <Section title="4. Consent and Responsibility">
          <p>Parents or legal guardians must provide accurate information and must have authority to submit information about a learner. By submitting an application or using the portal, you consent to the school processing the information for school-related purposes.</p>
        </Section>

        <Section title="5. Access and Sharing">
          <p>Access is limited to authorised school staff, administrators, teachers, matrons, parents or guardians, and service providers who help operate the school system. We do not sell personal information.</p>
          <p>We may share information if required by law, safeguarding duties, health or emergency situations, payment verification, or official school administration.</p>
        </Section>

        <Section title="6. Security">
          <p>We use account authentication, role-based access controls, database security rules, session locking, and administrative controls to protect information. No online system is completely risk-free, so users must protect their passwords and report suspected unauthorised access immediately.</p>
        </Section>

        <Section title="7. Retention">
          <p>We keep information only for as long as needed for education, safeguarding, payment, legal, audit, or school administration purposes. Rejected applications, old payment proofs, and outdated documents may be deleted or archived according to school policy.</p>
        </Section>

        <Section title="8. Your Rights">
          <p>Parents or guardians may ask to view, correct, or update learner and parent information. Requests may be subject to identity checks and school recordkeeping duties.</p>
        </Section>

        <Section title="9. Contact">
          <p>For privacy questions or correction requests, contact Circle of Hope Academy at circleofhopeacademy@yahoo.com or +264 81 666 4074.</p>
        </Section>
      </main>
      <PublicFooter />
    </div>
  );
};
