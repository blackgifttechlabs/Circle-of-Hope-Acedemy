import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, GraduationCap, LogOut, X, FileText, Settings, Activity, ClipboardList, ChevronLeft, ChevronRight, Menu, Calendar } from 'lucide-react';
import { UserRole, Student } from '../types';
import { getPendingActionCounts, getStudentById } from '../services/dataService';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  role: UserRole;
  user?: any;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, role, user, onLogout }) => {
  const [badgeCount, setBadgeCount] = useState(0);
  const [vtcBadgeCount, setVtcBadgeCount] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [studentDivision, setStudentDivision] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch counts if Admin
    if (role === UserRole.ADMIN) {
      const fetchCounts = async () => {
        const counts = await getPendingActionCounts();
        setBadgeCount(counts.pendingApps + counts.pendingVerifications);
        setVtcBadgeCount(counts.pendingVtcApps);
      };
      fetchCounts();
      
      // Optional: Refresh counts every minute
      const interval = setInterval(fetchCounts, 60000);
      return () => clearInterval(interval);
    } else if (role === UserRole.PARENT && user?.id) {
        const fetchStudent = async () => {
            const student = await getStudentById(user.id);
            if (student) {
                setStudentDivision(student.division || null);
            }
        };
        fetchStudent();
    }
  }, [role, user]);

  const adminLinks = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'Applications', path: '/admin/applications', icon: <FileText size={20} />, badge: badgeCount },
    { label: 'VTC Applications', path: '/admin/vtc-applications', icon: <FileText size={20} />, badge: vtcBadgeCount },
    { label: 'Teachers', path: '/admin/teachers', icon: <Users size={20} /> },
    { label: 'Students', path: '/admin/students', icon: <GraduationCap size={20} /> },
    { label: 'Settings', path: '/admin/settings', icon: <Settings size={20} /> },
  ];

  const teacherLinks = [
    { label: 'Dashboard', path: '/teacher/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'My Classes', path: '/teacher/classes', icon: <GraduationCap size={20} /> },
    { label: 'Register', path: '/teacher/register', icon: <ClipboardList size={20} /> },
  ];

  const parentLinks = [
    { label: 'Dashboard', path: '/parent/dashboard', icon: <LayoutDashboard size={20} /> },
    ...(studentDivision !== 'Mainstream' ? [{ label: 'Assessment Info', path: '/parent/assessment-form', icon: <ClipboardList size={20} /> }] : []),
    { label: 'Assessment Progress', path: '/parent/assessment', icon: <Activity size={20} /> },
    { label: 'Daily Register', path: '/parent/register', icon: <Calendar size={20} /> },
  ];

  const vtcLinks = [
    { label: 'Dashboard', path: '/vtc/dashboard', icon: <LayoutDashboard size={20} /> },
  ];

  let links = parentLinks;
  if (role === UserRole.ADMIN) links = adminLinks;
  if (role === UserRole.TEACHER) links = teacherLinks;
  if (role === UserRole.VTC_STUDENT) links = vtcLinks;

  const sidebarWidth = isCollapsed ? 'w-20' : 'w-72';

  const sidebarClasses = `fixed inset-y-0 left-0 z-50 bg-coha-900 text-white transform transition-all duration-700 ease-in-out flex flex-col h-full ${
    isOpen ? 'translate-x-0' : '-translate-x-full'
  } lg:translate-x-0 lg:static shadow-xl ${sidebarWidth}`;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div className={sidebarClasses}>
        {/* Collapse Toggle Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-4 top-8 bg-coha-500 text-white rounded-full p-1.5 shadow-md z-50 hover:bg-coha-400 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className={`flex items-center p-6 border-b border-coha-800 shrink-0 relative transition-all duration-700 ${isCollapsed ? 'justify-center px-2' : 'justify-start gap-3'}`}>
            <button onClick={onClose} className="lg:hidden text-white absolute top-4 right-4">
                <X size={24} />
            </button>
            <div className="bg-white p-1.5 rounded-full shrink-0">
                <img 
                    src="https://i.ibb.co/LzYXwYfX/logo.png" 
                    alt="COHA Logo" 
                    className="w-10 h-10 object-contain"
                />
            </div>
            <div className={`flex flex-col whitespace-nowrap overflow-hidden transition-all duration-700 ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[300px] opacity-100'}`}>
                <h1 className="text-lg font-bold tracking-tight leading-tight text-white">Circle of Hope</h1>
                <h1 className="text-lg font-bold tracking-tight leading-tight text-white">Academy</h1>
            </div>
        </div>

        <nav className="mt-4 px-3 flex-1 overflow-y-auto overflow-x-hidden">
          <ul className="space-y-2">
            {links.map((link) => (
              <li key={link.path}>
                <NavLink
                  to={link.path}
                  onClick={() => window.innerWidth < 1024 && onClose()}
                  className={({ isActive }) =>
                    `flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-3 rounded-lg transition-all duration-700 relative ${
                      isActive 
                        ? 'bg-coha-500 text-white font-semibold' 
                        : 'text-white hover:bg-coha-800'
                    }`
                  }
                  title={isCollapsed ? link.label : undefined}
                >
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 text-white">{link.icon}</div>
                    <span className={`whitespace-nowrap text-white transition-all duration-700 overflow-hidden ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>
                      {link.label}
                    </span>
                  </div>
                  {/* Badge */}
                  {!isCollapsed && (link as any).badge > 0 && (
                     <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                        {(link as any).badge}
                     </span>
                  )}
                  {isCollapsed && (link as any).badge > 0 && (
                     <span className="absolute top-2 right-2 bg-red-500 w-2.5 h-2.5 rounded-full"></span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="w-full p-4 border-t border-coha-800 shrink-0">
          <button 
            onClick={onLogout}
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-3 text-white hover:bg-coha-800 rounded-lg w-full transition-all duration-700`}
            title={isCollapsed ? 'Logout' : undefined}
          >
            <div className="shrink-0 text-white"><LogOut size={20} /></div>
            <span className={`whitespace-nowrap text-white transition-all duration-700 overflow-hidden ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>
              Logout
            </span>
          </button>
        </div>
      </div>
    </>
  );
};