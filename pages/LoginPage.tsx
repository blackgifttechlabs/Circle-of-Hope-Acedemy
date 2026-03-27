import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { verifyAdminPin, searchTeachers, searchStudents, searchVtcStudents } from '../services/dataService';
import { UserRole, Teacher, Student } from '../types';
import { User, ShieldCheck, GraduationCap, ArrowLeft, BookOpen, ChevronRight } from 'lucide-react';

interface LoginProps {
  onLogin: (role: UserRole, user: any) => void;
  showToast?: (message: string) => void;
}

export const LoginPage: React.FC<LoginProps> = ({ onLogin, showToast }) => {
  const [activeTab, setActiveTab] = useState<'ADMIN' | 'TEACHER' | 'PARENT' | 'VTC'>('ADMIN');
  const [pin, setPin] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [frame, setFrame] = useState(0);
  const navigate = useNavigate();

  const parentImages = [
    'https://i.ibb.co/bg5LbyBP/s3.png',
    'https://i.ibb.co/0p5kxm6J/s2.png',
    'https://i.ibb.co/3m4MCwks/s1.png'
  ];

  useEffect(() => {
    let interval: any;
    if (activeTab === 'PARENT') {
      interval = setInterval(() => {
        setFrame((prev) => (prev + 1) % 3);
      }, 80); // 80ms for a very fast looping switch
    }
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const isValid = await verifyAdminPin(pin);
    
    if (isValid) {
      if (showToast) showToast('Welcome back, Admin!');
      onLogin(UserRole.ADMIN, { name: 'Administrator', id: 'admin' });
      navigate('/admin/dashboard');
    } else {
      setError('Invalid PIN.');
    }
    setLoading(false);
  };

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    setSelectedUser(null);
    setPin('');
    setError('');

    if (term.length > 1) {
      if (activeTab === 'TEACHER') {
        const results = await searchTeachers(term);
        setSearchResults(results);
      } else if (activeTab === 'PARENT') {
        const results = await searchStudents(term);
        setSearchResults(results);
      } else if (activeTab === 'VTC') {
        const results = await searchVtcStudents(term);
        setSearchResults(results.map(r => ({ ...r, name: `${r.firstName} ${r.surname}` })));
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleUserSelect = (user: any) => {
    setSelectedUser(user);
    setSearchResults([]);
    setSearchTerm(activeTab === 'PARENT' ? user.name : user.name);
  };

  const handleUserLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      setError('Please select a user first');
      return;
    }

    let success = false;
    let role = UserRole.TEACHER;
    let userData = selectedUser;

    if (activeTab === 'TEACHER') {
      if (selectedUser.pin === pin) {
        success = true;
        role = UserRole.TEACHER;
      }
    } else if (activeTab === 'PARENT') {
      if (selectedUser.parentPin === pin) {
        success = true;
        role = UserRole.PARENT;
        userData = { ...selectedUser, name: selectedUser.parentName };
      }
    } else if (activeTab === 'VTC') {
      if (selectedUser.pin === pin) {
        success = true;
        role = UserRole.VTC_STUDENT;
      }
    }

    if (success) {
      if (showToast) showToast(`Welcome back, ${userData.name}!`);
      onLogin(role, userData);
      if (role === UserRole.TEACHER) navigate('/teacher/dashboard');
      if (role === UserRole.PARENT) navigate('/parent/dashboard');
      if (role === UserRole.VTC_STUDENT) navigate('/vtc/dashboard');
    } else {
      setError('Incorrect PIN');
    }
  };

  const roles = [
    { id: 'ADMIN', label: 'Admin', icon: ShieldCheck, desc: 'System Management' },
    { id: 'TEACHER', label: 'Teacher', icon: User, desc: 'Class & Grades' },
    { id: 'PARENT', label: 'Parent', icon: GraduationCap, desc: 'Student Progress' },
    { id: 'VTC', label: 'VTC', icon: BookOpen, desc: 'Vocational Training' },
  ] as const;

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-8 overflow-hidden bg-gray-100">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0" 
        style={{ backgroundImage: 'url("https://i.ibb.co/zWNcsGPP/login-wallpaper.jpg")' }}
      />
      {/* Light Overlay */}
      <div className="absolute inset-0 bg-white/40 backdrop-blur-sm z-0" />

      {/* Back Button */}
      <button 
        onClick={() => navigate('/')} 
        className="absolute top-6 left-6 z-20 text-coha-900 flex items-center gap-2 hover:text-coha-700 transition-colors font-medium group bg-white/80 hover:bg-white px-4 py-2 rounded-full shadow-sm backdrop-blur-md border border-white/50"
        style={{ fontFamily: '"Libre Franklin", sans-serif' }}
      >
        <ArrowLeft size={18} />
        <span className="text-xs uppercase tracking-[0.2em] font-bold">Return</span>
      </button>

      {/* Main Container */}
      <div className="w-full max-w-5xl h-auto min-h-[600px] md:h-[650px] bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col md:flex-row overflow-hidden z-10 relative border border-white/50">
        
        {/* Left Half: Branding & Roles */}
        <div className="w-full md:w-[45%] bg-gradient-to-br from-coha-900 to-coha-800 p-8 md:p-12 flex flex-col justify-between relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CjxyZWN0IHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgZmlsbD0ibm9uZSIvPgo8Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+Cjwvc3ZnPg==')] opacity-10 mix-blend-overlay" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-16 h-16 bg-white rounded-2xl p-2 shadow-lg">
                <img src="https://i.ibb.co/LzYXwYfX/logo.png" alt="COHA Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: '"Google Sans", sans-serif' }}>COHA</h1>
                <p className="text-white text-xs uppercase tracking-[0.2em] font-semibold" style={{ fontFamily: '"Libre Franklin", sans-serif' }}>Secure Portal</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-white text-xs uppercase tracking-[0.15em] font-bold mb-4" style={{ fontFamily: '"Libre Franklin", sans-serif' }}>Select Access Level</h3>
              {roles.map((role) => {
                const isActive = activeTab === role.id;
                const Icon = role.icon;
                return (
                  <button
                    key={role.id}
                    onClick={() => { setActiveTab(role.id as any); setSelectedUser(null); setSearchTerm(''); setError(''); }}
                    className={`w-full text-left p-4 rounded-xl flex items-center justify-between transition-all duration-300 ${
                      isActive 
                        ? 'bg-white/15 border border-white/20 shadow-lg' 
                        : 'bg-transparent border border-transparent hover:bg-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white'}`}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-white" style={{ fontFamily: '"Google Sans", sans-serif' }}>{role.label}</div>
                        <div className="text-[10px] uppercase tracking-wider mt-0.5 text-white" style={{ fontFamily: '"Libre Franklin", sans-serif' }}>{role.desc}</div>
                      </div>
                    </div>
                    {isActive && <ChevronRight size={16} className="text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative z-10 mt-12 md:mt-0">
            <p className="text-white text-xs" style={{ fontFamily: '"Libre Franklin", sans-serif' }}>
              &copy; {new Date().getFullYear()} Circle of Hope Academy.<br/>All rights reserved.
            </p>
          </div>
        </div>

        {/* Right Half: Inputs */}
        <div className="w-full md:w-[55%] p-8 md:p-16 flex flex-col justify-center relative bg-white">
          <div className="max-w-sm w-full mx-auto relative z-10">
            
            {/* Parent Animation */}
            {activeTab === 'PARENT' && (
              <div className="w-32 h-32 md:w-40 md:h-40 mb-6 pointer-events-none opacity-90 transition-opacity duration-300">
                <img src={parentImages[frame]} alt="Parent Animation" className="w-full h-full object-contain object-left" />
              </div>
            )}

            <div className="mb-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: '"Google Sans", sans-serif' }}>
                {activeTab === 'ADMIN' ? 'Admin Access' : `Welcome, ${activeTab.charAt(0) + activeTab.slice(1).toLowerCase()}`}
              </h2>
              <p className="text-gray-500 text-sm" style={{ fontFamily: '"Libre Franklin", sans-serif' }}>
                {activeTab === 'ADMIN' 
                  ? 'Enter your security PIN to continue.' 
                  : 'Please identify yourself to proceed.'}
              </p>
            </div>

            {activeTab === 'ADMIN' && (
              <form onSubmit={handleAdminLogin} className="animate-fade-in space-y-6">
                <div>
                  <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold mb-2" style={{ fontFamily: '"Libre Franklin", sans-serif' }}>Security PIN</label>
                  <input
                    type="password"
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    maxLength={4}
                    autoFocus
                    disabled={loading}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-coha-500 focus:ring-2 focus:ring-coha-500/20 transition-all font-mono text-lg tracking-widest"
                  />
                </div>
                {error && <p className="text-red-500 text-sm font-medium" style={{ fontFamily: '"Libre Franklin", sans-serif' }}>{error}</p>}
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-coha-900 text-white hover:bg-coha-800 shadow-lg shadow-coha-900/30 font-bold py-3.5 px-4 rounded-xl transition-all flex justify-center items-center gap-2 hover:-translate-y-0.5"
                  style={{ fontFamily: '"Google Sans", sans-serif' }}
                >
                  {loading ? 'Authenticating...' : 'Login'}
                  {!loading && <ArrowLeft size={16} className="rotate-180" />}
                </button>
              </form>
            )}

            {(activeTab === 'TEACHER' || activeTab === 'PARENT' || activeTab === 'VTC') && (
              <form onSubmit={handleUserLogin} className="animate-fade-in space-y-6">
                {!selectedUser ? (
                  <div className="relative">
                    <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold mb-2" style={{ fontFamily: '"Libre Franklin", sans-serif' }}>
                      {activeTab === 'PARENT' ? 'Student Name' : 'Your Name'}
                    </label>
                    <input
                      type="text"
                      placeholder="Start typing..."
                      value={searchTerm}
                      onChange={handleSearch}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-coha-500 focus:ring-2 focus:ring-coha-500/20 transition-all"
                      style={{ fontFamily: '"Libre Franklin", sans-serif' }}
                    />
                    {searchResults.length > 0 && (
                      <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-200 rounded-xl z-20 max-h-48 overflow-y-auto shadow-xl overflow-hidden">
                        {searchResults.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleUserSelect(item)}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors"
                          >
                            <p className="font-bold text-gray-900" style={{ fontFamily: '"Google Sans", sans-serif' }}>{item.name}</p>
                            {activeTab === 'PARENT' && <p className="text-xs text-gray-500" style={{ fontFamily: '"Libre Franklin", sans-serif' }}>Grade: {item.grade}</p>}
                            {activeTab === 'TEACHER' && <p className="text-xs text-gray-500" style={{ fontFamily: '"Libre Franklin", sans-serif' }}>{item.subject}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="animate-fade-in space-y-6">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1" style={{ fontFamily: '"Libre Franklin", sans-serif' }}>Identified As</p>
                        <p className="font-bold text-gray-900" style={{ fontFamily: '"Google Sans", sans-serif' }}>{selectedUser.name}</p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => { setSelectedUser(null); setSearchTerm(''); }} 
                        className="text-xs text-coha-500 hover:text-coha-700 font-semibold transition-colors"
                        style={{ fontFamily: '"Libre Franklin", sans-serif' }}
                      >
                        Change
                      </button>
                    </div>
                    <div>
                      <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold mb-2" style={{ fontFamily: '"Libre Franklin", sans-serif' }}>Authorization PIN</label>
                      <input
                        type="password"
                        placeholder="••••"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        maxLength={4}
                        autoFocus
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-coha-500 focus:ring-2 focus:ring-coha-500/20 transition-all font-mono text-lg tracking-widest"
                      />
                    </div>
                    {error && <p className="text-red-500 text-sm font-medium" style={{ fontFamily: '"Libre Franklin", sans-serif' }}>{error}</p>}
                    <button 
                      type="submit" 
                      className="w-full bg-coha-900 text-white hover:bg-coha-800 shadow-lg shadow-coha-900/30 font-bold py-3.5 px-4 rounded-xl transition-all flex justify-center items-center gap-2 hover:-translate-y-0.5"
                      style={{ fontFamily: '"Google Sans", sans-serif' }}
                    >
                      Authenticate
                      <ArrowLeft size={16} className="rotate-180" />
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};