import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  addActivityLog,
  verifyAdminPin,
  searchTeachers,
  searchStudents,
  searchVtcStudents,
  searchLoginIndex,
  signInPortalAccount,
  getTeacherById,
  getStudentById,
  getVtcApplicationById,
  getMatronById,
} from '../services/dataService';
import { UserRole, Teacher, Student, Matron } from '../types';
import { ArrowLeft, ChevronRight, Search as SearchIcon, LockKeyhole } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getFriendlyErrorMessage } from '../utils/friendlyErrors';

interface LoginProps {
  onLogin: (role: UserRole, user: any) => void;
  showToast?: (message: string, variant?: 'success' | 'error' | 'info') => void;
}

export const LoginPage: React.FC<LoginProps> = ({ onLogin, showToast }) => {
  const [activeTab, setActiveTab] = useState<'ADMIN' | 'TEACHER' | 'PARENT' | 'VTC' | 'MATRON'>('ADMIN');
  const [step, setStep] = useState<number>(0); // 0: Role Selection, 1: Login Form (Mobile)
  const [pin, setPin] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [isMobile, setIsMobile] = useState(false);
  const panelTransition = { duration: 0.18, ease: [0.4, 0, 0.2, 1] as const };

  const showLoginError = (message: string) => {
    setError(message);
    showToast?.(message, 'error');
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const adminUser = await verifyAdminPin(pin);

      if (adminUser) {
        const isSubAdmin = adminUser.adminRole === 'sub_admin' || adminUser.id !== 'admin';
        showToast?.(`Welcome back, ${adminUser.name}!`, 'success');
        addActivityLog({
          category: 'LOGIN',
          action: `${adminUser.name} logged in`,
          actorId: adminUser.id,
          actorName: adminUser.name,
          actorRole: isSubAdmin ? 'SUB_ADMIN' : UserRole.ADMIN,
          details: isSubAdmin ? 'Sub-admin portal login.' : 'Main admin portal login.',
        });
        onLogin(UserRole.ADMIN, adminUser);
        navigate(isSubAdmin ? '/admin/applications' : '/admin/dashboard');
      } else {
        showLoginError('Incorrect admin PIN');
      }
    } catch (err) {
      showLoginError(getFriendlyErrorMessage(err));
      console.error('Admin login failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    setSelectedUser(null);
    setPin('');
    setError('');

    if (term.length > 1) {
      try {
        if (activeTab === 'TEACHER') {
          const indexResults = await searchLoginIndex(UserRole.TEACHER, term);
          setSearchResults(indexResults.length ? indexResults : await searchTeachers(term));
        } else if (activeTab === 'PARENT') {
          const indexResults = await searchLoginIndex(UserRole.PARENT, term);
          setSearchResults(indexResults.length ? indexResults : await searchStudents(term));
        } else if (activeTab === 'VTC') {
          const indexResults = await searchLoginIndex(UserRole.VTC_STUDENT, term);
          if (indexResults.length) {
            setSearchResults(indexResults);
          } else {
            const results = await searchVtcStudents(term);
            setSearchResults(results.map(r => ({ ...r, name: `${r.firstName} ${r.surname}` })));
          }
        } else if (activeTab === 'MATRON') {
          const indexResults = await searchLoginIndex(UserRole.MATRON, term);
          setSearchResults(indexResults);
        }
      } catch (err) {
        console.error('Login search failed:', err);
        setSearchResults([]);
        showLoginError('We could not search accounts right now. Please refresh and try again.');
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleUserSelect = (user: any) => {
    setSelectedUser(user);
    setSearchResults([]);
    setSearchTerm(user.name);
    setPin('');
  };

  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      showLoginError('Please select a user first');
      return;
    }

    let success = false;
    let role = UserRole.TEACHER;
    let userData = selectedUser;
    const targetId = selectedUser.targetId || selectedUser.id;

    if (activeTab === 'TEACHER') {
      try {
        await signInPortalAccount(UserRole.TEACHER, targetId, pin);
        const teacher = await getTeacherById(targetId);
        if (!teacher) throw new Error('Teacher profile not found.');
        success = true;
        role = UserRole.TEACHER;
        userData = teacher;
      } catch {
        showLoginError('Incorrect teacher password, or this teacher account has not been synced yet.');
        return;
      }
    } else if (activeTab === 'PARENT') {
      try {
        await signInPortalAccount(UserRole.PARENT, targetId, pin);
        const student = await getStudentById(targetId);
        if (!student) throw new Error('Student profile not found.');
        success = true;
        role = UserRole.PARENT;
        userData = { ...student, name: student.parentName };
      } catch {
        showLoginError('Incorrect parent password, or this parent account has not been synced yet.');
        return;
      }
    } else if (activeTab === 'VTC') {
      try {
        await signInPortalAccount(UserRole.VTC_STUDENT, targetId, pin);
        const vtcStudent = await getVtcApplicationById(targetId);
        if (!vtcStudent) throw new Error('VTC profile not found.');
        success = true;
        role = UserRole.VTC_STUDENT;
        userData = { ...vtcStudent, id: targetId, name: `${vtcStudent.firstName} ${vtcStudent.surname}` };
      } catch {
        showLoginError('Incorrect VTC student password, or this account has not been synced yet.');
        return;
      }
    } else if (activeTab === 'MATRON') {
      try {
        await signInPortalAccount(UserRole.MATRON, targetId, pin);
        const matron = await getMatronById(targetId);
        if (!matron) throw new Error('Matron profile not found.');
        success = true;
        role = UserRole.MATRON;
        userData = matron;
      } catch {
        showLoginError('Incorrect matron password. Use the synced matron password or ask an admin to reset it.');
        return;
      }
    }

    if (success) {
      showToast?.(`Welcome back, ${userData.name}!`, 'success');
      addActivityLog({
        category: 'LOGIN',
        action: `${userData.name} logged in`,
        actorId: targetId,
        actorName: userData.name,
        actorRole: role,
        targetId: role === UserRole.PARENT ? targetId : undefined,
        targetName: role === UserRole.PARENT ? selectedUser.name : undefined,
        details: role === UserRole.PARENT ? `Parent logged in for ${selectedUser.name}.` : `${role} portal login.`,
      });
      onLogin(role, userData);
      if (role === UserRole.TEACHER) navigate('/teacher/dashboard');
      if (role === UserRole.PARENT) navigate('/parent/dashboard');
      if (role === UserRole.VTC_STUDENT) navigate('/vtc/dashboard');
      if (role === UserRole.MATRON) navigate('/matron/dashboard');
    } else {
      showLoginError('Incorrect PIN');
    }
  };

  const roles = [
    { id: 'ADMIN', label: 'Admin', icon: '/admin.png', desc: 'System Management' },
    { id: 'TEACHER', label: 'Teacher', icon: '/teacher.png', desc: 'Class & Grades' },
    { id: 'PARENT', label: 'Parent', icon: '/parent.png', desc: 'Student Progress' },
    { id: 'MATRON', label: 'Matron', icon: '/matron.png', desc: 'Care & Medication' },
    { id: 'VTC', label: 'VTC', icon: '/vtc.png', desc: 'Vocational Training' },
  ] as const;
  const activeRole = roles.find((role) => role.id === activeTab);

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-8 overflow-hidden bg-gray-100">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0" 
        style={{ backgroundImage: 'url("/login-bg.avif")' }}
      />
      {/* Light Overlay */}
      <div className="absolute inset-0 bg-white/40 backdrop-blur-sm z-0" />

      {/* Back/Return Button */}
      <button 
        onClick={() => {
          if (step === 1 && isMobile) {
            setStep(0);
          } else {
            navigate('/');
          }
        }} 
        className="absolute top-4 left-4 md:top-8 md:left-8 z-30 flex items-center gap-2 group bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-4 py-2 md:px-6 md:py-3 rounded-full transition-all shadow-lg"
        style={{ fontFamily: '"Google Sans", sans-serif' }}
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        <span className="font-bold text-xs md:text-sm">
          {step === 1 && isMobile ? 'Back' : 'Return'}
        </span>
      </button>

      {/* Main Container */}
      <div className="w-full max-w-6xl h-auto md:h-[700px] bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col md:flex-row z-10 relative border border-white/50">
        
        <AnimatePresence mode="sync" initial={false}>
          {/* Step 0: Role Selection (Mobile) or Left Panel (Desktop) */}
          {(step === 0 || !isMobile) && (
            <motion.div 
              key="roles-panel"
              initial={isMobile ? { x: 0 } : { opacity: 0, x: -20 }}
              animate={{ x: 0, opacity: 1 }}
              exit={isMobile ? { x: '-100%', opacity: 0 } : { opacity: 0, x: -20 }}
              transition={panelTransition}
              className="w-full md:w-[45%] bg-gradient-to-br from-coha-900 to-coha-800 p-6 md:p-12 flex flex-col justify-between relative shrink-0 rounded-3xl md:rounded-l-3xl md:rounded-r-none overflow-hidden"
            >
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CjxyZWN0IHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgZmlsbD0ibm9uZSIvPgo8Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+Cjwvc3ZnPg==')] opacity-10 mix-blend-overlay" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8 md:mb-12">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-2xl p-2 shadow-lg">
                    <img src="/logo.png" alt="COHA Logo" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight" style={{ fontFamily: '"Google Sans", sans-serif' }}>COHA</h1>
                    <p className="text-white text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ fontFamily: '"Libre Franklin", sans-serif' }}>Secure Portal</p>
                  </div>
                </div>

                <div className="space-y-3 md:space-y-4">
                  <h3 className="text-white text-[10px] md:text-xs uppercase tracking-[0.15em] font-bold mb-3 md:mb-4" style={{ fontFamily: '"Libre Franklin", sans-serif' }}>Select Access Level</h3>
                  {roles.map((role, idx) => {
                    const isActive = activeTab === role.id;
                    return (
                      <motion.button
                        key={role.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03, duration: 0.16 }}
                        onClick={() => { 
                          setActiveTab(role.id as any); 
                          setSelectedUser(null); 
                          setSearchTerm(''); 
                          setPin('');
                          setError('');
                          if (isMobile) setStep(1);
                        }}
                        className={`w-full text-left p-4 md:p-5 rounded-2xl flex items-center justify-between transition-all duration-150 group ${
                          isActive && !isMobile
                            ? 'bg-white/15 border border-white/20 shadow-lg' 
                            : 'bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl transition-colors ${isActive && !isMobile ? 'bg-white/20 text-white' : 'bg-white/10 text-white group-hover:bg-white/20'}`}>
                            <img
                              src={role.icon}
                              alt=""
                              aria-hidden="true"
                              className="w-[22px] h-[22px] object-contain brightness-0 invert"
                            />
                          </div>
                          <div>
                            <div className="font-bold text-sm md:text-base text-white" style={{ fontFamily: '"Google Sans", sans-serif' }}>{role.label}</div>
                            <div className="text-[10px] md:text-[11px] uppercase tracking-wider mt-0.5 text-white/60" style={{ fontFamily: '"Libre Franklin", sans-serif' }}>{role.desc}</div>
                          </div>
                        </div>
                        <ChevronRight size={18} className={`text-white/40 group-hover:text-white transition-all duration-150 ${isActive && !isMobile ? 'translate-x-1 text-white' : ''}`} />
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="relative z-10 mt-8 md:mt-0">
                <p className="text-white text-[10px] md:text-xs opacity-40" style={{ fontFamily: '"Libre Franklin", sans-serif' }}>
                  &copy; {new Date().getFullYear()} Circle of Hope Academy.<br/>All rights reserved.
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 1: Login Form (Mobile) or Right Panel (Desktop) */}
          {(step === 1 || !isMobile) && (
            <motion.div 
              key={`form-panel-${activeTab}`}
              initial={isMobile ? { x: '100%' } : false}
              animate={isMobile ? { x: 0, opacity: 1 } : { opacity: 1 }}
              exit={isMobile ? { x: '100%', opacity: 1 } : { opacity: 1 }}
              transition={isMobile ? panelTransition : { duration: 0 }}
              className="w-full md:w-[55%] p-8 md:p-16 flex flex-col justify-center relative bg-white rounded-3xl md:rounded-r-3xl md:rounded-l-none"
            >
              <div className="max-w-sm w-full mx-auto relative z-10">
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.7, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="relative mx-auto mb-8 flex h-40 w-40 items-center justify-center"
                  aria-hidden="true"
                >
                  {[0, 1, 2, 3, 4].map((wave) => (
                    <motion.div
                      key={wave}
                      animate={{ scale: [0.72, 1.42], opacity: [0.7, 0] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut', delay: wave * 0.42 }}
                      className="absolute rounded-full border-2 border-coha-500/45 bg-coha-500/[0.06] shadow-lg shadow-coha-900/10 backdrop-blur-sm"
                      style={{ inset: `${wave * 10}%`, zIndex: 5 - wave }}
                    />
                  ))}
                  <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-coha-900 shadow-xl shadow-coha-900/25">
                    <img
                      src={activeRole?.icon}
                      alt={`${activeRole?.label} icon`}
                      className="h-9 w-9 object-contain brightness-0 invert"
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.12, ease: 'easeOut' }}
                  className="mb-8 text-center md:mb-12"
                >
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3" style={{ fontFamily: '"Google Sans", sans-serif' }}>
                    {activeTab === 'ADMIN' ? 'Admin Access' : (activeTab === 'MATRON' && selectedUser) ? `Welcome, Matron` : `Welcome, ${activeTab.charAt(0) + activeTab.slice(1).toLowerCase()}`}
                  </h2>
                  <p className="text-gray-500 text-sm md:text-base leading-relaxed" style={{ fontFamily: '"Libre Franklin", sans-serif' }}>
                    {activeTab === 'ADMIN' 
                      ? 'Enter your security password to continue.' 
                      : (activeTab === 'MATRON' && !selectedUser) ? 'Search for your name to log in.' : 'Please identify yourself to proceed.'}
                  </p>
                </motion.div>

                {activeTab === 'ADMIN' && (
                  <motion.form
                    onSubmit={handleAdminLogin}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.22, ease: 'easeOut' }}
                    className="mx-auto space-y-6 text-center"
                  >
                    <div>
                      <label className="mb-3 block text-sm font-semibold tracking-tight text-gray-800" style={{ fontFamily: '"Libre Franklin", sans-serif' }}>Security Password</label>
                      <div className="group relative text-left">
                        <LockKeyhole size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-coha-600" />
                        <input
                          type="password"
                          placeholder="Enter password"
                          value={pin}
                          onChange={(e) => setPin(e.target.value)}
                          autoFocus
                          disabled={loading}
                          className="w-full rounded-2xl border border-gray-200 bg-gray-50/80 py-4 pl-12 pr-5 text-gray-900 placeholder-gray-400 shadow-sm outline-none transition-all duration-300 focus:border-coha-500 focus:bg-white focus:ring-4 focus:ring-coha-500/10 focus:shadow-lg focus:shadow-coha-900/10 text-lg"
                        />
                      </div>
                    </div>
                    {error && <p className="text-red-500 text-sm font-medium" style={{ fontFamily: '"Libre Franklin", sans-serif' }}>{error}</p>}
                    <Button
                      type="submit" 
                      loading={loading}
                      fullWidth
                      className="!rounded-2xl !py-4 shadow-xl shadow-coha-900/20"
                      style={{ fontFamily: '"Google Sans", sans-serif' }}
                    >
                      {!loading && <span>Login</span>}
                      {!loading && <ArrowLeft size={18} className="rotate-180" />}
                    </Button>
                  </motion.form>
                )}

                {(activeTab === 'TEACHER' || activeTab === 'PARENT' || activeTab === 'VTC' || activeTab === 'MATRON') && (
                  <form onSubmit={handleUserLogin} className="space-y-8">
                    {!selectedUser ? (
                      <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="relative text-center"
                      >
                        <label className="mb-3 block text-sm font-semibold tracking-tight text-gray-800" style={{ fontFamily: '"Libre Franklin", sans-serif' }}>
                          {activeTab === 'PARENT' ? 'Student Name' : 'Your Name'}
                        </label>
                        <div className="relative">
                          <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Start typing..."
                            value={searchTerm}
                            onChange={handleSearch}
                            className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-4 pl-12 pr-5 text-center text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-coha-500 focus:bg-white focus:ring-4 focus:ring-coha-500/10"
                            style={{ fontFamily: '"Libre Franklin", sans-serif' }}
                          />
                        </div>
                        
                        {/* iOS Dropdown Style Suggestions */}
                        <AnimatePresence>
                          {searchResults.length > 0 && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.98 }}
                              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                              className="absolute top-full left-0 w-full mt-3 ios-dropdown-blur border border-white/40 rounded-3xl z-50 max-h-64 overflow-y-auto shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] custom-scrollbar"
                            >
                              {searchResults.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => handleUserSelect(item)}
                                  className="w-full text-left p-5 hover:bg-black/5 active:bg-black/10 cursor-pointer border-b border-black/5 last:border-0 transition-colors flex items-center justify-between group"
                                >
                                  <div>
                                    <p className="font-bold text-gray-900 text-base md:text-lg" style={{ fontFamily: '"Google Sans", sans-serif' }}>{item.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      {activeTab === 'PARENT' && <span className="text-[10px] font-bold text-coha-500 bg-coha-50 px-2 py-0.5 rounded-full uppercase tracking-wider">{item.subtitle || `Grade ${item.grade || '-'}`}</span>}
                                      {activeTab === 'TEACHER' && <span className="text-[10px] font-bold text-coha-500 bg-coha-50 px-2 py-0.5 rounded-full uppercase tracking-wider">{item.subtitle || item.subject}</span>}
                                    </div>
                                  </div>
                                  <ChevronRight size={18} className="text-gray-300 group-hover:text-coha-500 transition-all duration-300 group-hover:translate-x-1" />
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-8"
                      >
                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 flex justify-between items-center shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-coha-900/10 rounded-xl flex items-center justify-center text-coha-900 font-bold text-lg">
                              {selectedUser.name[0]}
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-0.5" style={{ fontFamily: '"Libre Franklin", sans-serif' }}>Identified As</p>
                              <p className="font-bold text-gray-900 text-lg" style={{ fontFamily: '"Google Sans", sans-serif' }}>{selectedUser.name}</p>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => { setSelectedUser(null); setSearchTerm(''); }} 
                            className="p-2 text-gray-400 hover:text-coha-500 transition-colors"
                          >
                            <ArrowLeft size={20} />
                          </button>
                        </div>
                        <div>
                          <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold mb-3" style={{ fontFamily: '"Libre Franklin", sans-serif' }}>
                            {activeTab === 'TEACHER' ? 'Authorization Password' : 'Authorization PIN'}
                          </label>
                          {activeTab === 'TEACHER' ? (
                            <input
                              type="password"
                              value={pin}
                              onChange={(e) => setPin(e.target.value)}
                              placeholder="Enter password"
                              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-coha-500 focus:ring-4 focus:ring-coha-500/10 transition-all text-lg"
                            />
                          ) : (
                            <div className="flex justify-between gap-2 max-w-[280px] mx-auto">
                              {[0, 1, 2, 3].map((idx) => (
                                <input
                                  key={idx}
                                  id={`pin-${idx}`}
                                  type="password"
                                  inputMode="numeric"
                                  maxLength={1}
                                  value={pin[idx] || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val && !/^\d$/.test(val)) return;
                                    const newPin = pin.split('');
                                    newPin[idx] = val;
                                    setPin(newPin.join(''));
                                    if (val && idx < 3) {
                                      document.getElementById(`pin-${idx + 1}`)?.focus();
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Backspace' && !pin[idx] && idx > 0) {
                                      document.getElementById(`pin-${idx - 1}`)?.focus();
                                    }
                                  }}
                                  className="w-14 h-16 bg-gray-50 border-2 border-gray-200 rounded-2xl text-center text-2xl font-bold focus:border-coha-500 focus:ring-4 focus:ring-coha-500/10 outline-none transition-all"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        {error && <p className="text-red-500 text-sm font-medium" style={{ fontFamily: '"Libre Franklin", sans-serif' }}>{error}</p>}
                        <Button
                          type="submit" 
                          fullWidth
                          loading={loading}
                          className="!rounded-2xl !py-4 shadow-xl shadow-coha-900/20"
                          style={{ fontFamily: '"Google Sans", sans-serif' }}
                        >
                          {!loading && <span>Authenticate</span>}
                          {!loading && <ArrowLeft size={18} className="rotate-180" />}
                        </Button>
                      </motion.div>
                    )}
                  </form>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
