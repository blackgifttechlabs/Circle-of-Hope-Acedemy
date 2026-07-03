import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, CheckCircle2, Globe2, GraduationCap, HeartHandshake, Mail, Phone, Send, Users } from 'lucide-react';
import { LandingHeader } from '../components/LandingHeader';
import { PublicFooter } from '../components/PublicFooter';
import { Button } from '../components/ui/Button';
import { submitInternshipApplication } from '../services/dataService';
import { InternshipApplication } from '../types';

const GALLERY_IMAGES = [
  'https://i.ibb.co/7t5FL0rZ/IMG-20260318-WA0084.jpg',
  'https://i.ibb.co/mVT7hG9K/IMG-20260318-WA0085.jpg',
  'https://i.ibb.co/cKG6sdxz/IMG-20260318-WA0086.jpg',
  'https://i.ibb.co/CKv68BHv/IMG-20260318-WA0087.jpg',
  'https://i.ibb.co/wNLptp4G/IMG-20260318-WA0074.jpg',
  'https://i.ibb.co/yFf6sWZ4/IMG-20260318-WA0077.jpg',
];

const OPPORTUNITIES = [
  {
    icon: <GraduationCap size={22} />,
    title: 'Student Placement',
    text: 'Placement conversations for learners and students who need supervised practical exposure in inclusive education, care, school operations, or community programmes.',
  },
  {
    icon: <Briefcase size={22} />,
    title: 'Internships',
    text: 'Internship opportunities for applicants who want practical experience while contributing to teaching support, administration, technical skills, or learner wellbeing.',
  },
  {
    icon: <Globe2 size={22} />,
    title: 'Student & Staff Exchange',
    text: 'Exchange opportunities with visiting students, staff, teachers, and partner institutions from abroad.',
  },
  {
    icon: <HeartHandshake size={22} />,
    title: 'Senior Expert Programmes',
    text: 'Retired professionals and experienced specialists can invest their time, knowledge, and mentorship into school and community development.',
  },
];

const initialForm = {
  firstName: '',
  surname: '',
  emailAddress: '',
  phoneNumber: '',
  opportunityType: 'Internship' as InternshipApplication['opportunityType'],
  organizationOrSchool: '',
  country: '',
  city: '',
  availability: '',
  background: '',
  motivation: '',
  notes: '',
};

const Field: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }> = ({ label, error, required, ...props }) => (
  <label className="block">
    <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">
      {label} {required && <span className="text-red-500">*</span>}
    </span>
    <input
      {...props}
      className={`h-12 w-full rounded-xl border bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-coha-700 ${error ? 'border-red-400' : 'border-slate-200'}`}
    />
    {error && <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>}
  </label>
);

const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }> = ({ label, error, required, ...props }) => (
  <label className="block">
    <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">
      {label} {required && <span className="text-red-500">*</span>}
    </span>
    <textarea
      {...props}
      className={`min-h-[120px] w-full rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-coha-700 ${error ? 'border-red-400' : 'border-slate-200'}`}
    />
    {error && <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>}
  </label>
);

