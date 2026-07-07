import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Download, Eye, FileText, GraduationCap, MousePointerClick, UserCheck } from 'lucide-react';
import { ActionMenu } from '../../components/ui/ActionMenu';
import { getSystemSettings, getTeachers } from '../../services/dataService';
import { SystemSettings, Teacher } from '../../types';
import { TableHeaderCell, TableSkeletonRows } from '../../components/ui/TablePrimitives';
import { FolderTabs } from '../../components/admin/FolderTabs';
import {
  ADMIN_ASSESSMENT_TERM_EVENT,
  getStoredAdminAssessmentTerm,
} from '../../utils/adminAssessmentTerm';
import {
  generateAllSubjectsAssessmentPdf,
  generateAssessmentSheetPdf,
  generateSummarySheetPdf,
  REPORT_TERMS,
} from '../../utils/assessmentReports';
import { getAssessmentSubjects, getGradeDisplayValue } from '../../utils/assessmentWorkflow';

export const ADMIN_ASSESSMENT_PROGRESS_HEADER_EVENT = 'admin-assessment-progress-header';

const getClassNumber = (className: string) => {
  const match = className.match(/\d+/);
  return match ? Number(match[0]) : 999;
};

const orderedClassesFromSettings = (settings: SystemSettings | null) => {
  if (!settings) return [];
  const levels = [...(settings.specialNeedsLevels || [])].sort((a, b) => getClassNumber(a) - getClassNumber(b));
  const grades = [...(settings.grades || [])].sort((a, b) => getClassNumber(a) - getClassNumber(b));
  return [...levels, ...grades];
};

export const ViewAssessmentProgress: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [activeClass, setActiveClass] = useState('');
  const [selectedTermId, setSelectedTermId] = useState<string>(REPORT_TERMS[0].id);
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
        setSelectedTermId(getStoredAdminAssessmentTerm(settingsData));

        const classes = orderedClassesFromSettings(settingsData);
        if (classes.length > 0) {
          setActiveClass(classes[0]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const handleTermChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ termId?: string }>;
      if (customEvent.detail?.termId) setSelectedTermId(customEvent.detail.termId);
    };
    window.addEventListener(ADMIN_ASSESSMENT_TERM_EVENT, handleTermChange as EventListener);
    return () => window.removeEventListener(ADMIN_ASSESSMENT_TERM_EVENT, handleTermChange as EventListener);
  }, []);

  const allClasses = orderedClassesFromSettings(settings);
  const subjects = activeClass ? getAssessmentSubjects(activeClass) : [];
  const teachersForClass = teachers.filter((teacher) => (teacher.assignedClasses || [teacher.assignedClass || '']).includes(activeClass));
  const teacherNames = teachersForClass.length > 0
    ? teachersForClass.map((teacher) => teacher.name).join(', ')
    : 'No teacher assigned';

  useEffect(() => {
    if (loading) return;
    window.dispatchEvent(new CustomEvent(ADMIN_ASSESSMENT_PROGRESS_HEADER_EVENT, {
      detail: {
        levelLabel: activeClass ? getGradeDisplayValue(activeClass) : '',
        subjectsCount: subjects.length,
        teacherNames,
        onDownloadAllSubjects: () => generateAllSubjectsAssessmentPdf({
          className: activeClass,
          subjectIds: subjects.map((subject) => subject.id),
          termIds: [selectedTermId],
        }),
        onDownloadSummary: () => generateSummarySheetPdf({ className: activeClass, termIds: [selectedTermId] }),
      },
    }));

    return () => {
      window.dispatchEvent(new CustomEvent(ADMIN_ASSESSMENT_PROGRESS_HEADER_EVENT, { detail: null }));
    };
  }, [activeClass, subjects, teacherNames, selectedTermId, loading]);

  const getTermLabel = (termId: string) =>
    settings?.schoolCalendars?.find((term) => term.id === termId)?.termName ||
    REPORT_TERMS.find((term) => term.id === termId)?.fallbackName ||
    termId;
  const selectedTermLabel = getTermLabel(selectedTermId);

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
      <div className="bg-white px-6 pt-4">
        <FolderTabs
          tabs={allClasses.map((className) => ({
            id: className,
            label: className,
            icon: className.toLowerCase().includes('level') ? GraduationCap : BookOpen,
          }))}
          activeId={activeClass}
          onChange={setActiveClass}
          loading={loading}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 pt-0">
        <div className="w-full space-y-5">
          <section className="overflow-visible border-x border-b border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left [&_td]:border-r [&_td]:border-slate-100 [&_td:last-child]:border-r-0 [&_th]:border-r [&_th]:border-purple-900/30 [&_th:last-child]:border-r-0">
                  <thead>
                    <tr>
                      <TableHeaderCell icon={BookOpen}>Subject</TableHeaderCell>
                      <TableHeaderCell icon={GraduationCap}>Class</TableHeaderCell>
                      <TableHeaderCell icon={UserCheck}>Teacher</TableHeaderCell>
                      <TableHeaderCell icon={FileText}>Term</TableHeaderCell>
                      <TableHeaderCell icon={MousePointerClick}>Actions</TableHeaderCell>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <TableSkeletonRows rows={6} columns={5} />
                    ) : subjects.map((subject) => (
                      <tr key={`${selectedTermId}-${subject.id}`} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-6 py-3 font-black text-slate-900">{subject.label}</td>
                        <td className="px-6 py-3 text-sm font-semibold text-slate-600">{getGradeDisplayValue(activeClass)}</td>
                        <td className="px-6 py-3 text-sm font-semibold text-slate-600">{teacherNames}</td>
                        <td className="px-6 py-3 text-sm font-semibold text-slate-600">{selectedTermLabel}</td>
                        <td className="px-6 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/assessment-progress/view/${encodeURIComponent(activeClass)}/${encodeURIComponent(subject.id)}?term=${selectedTermId}`)}
                              className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-purple-700 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-sm transition hover:bg-purple-800"
                            >
                              <Eye size={14} />
                              View
                            </button>
                            <ActionMenu
                              label="Download"
                              icon={Download}
                              className="bg-slate-900 text-white hover:bg-slate-800 rounded-[8px]"
                              menuPosition="top"
                              items={buildDownloadItems(subject.id, selectedTermId)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}

                    {!loading && subjects.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-sm font-semibold text-slate-500">
                          No assessment subjects were found for this class.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
          </section>
        </div>
      </div>
    </div>
  );
};
