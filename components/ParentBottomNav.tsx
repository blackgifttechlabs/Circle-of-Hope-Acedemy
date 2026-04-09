import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CreditCard, FileText, Home, User } from 'lucide-react';

export type ParentPrimaryTab = 'home' | 'details' | 'receipts' | 'homework' | 'settings';

const NAV_ITEMS: { id: ParentPrimaryTab; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <Home size={18} strokeWidth={2.6} /> },
  { id: 'details', label: 'Details', icon: <User size={18} strokeWidth={2.6} /> },
  { id: 'receipts', label: 'Receipts', icon: <CreditCard size={18} strokeWidth={2.6} /> },
  { id: 'homework', label: 'Homework', icon: <BookOpen size={18} strokeWidth={2.6} /> },
  { id: 'settings', label: 'Settings', icon: <FileText size={18} strokeWidth={2.6} /> },
];

export const ParentBottomNav: React.FC<{ activeTab?: ParentPrimaryTab | null }> = ({ activeTab = null }) => {
  const navigate = useNavigate();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-white/10 bg-[#2b2b5e] backdrop-blur">
      <div className="grid grid-cols-5">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(`/parent/dashboard?tab=${item.id}`)}
            className={`h-16 flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-colors ${
              activeTab === item.id ? 'text-white bg-white/10' : 'text-white/78'
            }`}
          >
            <span className="text-current">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};
