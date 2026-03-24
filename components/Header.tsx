import React, { useState, useEffect } from 'react';
import { Menu, Bell, ChevronDown, Search, LogOut, User, Settings } from 'lucide-react';
import { UserRole } from '../types';
import { getSystemSettings, getTeacherById } from '../services/dataService';

interface HeaderProps {
  onMenuClick: () => void;
  role: UserRole;
  userName?: string;
  userId?: string;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick, role, userName, userId, onLogout }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [schoolName, setSchoolName] = useState('Circle of Hope Academy');
  const [activeTermName, setActiveTermName] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const settings = await getSystemSettings();
      if (settings?.schoolName) {
        setSchoolName(settings.schoolName);
      }

      if (role === UserRole.TEACHER && userId && settings?.schoolCalendars) {
        const teacher = await getTeacherById(userId);
        if (teacher?.activeTermId) {
          const activeTerm = settings.schoolCalendars.find(t => t.id === teacher.activeTermId);
          if (activeTerm) {
            setActiveTermName(activeTerm.termName);
          }
        }
      }
    };
    fetchSettings();
  }, [role, userId]);

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-gray-200 h-20 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-40 transition-all duration-300 shadow-sm">
      {/* Left Section: Mobile Menu & Brand */}
      <div className="flex items-center gap-6">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-gray-600 hover:text-coha-900 hover:bg-gray-100 rounded-xl transition-all duration-200 active:scale-95 shadow-sm border border-transparent hover:border-gray-200"
        >
          <Menu size={24} />
        </button>

        {/* Brand - Enhanced visual */}
        <div className="flex items-center gap-4 group cursor-default">
           <div className="hidden md:block">
              {role === UserRole.TEACHER ? (
                <h1 className="text-xl font-archivo font-bold text-coha-600 leading-none tracking-tighter uppercase">
                  {activeTermName ? `Active Term: ${activeTermName}` : 'No Active Term Selected'}
                </h1>
              ) : (
                <h1 className="text-xl font-archivo font-bold text-gray-900 leading-none tracking-tighter group-hover:text-coha-700 transition-colors uppercase">{schoolName}</h1>
              )}
           </div>
        </div>
      </div>

      {/* Right Section: Actions & Profile */}
      <div className="flex items-center gap-4 sm:gap-6">

        {/* Notifications */}
        <button className="relative p-2.5 text-gray-500 hover:text-coha-600 transition-all rounded-full hover:bg-blue-50 group active:scale-95">
          <Bell size={22} className="group-hover:animate-swing origin-top" />
          <span className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full animate-pulse shadow-sm"></span>
        </button>

        <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>

        {/* Profile Dropdown */}
        <div className="relative">
            <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className={`flex items-center gap-3 pl-2 pr-1 py-1.5 rounded-none transition-all border ${isProfileOpen ? 'bg-gray-50 border-gray-200 ring-2 ring-gray-100' : 'bg-transparent border-transparent hover:bg-gray-50 hover:border-gray-200'} group`}
            >
                <div className="text-right hidden sm:block leading-tight">
                    <p className="text-sm font-bold text-gray-800 group-hover:text-coha-900 transition-colors font-archivo uppercase tracking-wide">{role}</p>
                    <p className="text-[10px] text-coha-500 font-extrabold uppercase tracking-wider">{userName || 'User'}</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-coha-900 to-blue-700 text-white rounded-none flex items-center justify-center shadow-md ring-2 ring-white group-hover:ring-blue-100 transition-all">
                    <span className="font-archivo text-lg">{userName ? userName.charAt(0).toUpperCase() : 'U'}</span>
                </div>
                <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ml-1 ${isProfileOpen ? 'rotate-180 text-coha-500' : ''}`} />
            </button>

            {/* Animated Dropdown Menu */}
            {isProfileOpen && (
                <>
                    <div className="fixed inset-0 z-30 cursor-default" onClick={() => setIsProfileOpen(false)}></div>
                    <div className="absolute right-0 top-full mt-3 w-72 bg-white rounded-none shadow-xl border border-gray-100 z-40 transform transition-all duration-300 origin-top-right animate-in fade-in zoom-in-95 overflow-hidden">
                        <div className="p-5 border-b border-gray-50 bg-gray-50/50">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1.5">Currently Signed In</p>
                            <p className="text-base font-black font-archivo text-gray-900 truncate uppercase">{userName}</p>
                            <p className="text-xs text-gray-500 mt-0.5 capitalize">{role.toLowerCase()} Access</p>
                        </div>
                        <div className="p-2 space-y-1">
                            <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-600 hover:text-coha-900 hover:bg-blue-50/50 rounded-none transition-all group">
                                <div className="p-2 bg-gray-100 rounded-none group-hover:bg-white group-hover:shadow-sm transition-all text-gray-500 group-hover:text-coha-600">
                                    <User size={16} />
                                </div>
                                View Profile
                            </button>
                            <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-600 hover:text-coha-900 hover:bg-blue-50/50 rounded-none transition-all group">
                                <div className="p-2 bg-gray-100 rounded-none group-hover:bg-white group-hover:shadow-sm transition-all text-gray-500 group-hover:text-coha-600">
                                    <Settings size={16} />
                                </div>
                                Account Settings
                            </button>
                        </div>
                        <div className="p-2 border-t border-gray-50 mt-1">
                             <button 
                                onClick={() => { setIsProfileOpen(false); if(onLogout) onLogout(); }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-none transition-colors group"
                             >
                                <div className="p-2 bg-red-100 rounded-none group-hover:bg-white group-hover:shadow-sm transition-all text-red-500">
                                    <LogOut size={16} />
                                </div>
                                Sign Out
                             </button>
                        </div>
                    </div>
                </>
            )}
        </div>
      </div>
      
      {/* Internal Styles for Animations */}
      <style>{`
        @keyframes swing {
            0% { transform: rotate(0deg); }
            20% { transform: rotate(15deg); }
            40% { transform: rotate(-10deg); }
            60% { transform: rotate(5deg); }
            80% { transform: rotate(-5deg); }
            100% { transform: rotate(0deg); }
        }
        .group:hover .animate-swing {
            animation: swing 0.6s ease-in-out;
        }
      `}</style>
    </header>
  );
};