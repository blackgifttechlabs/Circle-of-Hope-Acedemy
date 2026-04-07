import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';

type ActionItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void | Promise<void>;
};

interface ActionMenuProps {
  label: string;
  icon: LucideIcon;
  items: ActionItem[];
  className?: string;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({ label, icon: Icon, items, className = '' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold shadow-sm transition-all ${className}`}
      >
        <Icon size={16} />
        {label}
        <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.65rem)] z-40 min-w-[220px] overflow-hidden rounded-3xl border border-slate-200 bg-white/95 p-2 shadow-[0_18px_45px_rgba(15,23,42,0.18)] backdrop-blur">
          {items.map((item) => {
            const ItemIcon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={async () => {
                  setOpen(false);
                  await item.onClick();
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                  <ItemIcon size={16} />
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
