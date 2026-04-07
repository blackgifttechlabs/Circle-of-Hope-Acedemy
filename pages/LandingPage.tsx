import React, { useEffect, useState, useRef } from 'react';
import { BookOpen, Award, Users, Monitor, Phone, Mail, MapPin, Facebook, Instagram, Quote } from 'lucide-react';
import { LandingHeader } from '../components/LandingHeader';
import { Hero } from '../components/Hero';
import { CycleAnimation } from '../components/CycleAnimation';

// Animation Helper Component
const ScrollReveal: React.FC<{ children: React.ReactNode; direction: 'left' | 'right'; className?: string }> = ({ children, direction, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); 
        }
      },
      { threshold: 0.15 } 
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  const translateClass = direction === 'left' ? '-translate-x-20' : 'translate-x-20';

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out transform ${
        isVisible ? 'opacity-100 translate-x-0' : `opacity-0 ${translateClass}`
      } ${className}`}
    >
      {children}
    </div>
  );
};

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 flex flex-col overflow-x-hidden">
      
      {/* Navigation Header — fixed, sits above everything */}
      <LandingHeader />

      {/* Hero Section — has its own marginTop: 80px to sit below the fixed header */}
      <Hero />

        {/* SECTION 1: New Cycle Design & Intro */}
        <ScrollReveal direction="left" className="bg-[#0b0b0b] py-20 border-b border-gray-900">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-12">
              
              {/* Left: Cycle Animation */}
              <div className="w-full lg:w-1/2">
                  <CycleAnimation />
              </div>

              {/* Right: Text Content */}
              <div className="w-full lg:w-1/2 text-left space-y-6">
                  <div className="inline-block p-3 bg-white/10 rounded-full mb-2">
                      <Award className="text-white w-8 h-8" />
                  </div>
                  <div>
                      <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-2">
                          Best Disability Inclusive Basic Education Institution
                      </h2>
                      <p className="text-sm font-bold text-coha-400 uppercase tracking-widest">
                          by National Disability Council of Namibia
                      </p>
                  </div>
                  
                  <div className="w-20 h-1 bg-white/50"></div>
                  
                  <div className="text-lg text-gray-300 leading-relaxed space-y-4">
                      <p>
                          Circle Of Hope Private Academy – COHA is an inclusive school registered with the Ministry of Education, Arts and Culture (Registration No. 7826) situated at Elcin Centre Old Ongwediva, Oshana region, Namibia.
                      </p>
                      <p>
                          Our school uses English as a medium of instruction with Ministry of Education NiED, Junior Primary and Intellectual Impaired Curriculum.
                      </p>
                      <p>
                          Currently, our enrolment is Kindergarten, Pre-Primary, Grade 1-3, Special Needs Classes (Autism spectrum disorder, Down Syndrome, and other intellectual disorders).
                      </p>
                  </div>
              </div>

            </div>
          </div>
        </ScrollReveal>

        {/* VTC Promotion Section */}
        <ScrollReveal direction="right" className="bg-coha-500 py-20 border-b border-coha-600">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="w-full lg:w-1/2 text-white space-y-6">
                <h2 className="text-3xl sm:text-4xl font-bold leading-tight">
                  Vocational Training Centre (VTC)
                </h2>
                <div className="w-20 h-1 bg-white/50"></div>
                <p className="text-lg leading-relaxed">
                  Empowering youth with practical skills for the future. Our Vocational Training Centre offers specialized courses designed to equip students with hands-on experience and industry-recognized qualifications.
                </p>
                <p className="text-lg leading-relaxed">
                  Whether you're looking to start a new career or upgrade your existing skills, COHA VTC provides the supportive environment and expert instruction you need to succeed.
                </p>
                <div className="pt-4">
                  <a 
                    href="#/vtc-apply" 
                    className="inline-block bg-coha-900 text-white font-bold uppercase tracking-wider py-4 px-8 rounded-full hover:bg-gray-800 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    Apply Online Now
                  </a>
                </div>
              </div>
              <div className="w-full lg:w-1/2 relative">
                <div className="absolute inset-0 bg-coha-900 transform translate-x-4 translate-y-4 hidden lg:block rounded-2xl"></div>
                <img 
                  src="https://i.ibb.co/yFf6sWZ4/IMG-20260318-WA0077.jpg" 
                  alt="Vocational Training" 
                  className="relative z-10 w-full h-auto object-cover shadow-xl border-4 border-white rounded-2xl"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* SECTION 2 (Even): Founder Profile -> Slide Right */}
        <ScrollReveal direction="left" className="bg-gray-50 py-20 border-b border-gray-200 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                {/* Image Left */}
                <div className="w-full lg:w-1/2 relative">
                    <div className="absolute inset-0 bg-coha-900 transform translate-x-4 translate-y-4 hidden lg:block"></div>
                    <img 
                      src="https://i.ibb.co/My2rxxYJ/founder.png" 
                      alt="Victoria Joel - Founder" 
                      className="relative z-10 w-full h-auto object-cover shadow-xl border-4 border-white"
                    />
                </div>
                
                {/* Text Right */}
                <div className="w-full lg:w-1/2">
                  <h4 className="text-coha-500 font-bold uppercase tracking-widest mb-2">Meet Our Founder</h4>
                  <h2 className="text-3xl sm:text-4xl font-bold text-coha-900 mb-6">Victoria Joel</h2>
                  <p className="text-gray-600 leading-relaxed mb-6 text-lg">
                      Victoria Joel is a 31-year-old social entrepreneur and an Olafika SMEs and Mentorship graduate, awarded the 2020 Most Diligent Entrepreneur of the Year. 
                  </p>
                  <p className="text-gray-600 leading-relaxed mb-6">
                      She is a devoted, trained special needs teacher with seven years of teaching experience in four different schools. Trained by SES Experts from Germany, she has passionately advocated for children with Autism Spectrum Disorder and other intellectual disabilities for the past ten years, serving as an expert and mentor.
                  </p>
                  <div className="flex items-center gap-4 mt-8">
                      <Quote className="text-coha-300 w-10 h-10" />
                      <p className="text-sm text-gray-500 italic font-medium">"Every child deserves a champion – an adult who will never give up on them."</p>
                  </div>
                </div>
            </div>
          </div>
        </ScrollReveal>

        {/* SECTION 3: Mission, Vision, Values - Bento Grid */}
        <section className="bg-gray-50 py-24 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <ScrollReveal direction="left">
                <h2 className="text-3xl sm:text-4xl font-bold text-coha-900 uppercase tracking-wide">Our Purpose</h2>
                <div className="w-24 h-1 bg-coha-500 mx-auto mt-4"></div>
              </ScrollReveal>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Mission */}
              <ScrollReveal direction="left" className="col-span-1 md:col-span-2 lg:col-span-2 h-full">
                <div className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-500 border border-gray-100 group h-full flex flex-col sm:flex-row">
                  <div className="w-full sm:w-2/5 h-64 sm:h-auto overflow-hidden shrink-0">
                    <img 
                      src="https://i.ibb.co/nqB1HtM1/FB-IMG-1773820791191.jpg" 
                      alt="Our Mission" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                  <div className="w-full sm:w-3/5 p-8 sm:p-12 flex flex-col justify-center">
                    <div className="w-12 h-12 bg-coha-50 rounded-2xl flex items-center justify-center mb-6">
                      <Award className="text-coha-500 w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold text-coha-900 mb-4">Our Mission</h3>
                    <p className="text-gray-600 leading-relaxed text-lg">
                      To educate and empower every child, embracing their unique abilities, and nurturing their skills so they can meaningfully contribute to the development of our society.
                    </p>
                  </div>
                </div>
              </ScrollReveal>

              {/* Vision */}
              <ScrollReveal direction="right" className="col-span-1 h-full">
                <div className="bg-coha-900 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-500 group h-full flex flex-col relative">
                  <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500">
                    <img 
                      src="https://i.ibb.co/k60qsKdS/FB-IMG-1773820794700.jpg" 
                      alt="Our Vision Background" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="relative z-10 p-8 sm:p-12 flex flex-col justify-center h-full">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm">
                      <Monitor className="text-white w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4">Our Vision</h3>
                    <p className="text-gray-300 leading-relaxed text-lg">
                      To provide inclusive, high-quality education tailored to each child's distinct learning style, preparing them for future success and employment throughout Namibia.
                    </p>
                  </div>
                </div>
              </ScrollReveal>

              {/* Core Values */}
              <ScrollReveal direction="left" className="col-span-1 h-full">
                <div className="bg-coha-500 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-500 group h-full flex flex-col relative">
                  <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500">
                    <img 
                      src="https://i.ibb.co/qLztb258/FB-IMG-1773820801712.jpg" 
                      alt="Core Values Background" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="relative z-10 p-8 sm:p-12 flex flex-col justify-center h-full">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm">
                      <Users className="text-white w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4">Core Values</h3>
                    <p className="text-white/90 leading-relaxed text-lg">
                      We believe every child is differently able. We educate based on individual interests, fostering a safe, expressive, and inclusive environment.
                    </p>
                  </div>
                </div>
              </ScrollReveal>

              {/* Extra Image/Quote */}
              <ScrollReveal direction="right" className="col-span-1 md:col-span-2 lg:col-span-2 h-full">
                <div className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-500 border border-gray-100 group h-full flex flex-col sm:flex-row-reverse">
                  <div className="w-full sm:w-2/5 h-64 sm:h-auto overflow-hidden shrink-0">
                    <img 
                      src="https://i.ibb.co/wNLptp4G/IMG-20260318-WA0074.jpg" 
                      alt="Inclusive Education" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                  <div className="w-full sm:w-3/5 p-8 sm:p-12 flex flex-col justify-center">
                    <Quote className="text-coha-300 w-12 h-12 mb-6" />
                    <h3 className="text-2xl font-bold text-coha-900 mb-4">Inclusive Excellence</h3>
                    <p className="text-gray-600 leading-relaxed text-lg">
                      Our commitment goes beyond traditional education. We create a nurturing space where students with Autism Spectrum Disorder, Down Syndrome, and other intellectual disorders can thrive alongside their peers.
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* Why Choose COHA? */}
        <section className="bg-white py-24 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-coha-50 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-coha-50 rounded-full blur-3xl opacity-50"></div>
          </div>

          <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
            <div className="text-center mb-20">
              <ScrollReveal direction="left">
                <h4 className="text-coha-500 font-bold uppercase tracking-widest mb-2">The COHA Difference</h4>
                <h2 className="text-3xl sm:text-5xl font-black text-coha-900 tracking-tight">Why Choose COHA?</h2>
                <div className="w-24 h-1.5 bg-coha-500 mx-auto mt-6 rounded-full"></div>
              </ScrollReveal>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
              <ScrollReveal direction="left" className="h-full">
                <div className="bg-gray-50 rounded-3xl p-10 h-full border border-gray-100 hover:border-coha-300 hover:shadow-2xl transition-all duration-500 group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-coha-100 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500"></div>
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-8 relative z-10 group-hover:scale-110 transition-transform duration-500">
                    <BookOpen className="text-coha-500 w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-coha-900 relative z-10">Tailored Curriculum</h3>
                  <p className="text-gray-600 leading-relaxed relative z-10 text-lg">
                    We adapt the Ministry of Education NiED curriculum to fit every child's unique learning style, ensuring no one is left behind.
                  </p>
                </div>
              </ScrollReveal>

              <ScrollReveal direction="left" className="h-full delay-100">
                <div className="bg-coha-900 rounded-3xl p-10 h-full border border-coha-800 hover:shadow-2xl hover:shadow-coha-900/20 transition-all duration-500 group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-coha-800 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500"></div>
                  <div className="w-16 h-16 bg-coha-800 rounded-2xl flex items-center justify-center mb-8 relative z-10 group-hover:scale-110 transition-transform duration-500">
                    <Users className="text-white w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-white relative z-10">Expert Educators</h3>
                  <p className="text-white/90 leading-relaxed relative z-10 text-lg">
                    Our devoted teachers are specially trained by international experts to support and mentor children with diverse intellectual needs.
                  </p>
                </div>
              </ScrollReveal>

              <ScrollReveal direction="right" className="h-full delay-200">
                <div className="bg-coha-500 rounded-3xl p-10 h-full border border-coha-400 hover:shadow-2xl hover:shadow-coha-500/30 transition-all duration-500 group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-coha-400 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500"></div>
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-8 relative z-10 group-hover:scale-110 transition-transform duration-500">
                    <Award className="text-white w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-white relative z-10">Holistic Growth</h3>
                  <p className="text-white/90 leading-relaxed relative z-10 text-lg">
                    Beyond academics, we focus on life skills, vocational training, and emotional well-being to prepare students for a fulfilling future.
                  </p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="relative py-24 bg-coha-900 overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <img src="https://i.ibb.co/wNLptp4G/IMG-20260318-WA0074.jpg" alt="Background" className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-coha-900 via-coha-900/90 to-transparent"></div>
          
          <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
            <div className="max-w-2xl">
              <ScrollReveal direction="left">
                <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 leading-tight">
                  Ready to join the COHA family?
                </h2>
                <p className="text-xl text-white/90 mb-10 leading-relaxed">
                  Enrollments for the 2026 academic year are now open. Secure a place for your child in an environment where they will truly belong.
                </p>
                <div className="flex flex-wrap gap-4">
                  <a href="#/apply" className="bg-coha-500 text-white font-bold uppercase tracking-wider py-4 px-8 rounded-full hover:bg-coha-400 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                    Apply for School
                  </a>
                  <a href="#/vtc-apply" className="bg-white text-coha-900 font-bold uppercase tracking-wider py-4 px-8 rounded-full hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                    Apply for VTC
                  </a>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-[#050b14] text-gray-400 py-16 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
              {/* Brand */}
              <div className="col-span-1 lg:col-span-1">
                <div className="flex items-center gap-3 mb-6">
                  <img src="https://i.ibb.co/LzYXwYfX/logo.png" alt="COHA Logo" className="h-14 w-auto drop-shadow-lg" />
                  <div>
                      <span className="text-xl font-black text-white uppercase tracking-wider block leading-none">COHA</span>
                      <span className="text-[10px] text-coha-500 uppercase tracking-[0.2em] font-bold">Academy</span>
                  </div>
                </div>
                <p className="text-sm leading-relaxed mb-8">
                  Circle of Hope Academy provides accessible, high-quality, inclusive education fostering character, innovation, and academic excellence.
                </p>
                <div className="flex gap-4">
                  <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-coha-500 hover:text-white transition-all duration-300">
                    <Facebook size={18} />
                  </a>
                  <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-coha-500 hover:text-white transition-all duration-300">
                    <Instagram size={18} />
                  </a>
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h4 className="text-white font-bold uppercase tracking-widest mb-6 text-sm">Quick Links</h4>
                <ul className="space-y-4">
                  <li><a href="#/" className="hover:text-coha-400 transition-colors flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-coha-500"></div> Home</a></li>
                  <li><a href="#/tour" className="hover:text-coha-400 transition-colors flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-coha-500"></div> School Tour</a></li>
                  <li><a href="#/apply" className="hover:text-coha-400 transition-colors flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-coha-500"></div> Admissions</a></li>
                  <li><a href="#/vtc-apply" className="hover:text-coha-400 transition-colors flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-coha-500"></div> VTC Application</a></li>
                  <li><a href="#/login" className="hover:text-coha-400 transition-colors flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-coha-500"></div> Portal Login</a></li>
                </ul>
              </div>

              {/* Contact Info */}
              <div>
                <h4 className="text-white font-bold uppercase tracking-widest mb-6 text-sm">Contact Us</h4>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <MapPin className="text-coha-500 shrink-0 mt-1" size={18} />
                    <span className="text-sm leading-relaxed">Elcin Centre Old Ongwediva<br/>Oshana Region, Namibia<br/>P.O. Box 3675, Ondangwa</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Phone className="text-coha-500 shrink-0" size={18} />
                    <span className="text-sm">+264 81 666 4074</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Mail className="text-coha-500 shrink-0" size={18} />
                    <span className="text-sm">circleofhopeacademy@yahoo.com</span>
                  </li>
                </ul>
              </div>

              {/* Newsletter / Info */}
              <div>
                <h4 className="text-white font-bold uppercase tracking-widest mb-6 text-sm">Stay Updated</h4>
                <p className="text-sm mb-4 leading-relaxed">Subscribe to our newsletter for the latest news, events, and admission updates.</p>
                <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
                  <input 
                    type="email" 
                    placeholder="Your email address" 
                    className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-coha-500 transition-colors"
                  />
                  <button type="submit" className="bg-coha-500 hover:bg-coha-400 text-white font-bold py-3 px-4 rounded-lg transition-colors text-sm uppercase tracking-wider">
                    Subscribe
                  </button>
                </form>
              </div>
            </div>

            <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
              <p>&copy; {new Date().getFullYear()} Circle of Hope Academy. All rights reserved.</p>
              <div className="flex gap-6">
                <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              </div>
            </div>
          </div>
        </footer>

    </div>
  );
};