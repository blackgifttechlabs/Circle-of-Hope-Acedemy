import React from 'react';
import { ArrowRight, Award, BookOpen, GraduationCap, Quote, Users } from 'lucide-react';
import { LandingHeader } from '../components/LandingHeader';
import { PublicFooter } from '../components/PublicFooter';
import {
  ABOUT_HERO_IMAGE,
  FOUNDER_PROFILE,
  SCHOOL_OVERVIEW_PARAGRAPHS,
  SCHOOL_OVERVIEW_STATS,
  SCHOOL_PILLARS,
  STAFF_TEAM,
  TEAM_IMAGES,
} from '../utils/publicSiteContent';

export const AboutUsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f7f8fc] text-gray-900">
      <LandingHeader />

      <section className="relative overflow-hidden bg-[#081225] pt-28 pb-20 md:pt-36 md:pb-24">
        <div className="absolute inset-0 opacity-20">
          <img src={ABOUT_HERO_IMAGE} alt="Circle of Hope Academy" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(8,18,37,0.94),rgba(8,18,37,0.86),rgba(13,78,137,0.58))]"></div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-12 items-center">
            <div className="text-white">
              <p className="text-coha-400 font-bold uppercase tracking-[0.35em] text-xs mb-4">About Circle Of Hope Academy</p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight max-w-4xl">
                An inclusive school where every child is seen, supported, and prepared for life.
              </h1>
              <div className="w-24 h-1 bg-coha-500 rounded-full my-7"></div>
              <p className="text-lg sm:text-xl text-white/85 leading-relaxed max-w-3xl">
                COHA builds education around the learner. Our classrooms, staff, and leadership are focused on helping children grow academically, socially, and confidently in a school community that values dignity and belonging.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <a href="#/tour" className="inline-flex items-center gap-2 bg-coha-500 text-white px-7 py-4 rounded-full font-bold uppercase tracking-[0.18em] text-xs hover:bg-coha-400 transition-colors">
                  Explore School Tour <ArrowRight size={16} />
                </a>
                <a href="#/apply" className="inline-flex items-center gap-2 bg-white text-coha-900 px-7 py-4 rounded-full font-bold uppercase tracking-[0.18em] text-xs hover:bg-gray-100 transition-colors">
                  Apply Online
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {SCHOOL_OVERVIEW_STATS.map((stat) => (
                <div key={stat.label} className="rounded-3xl border border-white/10 bg-white/10 backdrop-blur-md p-6 text-white shadow-2xl">
                  <p className="text-3xl font-black">{stat.value}</p>
                  <p className="text-xs uppercase tracking-[0.25em] text-white/70 mt-2">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mb-12">
            <p className="text-coha-500 font-bold uppercase tracking-[0.3em] text-xs mb-4">School Overview</p>
            <h2 className="text-3xl sm:text-4xl font-black text-coha-900 mb-5">Who we are and how the school is built.</h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Circle of Hope Academy is structured around inclusive education, strong pastoral care, and practical preparation for the future.
            </p>
          </div>

          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-start">
            <div className="rounded-[2rem] bg-[#0b1220] text-white p-8 sm:p-10 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-coha-500/20 flex items-center justify-center">
                  <GraduationCap className="text-coha-400" size={24} />
                </div>
                <h3 className="text-2xl font-bold">About The School</h3>
              </div>
              <div className="space-y-5 text-white/85 leading-relaxed">
                {SCHOOL_OVERVIEW_PARAGRAPHS.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>

            <div className="grid gap-5">
              {SCHOOL_PILLARS.map((pillar, index) => {
                const Icon = [BookOpen, Users, Award][index];
                return (
                  <div key={pillar.title} className="rounded-[1.75rem] border border-gray-200 bg-[#f8fafc] p-7 shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-coha-50 flex items-center justify-center mb-5">
                      <Icon className="text-coha-500" size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-coha-900 mb-3">{pillar.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{pillar.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#fff8ef] border-y border-[#f1e4cf]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-12 items-center">
            <div className="relative">
              <div className="absolute inset-0 bg-coha-900 translate-x-4 translate-y-4 rounded-[2rem] hidden md:block"></div>
              <img
                src={FOUNDER_PROFILE.img}
                alt={FOUNDER_PROFILE.name}
                className="relative z-10 w-full h-[520px] object-cover object-top rounded-[2rem] border-4 border-white shadow-2xl"
                referrerPolicy="no-referrer"
              />
            </div>

            <div>
              <p className="text-coha-500 font-bold uppercase tracking-[0.3em] text-xs mb-4">The Face Of The School</p>
              <h2 className="text-3xl sm:text-5xl font-black text-coha-900 mb-4">{FOUNDER_PROFILE.name}</h2>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-coha-700 mb-6">{FOUNDER_PROFILE.role}</p>
              <p className="text-lg text-gray-700 leading-relaxed mb-5">{FOUNDER_PROFILE.shortBio}</p>
              <p className="text-gray-600 leading-relaxed mb-8">{FOUNDER_PROFILE.bio.replace(`${FOUNDER_PROFILE.shortBio} `, '')}</p>

              <div className="rounded-[1.75rem] bg-white p-6 border border-[#edd9b5] shadow-sm">
                <Quote className="text-coha-300 mb-4" size={34} />
                <p className="text-lg text-gray-700 italic leading-relaxed">"{FOUNDER_PROFILE.quote}"</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mb-12">
            <p className="text-coha-500 font-bold uppercase tracking-[0.3em] text-xs mb-4">Our Staff</p>
            <h2 className="text-3xl sm:text-4xl font-black text-coha-900 mb-5">The people who make COHA feel like home.</h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              {STAFF_TEAM.bio} These photos are pulled from the school tour so the public site stays consistent across both pages.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {TEAM_IMAGES.map((src, index) => (
              <div key={src} className="group overflow-hidden rounded-[1.75rem] border border-gray-200 bg-gray-50 shadow-sm">
                <div className="aspect-[4/5] overflow-hidden">
                  <img
                    src={src}
                    alt={`COHA staff ${index + 1}`}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-coha-500 font-bold mb-2">Circle Of Hope Academy</p>
                  <h3 className="text-lg font-bold text-coha-900">{STAFF_TEAM.role}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-coha-900 text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 sm:p-10 lg:p-12 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="max-w-2xl">
              <p className="text-coha-400 font-bold uppercase tracking-[0.3em] text-xs mb-4">Take The Next Step</p>
              <h2 className="text-3xl sm:text-4xl font-black mb-4">Visit the campus, meet the team, and learn more about the COHA experience.</h2>
              <p className="text-white/80 leading-relaxed">
                Explore the tour for more spaces around the school or start an application if you are ready to join the Circle of Hope Academy community.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <a href="#/tour" className="inline-flex items-center gap-2 bg-coha-500 text-white px-6 py-4 rounded-full font-bold uppercase tracking-[0.18em] text-xs hover:bg-coha-400 transition-colors">
                Visit School Tour <ArrowRight size={16} />
              </a>
              <a href="#/apply" className="inline-flex items-center gap-2 bg-white text-coha-900 px-6 py-4 rounded-full font-bold uppercase tracking-[0.18em] text-xs hover:bg-gray-100 transition-colors">
                Apply For Admission
              </a>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};
