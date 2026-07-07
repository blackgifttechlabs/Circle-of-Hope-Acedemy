import React from 'react';
import { LucideIcon } from 'lucide-react';

export const TableHeaderCell: React.FC<{
  icon: LucideIcon;
  children?: React.ReactNode;
  className?: string;
}> = ({ icon: Icon, children, className = '' }) => (
  <th className={`bg-[#2E1065] px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-white ${className}`}>
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <Icon size={14} strokeWidth={2.4} />
      {children}
    </span>
  </th>
);

export const TableSkeletonRows: React.FC<{
  rows?: number;
  columns: number;
  showCheckbox?: boolean;
}> = ({ rows = 10, columns, showCheckbox = false }) => (
  <>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <tr key={`skeleton-${rowIndex}`} className="border-b border-slate-100">
        {Array.from({ length: columns }).map((__, columnIndex) => {
          const isCheckbox = showCheckbox && columnIndex === 0;
          return (
            <td key={`skeleton-${rowIndex}-${columnIndex}`} className="px-6 py-4">
              {isCheckbox ? (
                <span className="block h-4 w-4 rounded border border-slate-200 bg-white" />
              ) : (
                <span className="flex items-center gap-2">
                  {columnIndex === 1 && <span className="h-5 w-5 rounded-full bg-slate-100 animate-pulse" />}
                  <span
                    className="block h-3 rounded bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 bg-[length:200%_100%] animate-pulse"
                    style={{ width: `${columnIndex % 3 === 0 ? 54 : columnIndex % 3 === 1 ? 78 : 64}%` }}
                  />
                </span>
              )}
            </td>
          );
        })}
      </tr>
    ))}
  </>
);