export const ApplyInternshipPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const updateField = (name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
    if (submitError) setSubmitError('');
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.firstName.trim()) next.firstName = 'First name is required';
    if (!form.surname.trim()) next.surname = 'Surname is required';
    if (!form.emailAddress.trim()) next.emailAddress = 'Email is required';
    if (!form.phoneNumber.trim()) next.phoneNumber = 'Phone number is required';
    if (!form.motivation.trim()) next.motivation = 'Please tell us why you are applying';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const success = await submitInternshipApplication(form);
      if (!success) {
        setSubmitError('Could not submit your application. Please try again.');
        return;
      }
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50">
        <LandingHeader />
        <main className="flex min-h-screen items-center justify-center px-4 pt-24">
          <div className="w-full max-w-lg rounded-[1.5rem] border border-emerald-100 bg-white p-8 text-center shadow-xl">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={34} />
            </div>
            <h1 className="text-2xl font-black text-slate-950">Application Sent</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Thank you for applying. The administration team will review your details and contact you by email or phone.
            </p>
            <Button onClick={() => navigate('/')} className="mt-6 w-full">
              Done
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LandingHeader />
      <main>
        <section className="relative min-h-[620px] overflow-hidden bg-slate-950 pt-24 text-white">
          <img
            src="https://i.ibb.co/pjzrR67y/coha1-1.jpg"
            alt="Circle of Hope Academy opportunities"
            className="absolute inset-0 h-full w-full object-cover opacity-45"
          />
          <div className="absolute inset-0 bg-slate-950/45" />
          <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-10 px-5 py-16 lg:grid-cols-[1fr_430px] lg:px-8">
            <div className="flex flex-col justify-center">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-coha-300">Opportunities</p>
              <h1 className="mt-4 max-w-4xl text-4xl font-black uppercase tracking-tight sm:text-6xl">
                Exchange & Development Opportunities
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/82">
                Apply for student placement, internships, student and staff exchange, teacher collaboration, or senior expert programmes with Circle of Hope Academy.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#apply" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black uppercase tracking-[0.12em] text-slate-950">
                  <Send size={16} /> Apply Now
                </a>
                <a href="#gallery" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/35 px-5 text-sm font-black uppercase tracking-[0.12em] text-white">
                  View Gallery
                </a>
              </div>
            </div>
            <div className="grid content-end gap-3">
              {OPPORTUNITIES.map((item) => (
                <div key={item.title} className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                  <div className="mb-3 flex items-center gap-3 text-coha-200">
                    {item.icon}
                    <h2 className="text-base font-black text-white">{item.title}</h2>
                  </div>
                  <p className="text-sm leading-6 text-white/76">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="gallery" className="bg-slate-50 px-5 py-16 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-coha-700">Past Exchanges</p>
                <h2 className="mt-2 text-3xl font-black text-slate-950">Visiting Students, Staff & Teachers</h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-slate-600">
                A living gallery for exchange visits, collaborative learning, workshops, and partner support.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {GALLERY_IMAGES.map((src, index) => (
                <div key={src} className={`overflow-hidden rounded-xl bg-slate-200 ${index === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}>
                  <img src={src} alt={`COHA exchange gallery ${index + 1}`} className="h-full min-h-[180px] w-full object-cover transition duration-500 hover:scale-105" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="apply" className="bg-white px-5 py-16 lg:px-8">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-[390px_1fr]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-coha-700">Apply Internship</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">Send Your Details</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                The school will review your application and respond directly. No payment step is required for this opportunity application.
              </p>
              <div className="mt-6 grid gap-3 text-sm font-semibold text-slate-700">
                <div className="flex items-center gap-3"><Mail size={18} className="text-coha-700" /> admin@cohavtc.com</div>
                <div className="flex items-center gap-3"><Phone size={18} className="text-coha-700" /> +264 81 752 0894</div>
                <div className="flex items-center gap-3"><Users size={18} className="text-coha-700" /> Students, staff, experts, and partners</div>
              </div>
            </aside>

            <form onSubmit={handleSubmit} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 shadow-sm sm:p-7">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="First Name" name="firstName" value={form.firstName} onChange={(e) => updateField(e.target.name, e.target.value)} error={errors.firstName} required />
                <Field label="Surname" name="surname" value={form.surname} onChange={(e) => updateField(e.target.name, e.target.value)} error={errors.surname} required />
                <Field label="Email" type="email" name="emailAddress" value={form.emailAddress} onChange={(e) => updateField(e.target.name, e.target.value)} error={errors.emailAddress} required />
                <Field label="Phone" name="phoneNumber" value={form.phoneNumber} onChange={(e) => updateField(e.target.name, e.target.value)} error={errors.phoneNumber} required />
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Opportunity Type</span>
                  <select
                    name="opportunityType"
                    value={form.opportunityType}
                    onChange={(e) => updateField(e.target.name, e.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none focus:border-coha-700"
                  >
                    <option>Student Placement</option>
                    <option>Internship</option>
                    <option>Student Exchange</option>
                    <option>Staff Exchange</option>
                    <option>Senior Expert Programme</option>
                    <option>Other</option>
                  </select>
                </label>
                <Field label="School / Organization" name="organizationOrSchool" value={form.organizationOrSchool} onChange={(e) => updateField(e.target.name, e.target.value)} />
                <Field label="Country" name="country" value={form.country} onChange={(e) => updateField(e.target.name, e.target.value)} />
                <Field label="City / Town" name="city" value={form.city} onChange={(e) => updateField(e.target.name, e.target.value)} />
                <div className="md:col-span-2">
                  <Field label="Availability" name="availability" placeholder="Example: June to August 2026, 3 months, school holidays" value={form.availability} onChange={(e) => updateField(e.target.name, e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <TextArea label="Background / Experience" name="background" value={form.background} onChange={(e) => updateField(e.target.name, e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <TextArea label="Why Are You Applying?" name="motivation" value={form.motivation} onChange={(e) => updateField(e.target.name, e.target.value)} error={errors.motivation} required />
                </div>
                <div className="md:col-span-2">
                  <TextArea label="Additional Notes" name="notes" value={form.notes} onChange={(e) => updateField(e.target.name, e.target.value)} />
                </div>
              </div>
              {submitError && <p className="mt-5 text-sm font-bold text-red-600">{submitError}</p>}
              <Button type="submit" disabled={isSubmitting} className="mt-6 h-13 w-full rounded-xl bg-coha-900 text-white">
                {isSubmitting ? 'Submitting...' : <><Send size={18} /> Submit Application</>}
              </Button>
            </form>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
};
