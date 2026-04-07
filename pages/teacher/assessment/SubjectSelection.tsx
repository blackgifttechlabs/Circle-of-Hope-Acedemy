import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  BookA,
  BookOpen,
  Calculator,
  Globe,
  Heart,
  Palette,
  PenTool,
  Trees,
  Users,
} from 'lucide-react';
import { getAssessmentSubjects, getSubjectLabel, isGrade1To7Class } from '../../../utils/assessmentWorkflow';
import { navigateBackOr } from '../../../utils/navigation';

const SUBJECT_CONFIG: Record<string, { icon: React.ElementType; color: string; iconColor: string; hoverBg: string }> = {
  Mathematics: { icon: Calculator, color: 'border-blue-200 hover:border-blue-500', iconColor: 'bg-blue-50 text-blue-600', hoverBg: 'group-hover:bg-blue-500 group-hover:text-white' },
  English: { icon: BookA, color: 'border-indigo-200 hover:border-indigo-500', iconColor: 'bg-indigo-50 text-indigo-600', hoverBg: 'group-hover:bg-indigo-500 group-hover:text-white' },
  'Environmental Studies': { icon: Globe, color: 'border-emerald-200 hover:border-emerald-500', iconColor: 'bg-emerald-50 text-emerald-600', hoverBg: 'group-hover:bg-emerald-500 group-hover:text-white' },
  Handwriting: { icon: PenTool, color: 'border-amber-200 hover:border-amber-500', iconColor: 'bg-amber-50 text-amber-600', hoverBg: 'group-hover:bg-amber-500 group-hover:text-white' },
  'Religious Education': { icon: Heart, color: 'border-rose-200 hover:border-rose-500', iconColor: 'bg-rose-50 text-rose-600', hoverBg: 'group-hover:bg-rose-500 group-hover:text-white' },
  'Religious and Moral Education': { icon: Heart, color: 'border-rose-200 hover:border-rose-500', iconColor: 'bg-rose-50 text-rose-600', hoverBg: 'group-hover:bg-rose-500 group-hover:text-white' },
  'Physical Education': { icon: Activity, color: 'border-orange-200 hover:border-orange-500', iconColor: 'bg-orange-50 text-orange-600', hoverBg: 'group-hover:bg-orange-500 group-hover:text-white' },
  Arts: { icon: Palette, color: 'border-fuchsia-200 hover:border-fuchsia-500', iconColor: 'bg-fuchsia-50 text-fuchsia-600', hoverBg: 'group-hover:bg-fuchsia-500 group-hover:text-white' },
  'Life Skills': { icon: Users, color: 'border-teal-200 hover:border-teal-500', iconColor: 'bg-teal-50 text-teal-600', hoverBg: 'group-hover:bg-teal-500 group-hover:text-white' },
  language: { icon: BookOpen, color: 'border-indigo-200 hover:border-indigo-500', iconColor: 'bg-indigo-50 text-indigo-600', hoverBg: 'group-hover:bg-indigo-500 group-hover:text-white' },
  physical: { icon: Activity, color: 'border-orange-200 hover:border-orange-500', iconColor: 'bg-orange-50 text-orange-600', hoverBg: 'group-hover:bg-orange-500 group-hover:text-white' },
  math: { icon: Calculator, color: 'border-blue-200 hover:border-blue-500', iconColor: 'bg-blue-50 text-blue-600', hoverBg: 'group-hover:bg-blue-500 group-hover:text-white' },
  arts: { icon: Palette, color: 'border-fuchsia-200 hover:border-fuchsia-500', iconColor: 'bg-fuchsia-50 text-fuchsia-600', hoverBg: 'group-hover:bg-fuchsia-500 group-hover:text-white' },
  environmental: { icon: Trees, color: 'border-emerald-200 hover:border-emerald-500', iconColor: 'bg-emerald-50 text-emerald-600', hoverBg: 'group-hover:bg-emerald-500 group-hover:text-white' },
  religious: { icon: Heart, color: 'border-rose-200 hover:border-rose-500', iconColor: 'bg-rose-50 text-rose-600', hoverBg: 'group-hover:bg-rose-500 group-hover:text-white' },
};

const SubjectCard = ({
  subjectId,
  label,
  navigate,
}: {
  subjectId: string;
  label: string;
  navigate: ReturnType<typeof useNavigate>;
}) => {
  const config = SUBJECT_CONFIG[subjectId] || SUBJECT_CONFIG[label] || SUBJECT_CONFIG.English;
  const Icon = config.icon;

  return (
    <div className={`flex flex-col p-4 bg-white border rounded-xl transition-all text-left group ${config.color}`}>
      <button
        onClick={() => navigate(`/teacher/assess/${encodeURIComponent(subjectId)}`)}
        className="flex items-center gap-4 w-full text-left"
      >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${config.iconColor} ${config.hoverBg}`}>
          <Icon size={20} />
        </div>
        <span className="font-bold text-slate-700 group-hover:text-slate-900 flex-1">{label}</span>
      </button>
      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/teacher/assessment-sheet/${encodeURIComponent(subjectId)}`);
          }}
          className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          View Sheet
        </button>
      </div>
    </div>
  );
};

export default function SubjectSelection({ user }: { user?: any }) {
  const navigate = useNavigate();
  const className = user?.assignedClass || '';
  const subjects = getAssessmentSubjects(className);
  const standardWorkflow = isGrade1To7Class(className);
  const promotionalSubjects = subjects.filter((subject) => subject.category === 'promotional');
  const nonPromotionalSubjects = subjects.filter((subject) => subject.category === 'non-promotional');

  return (
    <div className="w-full px-5 py-6">
      <div className="mb-6">
        <button
          onClick={() => navigateBackOr(navigate as any, '/teacher/classes')}
          className="mb-4 p-2 hover:bg-slate-100 rounded-full transition-colors inline-flex"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Assess Students</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          {standardWorkflow
            ? 'Select a subject to record marks'
            : 'Select a subject area, then switch between themes and topics at the top.'}
        </p>
      </div>

      <hr className="border-slate-200 mb-8" />

      <div className="space-y-8">
        {standardWorkflow ? (
          <>
            <div>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Promotional Subjects</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {promotionalSubjects.map((subject) => (
                  <SubjectCard
                    key={subject.id}
                    subjectId={subject.id}
                    label={subject.label}
                    navigate={navigate}
                  />
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Non-Promotional Subjects</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nonPromotionalSubjects.map((subject) => (
                  <SubjectCard
                    key={subject.id}
                    subjectId={subject.id}
                    label={subject.label}
                    navigate={navigate}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <div>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Subjects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map((subject) => (
                <SubjectCard
                  key={subject.id}
                  subjectId={subject.id}
                  label={getSubjectLabel(subject.id, className)}
                  navigate={navigate}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
