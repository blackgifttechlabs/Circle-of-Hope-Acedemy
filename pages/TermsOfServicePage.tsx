import React from 'react';
import { LandingHeader } from '../components/LandingHeader';
import { PublicFooter } from '../components/PublicFooter';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="border-b border-slate-200 py-8 last:border-b-0">
    <h2 className="text-xl font-black text-coha-900">{title}</h2>
    <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">{children}</div>
  </section>
);

export const TermsOfServicePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LandingHeader />
      <main className="mx-auto max-w-4xl px-6 pb-16 pt-32">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-coha-500">Circle of Hope Academy</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-coha-900">Terms of Service</h1>
        <p className="mt-4 text-sm font-semibold text-slate-500">Last updated: 17 June 2026</p>

        <Section title="1. Use of the Website and Portal">
          <p>The website and portal are provided for admissions, school communication, learning support, payment verification, attendance, assessments, hostel care, and school administration.</p>
        </Section>

        <Section title="2. Accurate Information">
          <p>Users must provide accurate, complete, and lawful information. Parents or guardians must have authority to submit learner information and documents.</p>
        </Section>

        <Section title="3. Account Security">
          <p>Users must keep passwords and PINs confidential. Do not share access with unauthorised people. The school may suspend access if an account appears unsafe or misused.</p>
        </Section>

        <Section title="4. Acceptable Use">
          <p>Users must not attempt to bypass security, access another person's records, upload harmful files, misuse school data, interfere with the system, or submit false documents.</p>
        </Section>

        <Section title="5. Payments and Receipts">
          <p>Payment proofs and receipts are reviewed by the school. Uploading proof does not by itself confirm payment approval. The school may request additional verification.</p>
        </Section>

        <Section title="6. Educational and Care Records">
          <p>Assessments, attendance, homework, medication records, and care logs are school records. They are provided for communication and support and may be corrected if inaccurate.</p>
        </Section>

        <Section title="7. Availability">
          <p>The school aims to keep the portal available, but access may be interrupted by maintenance, internet issues, service providers, or security updates.</p>
        </Section>

        <Section title="8. Changes">
          <p>The school may update these terms when services, legal requirements, or security practices change. Continued use of the website or portal means you accept the updated terms.</p>
        </Section>

        <Section title="9. Contact">
          <p>For questions about these terms, contact Circle of Hope Academy at circleofhopeacademy@yahoo.com or +264 81 666 4074.</p>
        </Section>
      </main>
      <PublicFooter />
    </div>
  );
};
