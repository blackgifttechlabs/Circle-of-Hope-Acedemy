import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Eye, FileText, Layers3 } from 'lucide-react';
import { ActionMenu } from '../../components/ui/ActionMenu';
import { Loader } from '../../components/ui/Loader';
import { getSystemSettings, getTeachers } from '../../services/dataService';
import { SystemSettings, Teacher } from '../../types';
import {
  generateAllSubjectsAssessmentPdf,
  generateAssessmentSheetPdf,
  generateSummarySheetPdf,
  REPORT_TERMS,
} from '../../utils/assessmentReports';
import { getAssessmentSubjects, getGradeDisplayValue } from '../../utils/assessmentWorkflow';

export const ViewAssessmentProgress: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [activeClass, setActiveClass] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [settingsData, teachersData] = await Promise.all([
          getSystemSettings(),
          getTeachers(),
        ]);
        setSettings(settingsData);
        setTeachers(teachersData);

        const classes = settingsData
          ? [...settingsData.grades, ...settingsData.specialNeedsLevels]
          : [];
        if (classes.length > 0) {
          setActiveClass(classes[0]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <Loader />;

  const allClasses = settings ? [...settings.grades, ...settings.specialNeedsLevels] : [];
  const subjects = activeClass ? getAssessmentSubjects(activeClass) : [];
  const teachersForClass = teachers.filter((teacher) => teacher.assignedClass === activeClass);
  const teacherNames = teachersForClass.length > 0
    ? teachersForClass.map((teacher) => teacher.name).join(', ')
    : 'No teacher assigned';

  const getTermLabel = (termId: string) =>
    settings?.schoolCalendars?.find((term) => term.id === termId)?.termName ||
    REPORT_TERMS.find((term) => term.id === termId)?.fallbackName ||
    termId;

  const buildDownloadItems = (subjectId: string, primaryTermId: string) => {
    const orderedTerms = [
      primaryTermId,
      ...REPORT_TERMS.map((term) => term.id).filter((termId) => termId !== primaryTermId),
    ];

    return [
      ...orderedTerms.map((termId) => ({
        id: `${subjectId}-${termId}`,
        label: getTermLabel(termId),
        icon: Download,
        onClick: () => generateAssessmentSheetPdf({ className: activeClass, subject: subjectId, termIds: [termId] }),
      })),
      {
        id: `${subjectId}-all`,
        label: 'All Terms in One File',
        icon: FileText,
        onClick: () => generateAssessmentSheetPdf({
          className: activeClass,
          subject: subjectId,
          termIds: REPORT_TERMS.map((term) => term.id),
        }),
      },
    ];
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/teachers')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">View Assessment Progress</h1>
            <p className="text-sm text-gray-500">Review assessment sheets and summary reports by class.</p>
          </div>
        </div>
      </div>

      <div className="px-6 pt-4 bg-white border-b border-gray-200 overflow-x-auto">
        <div className="flex gap-6 min-w-max">
          {allClasses.map((className) => (
            <button
              key={className}
              onClick={() => setActiveClass(className)}
              className={`pb-3 text-sm font-bold transition-colors relative ${activeClass === className ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
            >
              {className}
              {activeClass === className && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="text-xs font-black text-orange-600 uppercase tracking-[0.2em] mb-2">Class Overview</div>
                  <h2 className="text-2xl font-black text-gray-900">{getGradeDisplayValue(activeClass)}</h2>
                  <p className="text-sm text-gray-500 mt-2">Subjects: {subjects.length} • Teacher: {teacherNames}</p>
                </div>
                <button
                  type="button"
                  onClick={() => generateAllSubjectsAssessmentPdf({
                    className: activeClass,
                    subjectIds: subjects.map((subject) => subject.id),
                  })}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-orange-600"
                >
                  <Layers3 size={16} />
                  Download All Subjects In 1 File
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
              <div className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-2">Summary Sheet</div>
              <h2 className="text-lg font-black text-gray-900">Download Summary Reports</h2>
              <p className="text-sm text-gray-500 mt-2 mb-4">Export the class summary sheet by term.</p>
              <ActionMenu
                label="Download Summary Sheet"
                icon={Download}
                className="bg-blue-600 text-white hover:bg-blue-700"
                items={[
                  ...REPORT_TERMS.map((term) => ({
                    id: `summary-${term.id}`,
                    label: getTermLabel(term.id),
                    icon: Download,
                    onClick: () => generateSummarySheetPdf({ className: activeClass, termIds: [term.id] }),
                  })),
                  {
                    id: 'summary-all',
                    label: 'All Terms in One File',
                    icon: FileText,
                    onClick: () => generateSummarySheetPdf({
                      className: activeClass,
                      termIds: REPORT_TERMS.map((term) => term.id),
                    }),
                  },
                ]}
              />
            </div>
          </div>

          {REPORT_TERMS.map((term) => (
            <section key={term.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/70 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Assessment Term</div>
                  <h3 className="text-lg font-black text-gray-900">{getTermLabel(term.id)}</h3>
                </div>
                <p className="text-sm text-gray-500">Open the full-page preview or download the report for any subject.</p>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {subjects.map((subject) => (
                  <div key={`${term.id}-${subject.id}`} className="border border-gray-200 rounded-2xl p-5 bg-white shadow-sm">
                    <div className="flex items-start justify-between gap-3 mb-5">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-orange-500 mb-2">{getTermLabel(term.id)}</div>
                        <h4 className="text-lg font-black text-gray-900">{subject.label}</h4>
                        <p className="text-sm text-gray-500 mt-1">{getGradeDisplayValue(activeClass)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/assessment-progress/view/${encodeURIComponent(activeClass)}/${encodeURIComponent(subject.id)}?term=${term.id}`)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        <Eye size={16} />
                        View
                      </button>
                      <ActionMenu
                        label="Download"
                        icon={Download}
                        className="bg-slate-900 text-white hover:bg-slate-800"
                        items={buildDownloadItems(subject.id, term.id)}
                      />
                    </div>
                  </div>
                ))}

                {subjects.length === 0 && (
                  <div className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
                    No assessment subjects were found for this class.
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};
