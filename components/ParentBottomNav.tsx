import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CreditCard, FileText, Home, User, type LucideIcon } from 'lucide-react';

export type ParentPrimaryTab = 'home' | 'details' | 'receipts' | 'homework' | 'settings';

const NAV_ITEMS: { id: ParentPrimaryTab; label: string; Icon: LucideIcon }[] = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'details', label: 'Details', Icon: User },
  { id: 'receipts', label: 'Receipts', Icon: CreditCard },
  { id: 'homework', label: 'Homework', Icon: BookOpen },
  { id: 'settings', label: 'Settings', Icon: FileText },
];

export const ParentBottomNav: React.FC<{ activeTab?: ParentPrimaryTab | null }> = ({ activeTab = null }) => {
  const navigate = useNavigate();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[#3b3b78] bg-[#2b2b5e] shadow-[0_-10px_30px_rgba(15,23,42,0.28)]">
      <div className="grid grid-cols-5">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
          <button
            key={id}
            onClick={() => navigate(`/parent/dashboard?tab=${id}`)}
            className={`h-16 flex flex-col items-center justify-center gap-1 text-[11px] transition-all ${
              isActive ? 'bg-white/10 text-white' : 'text-white'
            }`}
          >
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
