import React from 'react';
import { LucideIcon } from 'lucide-react';

export const FolderTabs: React.FC<{
  tabs: Array<{
    id: string;
    label: string;
    icon: LucideIcon;
    count?: number;
  }>;
  activeId: string;
  onChange: (id: string) => void;
  loading?: boolean;
  skeletonCount?: number;
}> = ({ tabs, activeId, onChange, loading = false, skeletonCount = 8 }) => (
  <div className="folder-tabs-wrap">
    <div
      className="folder-tabs"
      style={{ '--folder-tab-count': loading ? skeletonCount : Math.max(tabs.length, 1) } as React.CSSProperties}
    >
      {loading ? Array.from({ length: skeletonCount }).map((_, index) => (
        <div key={`folder-tab-skeleton-${index}`} className="folder-tab skeleton">
          <span className="skeleton-icon" />
          <span className="skeleton-label" />
        </div>
      )) : tabs.map(({ id, label, icon: Icon, count }) => {
        const active = id === activeId;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`folder-tab ${active ? 'active' : ''}`}
          >
            <Icon size={15} strokeWidth={2.4} />
            <span>{label}</span>
            {typeof count === 'number' && (
              <span className={`folder-pill ${count === 0 ? 'zero' : ''}`}>{count}</span>
            )}
          </button>
        );
      })}
    </div>
    <style>{`
      .folder-tabs-wrap {
        width: 100%;
        overflow-x: clip;
        overflow-y: hidden;
        scrollbar-width: none;
      }
      .folder-tabs-wrap::-webkit-scrollbar {
        display: none;
      }
      .folder-tabs {
        display: grid;
        grid-template-columns: repeat(var(--folder-tab-count), minmax(0, 1fr));
        align-items: flex-end;
        gap: 5px;
        width: 100%;
      }
      .folder-tab {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        min-width: 0;
        height: 40px;
        padding: 0 clamp(8px, 1vw, 18px);
        border: 1px solid #E7C8F6;
        border-bottom-color: #DADAE4;
        border-radius: 11px 11px 0 0;
        background: #FFFFFF;
        color: #111827;
        font-size: 12.5px;
        font-weight: 900;
        white-space: nowrap;
        transition: transform .18s ease, background .18s ease, color .18s ease, box-shadow .18s ease;
      }
      .folder-tab span:not(.folder-pill) {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .folder-tab::after {
        content: "";
        position: absolute;
        right: -15px;
        bottom: -1px;
        width: 30px;
        height: 40px;
        background: inherit;
        border-top: 1px solid #E7C8F6;
        border-right: 1px solid #E7C8F6;
        transform: skewX(22deg);
        transform-origin: left bottom;
        border-radius: 0 9px 0 0;
        z-index: -1;
      }
     .folder-tab.active {
        z-index: 2;
        background: #2E1065;
        border-color: #2E1065;
        color: #FFFFFF;
        box-shadow: 0 8px 18px rgba(46,16,101,0.25);
        transform: translateY(-2px);
      }
      .folder-tab.active::after {
        background: #2E1065;
        border-color: #2E1065;
      }
      .folder-pill {
        flex: 0 0 auto;
        min-width: 22px;
        height: 22px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 7px;
        border-radius: 999px;
        background: rgba(255,255,255,0.22);
        color: #FFFFFF;
        font-size: 11px;
        font-weight: 900;
      }
      .folder-pill.zero {
        background: #ECEAF2;
        color: #9CA3AF;
      }
      .folder-tab.active .folder-pill.zero {
        background: rgba(255,255,255,0.22);
        color: #FFFFFF;
      }
      .folder-tab.skeleton {
        pointer-events: none;
        border-color: #E7E2EF;
        background: #FFFFFF;
      }
      .folder-tab.skeleton::after {
        border-color: #E7E2EF;
      }
      .skeleton-icon,
      .skeleton-label {
        display: block;
        border-radius: 999px;
        background: linear-gradient(90deg, #F1EFF5 0%, #E5E1EC 50%, #F1EFF5 100%);
        background-size: 200% 100%;
        animation: folderSkeletonPulse 1.2s ease-in-out infinite;
      }
      .skeleton-icon {
        width: 16px;
        height: 16px;
        flex: 0 0 auto;
      }
      .skeleton-label {
        width: 58%;
        height: 11px;
      }
      @keyframes folderSkeletonPulse {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      @media (max-width: 980px) {
        .folder-tabs {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          align-items: stretch;
        }
        .folder-tab {
          border-radius: 10px;
          height: 38px;
        }
        .folder-tab::after {
          display: none;
        }
      }
      @media (max-width: 620px) {
        .folder-tabs {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    `}</style>
  </div>
);
