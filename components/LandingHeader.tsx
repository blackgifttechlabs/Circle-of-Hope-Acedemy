import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, ArrowRight, User } from 'lucide-react';

export const LandingHeader: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav 
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 border-b flex items-center h-16 md:h-20 ${
          scrolled || mobileMenuOpen
            ? 'bg-white/95 backdrop-blur-xl border-gray-200 shadow-lg' 
            : 'bg-white/90 backdrop-blur-md border-transparent'
        }`}
      >
        {/* Full width container for "Far Left" positioning */}
        <div className="w-full px-4 md:px-10 flex items-center justify-between h-full">
          
          {/* Brand Identity */}
          <div 
            className="flex items-center gap-3 md:gap-4 cursor-pointer group h-full" 
            onClick={() => navigate('/')}
          >
            <div className="relative w-10 h-10 md:w-12 md:h-12 flex items-center justify-center">
               {/* Glowing Logo Backdrop */}
               <div className="absolute inset-0 bg-coha-900 rounded-none rotate-45 opacity-10 group-hover:opacity-20 group-hover:rotate-90 transition-all duration-500 blur-sm"></div>
               <div className="relative z-10 bg-white p-1 shadow-md border border-gray-100 group-hover:border-coha-500 transition-colors">
                  <img src="https://i.ibb.co/LzYXwYfX/logo.png" alt="COHA Logo" className="h-6 w-auto md:h-8" />
               </div>
            </div>
            
            <div className="flex flex-col justify-center">
              {/* Mobile/Tablet Name */}
              <h1 className="lg:hidden text-xl font-archivo text-coha-900 leading-none tracking-tighter uppercase group-hover:text-coha-500 transition-colors">
                COHA
              </h1>
              {/* Desktop Full Name */}
              <h1 className="hidden lg:block text-xl font-archivo text-coha-900 leading-none tracking-tight uppercase group-hover:text-coha-500 transition-colors">
                Circle of Hope Academy
              </h1>
              
              <span className="text-[8px] md:text-[10px] font-archivo text-gray-500 tracking-[0.2em] md:tracking-[0.3em] uppercase group-hover:text-coha-700 transition-colors">
                EST. 2020
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8 lg:gap-10 h-full">
            {['Home', 'Apply', 'About Us', 'Contact'].map((item) => (
              <button 
                key={item}
                onClick={() => navigate(item === 'Home' ? '/' : `/${item.toLowerCase().replace(' ', '-')}`)}
                className="relative h-full flex items-center text-xs font-bold font-archivo text-coha-900 uppercase tracking-[0.15em] transition-all group overflow-hidden px-1"
              >
                <span className="relative z-10 group-hover:text-coha-500 transition-colors duration-300">{item}</span>
                {/* Cool Hover Effect: Sliding Underline & Glow */}
                <span className="absolute bottom-0 left-0 w-full h-[3px] bg-coha-900 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
              </button>
            ))}
          </div>

          {/* Magnificent Login Button - White Theme Adaptation */}
          <div className="hidden md:flex h-full items-center">
            <button 
              onClick={() => navigate('/login')}
              className="relative group overflow-hidden bg-coha-900 text-white px-6 py-2.5 font-archivo text-xs md:text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-coha-900/30"
            >
              <span className="relative z-10 flex items-center gap-2">
                Portal Login <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </span>
              
              {/* Button Hover Effects */}
              <div className="absolute inset-0 bg-gradient-to-r from-coha-800 via-blue-800 to-coha-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute top-0 left-[-100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:left-[200%] transition-all duration-700 ease-in-out"></div>
            </button>
          </div>
          
          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-coha-900 p-2 hover:bg-gray-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
             {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className={`fixed inset-0 z-40 bg-white transition-transform duration-300 md:hidden flex flex-col pt-20 px-6 ${mobileMenuOpen ? 'translate-y-0' : '-translate-y-full'}`}>
          <div className="flex flex-col gap-6 mt-4">
              {['Home', 'Apply', 'About Us', 'Contact'].map((item) => (
                <button 
                  key={item}
                  onClick={() => {
                    navigate(item === 'Home' ? '/' : `/${item.toLowerCase().replace(' ', '-')}`);
                    setMobileMenuOpen(false);
                  }}
                  className="text-2xl font-archivo text-coha-900 uppercase tracking-tighter text-left border-b border-gray-100 pb-4 hover:text-coha-500 hover:pl-4 transition-all"
                >
                  {item}
                </button>
              ))}
              <button 
                onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
                className="mt-4 bg-coha-900 text-white py-4 font-archivo text-xl uppercase tracking-widest shadow-lg flex items-center justify-center gap-3"
              >
                <User size={24} /> Portal Login
              </button>
          </div>
      </div>
    </>
  );
};