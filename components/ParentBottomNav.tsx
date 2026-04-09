import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CreditCard, Home, Settings, User, type LucideIcon } from 'lucide-react';
import { getHomeworkAssignmentsForClass, getStudentById } from '../services/dataService';

export type ParentPrimaryTab = 'home' | 'details' | 'receipts' | 'homework' | 'settings';

const NAV_ITEMS: { id: ParentPrimaryTab; label: string; Icon: LucideIcon }[] = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'details', label: 'Details', Icon: User },
  { id: 'receipts', label: 'Receipts', Icon: CreditCard },
  { id: 'homework', label: 'Homework', Icon: BookOpen },
  { id: 'settings', label: 'Settings', Icon: Settings },
];

export const ParentBottomNav: React.FC<{ activeTab?: ParentPrimaryTab | null; userId?: string }> = ({ activeTab = null, userId }) => {
  const navigate = useNavigate();
  const [homeworkBadgeCount, setHomeworkBadgeCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const fetchHomeworkBadge = async () => {
      const student = await getStudentById(userId);
      if (!student?.assignedClass) {
        setHomeworkBadgeCount(0);
        return;
      }
      const assignments = await getHomeworkAssignmentsForClass(student.assignedClass);
      setHomeworkBadgeCount(assignments.length);
    };

    const handleUpdate = () => {
      fetchHomeworkBadge();
    };

    fetchHomeworkBadge();
    window.addEventListener('focus', handleUpdate);
    window.addEventListener('coha-homework-assignment-update', handleUpdate as EventListener);
    const interval = setInterval(fetchHomeworkBadge, 30000);

    return () => {
      window.removeEventListener('focus', handleUpdate);
      window.removeEventListener('coha-homework-assignment-update', handleUpdate as EventListener);
      clearInterval(interval);
    };
  }, [userId]);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[#3b3b78] bg-[#2b2b5e] shadow-[0_-10px_30px_rgba(15,23,42,0.28)]">
      <div className="grid grid-cols-5">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          const badge = id === 'homework' ? homeworkBadgeCount : 0;
          return (
          <button
            key={id}
            onClick={() => navigate(`/parent/dashboard?tab=${id}`)}
            className={`relative h-16 flex flex-col items-center justify-center gap-1 text-[11px] transition-all ${
              isActive ? 'bg-white/10 text-white' : 'text-white'
            }`}
          >
            {badge > 0 && (
              <span className="absolute right-3 top-2 min-w-[18px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-black leading-none text-white animate-pulse">
                {badge}
              </span>
            )}
            <span className={`transition-transform ${isActive ? 'scale-110' : 'scale-100 opacity-90'}`}>
              <Icon size={isActive ? 21 : 19} strokeWidth={isActive ? 3.2 : 2.9} className="text-white" />
            </span>
            <span className={isActive ? 'font-black text-white' : 'font-bold text-white opacity-90'}>{label}</span>
          </button>
        )})}
      </div>
    </nav>
  );
};
