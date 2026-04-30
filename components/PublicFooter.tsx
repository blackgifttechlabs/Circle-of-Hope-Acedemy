import React from 'react';
import { Facebook, Instagram, Mail, MapPin, Phone } from 'lucide-react';

export const PublicFooter: React.FC = () => {
  return (
    <footer className="bg-[#050b14] text-gray-400 py-16 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
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

          <div>
            <h4 className="text-white font-bold uppercase tracking-widest mb-6 text-sm">Quick Links</h4>
            <ul className="space-y-4">
              <li><a href="#/" className="hover:text-coha-400 transition-colors flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-coha-500"></div> Home</a></li>
              <li><a href="#/about-us" className="hover:text-coha-400 transition-colors flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-coha-500"></div> About Us</a></li>
              <li><a href="#/tour" className="hover:text-coha-400 transition-colors flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-coha-500"></div> School Tour</a></li>
              <li><a href="#/apply" className="hover:text-coha-400 transition-colors flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-coha-500"></div> Admissions</a></li>
              <li><a href="#/vtc-apply" className="hover:text-coha-400 transition-colors flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-coha-500"></div> VTC Application</a></li>
              <li><a href="#/login" className="hover:text-coha-400 transition-colors flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-coha-500"></div> Portal Login</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold uppercase tracking-widest mb-6 text-sm">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="text-coha-500 shrink-0 mt-1" size={18} />
                <span className="text-sm leading-relaxed">Elcin Centre Old Ongwediva<br />Oshana Region, Namibia<br />P.O. Box 3675, Ondangwa</span>
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
  );
};
