import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calculator, BookA, Globe, PenTool, Heart, Activity, Palette, Users } from 'lucide-react';

const PROMOTIONAL_SUBJECTS = ['Mathematics', 'English', 'Environmental Studies', 'Handwriting', 'Religious Education'];
const NON_PROMOTIONAL_SUBJECTS = ['Physical Education', 'Arts', 'Life Skills'];

const SUBJECT_CONFIG: Record<string, { icon: React.ElementType, color: string, iconColor: string, hoverBg: string }> = {
  'Mathematics': { icon: Calculator, color: 'border-blue-200 hover:border-blue-500', iconColor: 'bg-blue-50 text-blue-600', hoverBg: 'group-hover:bg-blue-500 group-hover:text-white' },
  'English': { icon: BookA, color: 'border-indigo-200 hover:border-indigo-500', iconColor: 'bg-indigo-50 text-indigo-600', hoverBg: 'group-hover:bg-indigo-500 group-hover:text-white' },
  'Environmental Studies': { icon: Globe, color: 'border-emerald-200 hover:border-emerald-500', iconColor: 'bg-emerald-50 text-emerald-600', hoverBg: 'group-hover:bg-emerald-500 group-hover:text-white' },
  'Handwriting': { icon: PenTool, color: 'border-amber-200 hover:border-amber-500', iconColor: 'bg-amber-50 text-amber-600', hoverBg: 'group-hover:bg-amber-500 group-hover:text-white' },
  'Religious Education': { icon: Heart, color: 'border-rose-200 hover:border-rose-500', iconColor: 'bg-rose-50 text-rose-600', hoverBg: 'group-hover:bg-rose-500 group-hover:text-white' },
  'Physical Education': { icon: Activity, color: 'border-orange-200 hover:border-orange-500', iconColor: 'bg-orange-50 text-orange-600', hoverBg: 'group-hover:bg-orange-500 group-hover:text-white' },
  'Arts': { icon: Palette, color: 'border-fuchsia-200 hover:border-fuchsia-500', iconColor: 'bg-fuchsia-50 text-fuchsia-600', hoverBg: 'group-hover:bg-fuchsia-500 group-hover:text-white' },
  'Life Skills': { icon: Users, color: 'border-teal-200 hover:border-teal-500', iconColor: 'bg-teal-50 text-teal-600', hoverBg: 'group-hover:bg-teal-500 group-hover:text-white' },
};

export default function SubjectSelection({ user }: { user?: any }) {
  const navigate = useNavigate();

  return (
    <div className="w-full px-5 py-6">
      <div className="mb-6">
        <button 
          onClick={() => navigate('/teacher/classes')}
          className="mb-4 p-2 hover:bg-slate-100 rounded-full transition-colors inline-flex"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Assess Students</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">Select a subject to record marks</p>
      </div>
      
      <hr className="border-slate-200 mb-8" />

      <div className="space-y-8">
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Promotional Subjects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PROMOTIONAL_SUBJECTS.map(subject => {
              const config = SUBJECT_CONFIG[subject];
              const Icon = config.icon;
              return (
                <button
                  key={subject}
                  onClick={() => navigate(`/teacher/assess/${encodeURIComponent(subject)}`)}
                  className={`flex items-center gap-4 p-4 bg-white border rounded-xl transition-all text-left group ${config.color}`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${config.iconColor} ${config.hoverBg}`}>
                    <Icon size={20} />
                  </div>
                  <span className="font-bold text-slate-700 group-hover:text-slate-900">{subject}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Non-Promotional Subjects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {NON_PROMOTIONAL_SUBJECTS.map(subject => {
              const config = SUBJECT_CONFIG[subject];
              const Icon = config.icon;
              return (
                <button
                  key={subject}
                  onClick={() => navigate(`/teacher/assess/${encodeURIComponent(subject)}`)}
                  className={`flex items-center gap-4 p-4 bg-white border rounded-xl transition-all text-left group ${config.color}`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${config.iconColor} ${config.hoverBg}`}>
                    <Icon size={20} />
                  </div>
                  <span className="font-bold text-slate-700 group-hover:text-slate-900">{subject}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
