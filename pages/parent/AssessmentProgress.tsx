import React, { useEffect, useState } from 'react';
import { getStudentById, calculateDayPercentage, getAssessmentRecordsForStudent, getSystemSettings } from '../../services/dataService';
import { Student, TermAssessmentRecord, SystemSettings, PRE_PRIMARY_AREAS } from '../../types';
import { Loader } from '../../components/ui/Loader';
import { Calendar, Activity, Brain, CheckCircle, ClipboardList, Clock, FileText, Download } from 'lucide-react';
import { printGrade0Report } from '../../utils/printGrade0Report';
import { Grade1To7ReportCard, getGrade1To7ReportCards, printGrade1To7Report } from '../../utils/printGrade1To7Report';
import { ParentBottomNav } from '../../components/ParentBottomNav';

interface ParentAssessmentProgressProps {
  user: any;
}

export const ParentAssessmentProgress: React.FC<ParentAssessmentProgressProps> = ({ user }) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [assessmentRecords, setAssessmentRecords] = useState<TermAssessmentRecord[]>([]);
  const [gradeReports, setGradeReports] = useState<Grade1To7ReportCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(1);
  const [reportLoadingMap, setReportLoadingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user?.id) {
      const fetchStudent = async () => {
        const data = await getStudentById(user.id);
        const setts = await getSystemSettings();
        setStudent(data);
        setSettings(setts);
        
        if (data && data.division === 'Mainstream') {
            const className = data.assignedClass || data.grade || 'Grade 0';
            if (/Grade [1-7]/i.test(className)) {
                const records = await getGrade1To7ReportCards(data, setts);
                setGradeReports(records);
                setAssessmentRecords([]);
            } else {
                const records = await getAssessmentRecordsForStudent(data.grade || 'Grade 0', user.id);
                setAssessmentRecords(records);
                setGradeReports([]);
            }
        }
        
        setLoading(false);
      };
      fetchStudent();
    }
  }, [user]);

  if (loading) return <Loader />;
  if (!student) return <div className="p-8 text-center text-gray-500">Student record not found.</div>;

  const handleDownloadReport = async (record: TermAssessmentRecord | Grade1To7ReportCard) => {
    if (!record.isComplete || reportLoadingMap[record.termId]) return;
    if (!student) return;

    setReportLoadingMap(prev => ({ ...prev, [record.termId]: true }));
    try {
      const className = student.assignedClass || student.grade || 'Grade 0';
      if (/Grade [1-7]/i.test(className)) {
        await printGrade1To7Report(student, record.termId, 'Parent Portal');
      } else {
        const termName = settings?.schoolCalendars?.find(c => c.id === record.termId)?.termName || record.termId;
        const year = new Date().getFullYear().toString();
        await printGrade0Report(student, record as TermAssessmentRecord, termName, year, 'Class Teacher');
      }
    } finally {
      setReportLoadingMap(prev => ({ ...prev, [record.termId]: false }));
    }
  };

  if (student.division === 'Mainstream') {
      return (
        <div className="-m-5 min-h-screen bg-[#f7f8fa] text-slate-900">
            <div className="max-w-7xl mx-auto px-3 sm:px-5 pb-24 pt-3">
            <div className="bg-white p-6 shadow-sm border-l-8 border-coha-900 mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-coha-900">Academic Reports</h2>
                        <p className="text-gray-600">Term Assessment Records for {student.name}</p>
                    </div>
                </div>
            </div>

            <div className="p-4 sm:p-8 max-w-7xl mx-auto bg-white border border-gray-200 shadow-sm rounded-[20px]">
                {/Grade [1-7]/i.test(student.assignedClass || student.grade || '') ? (
                    gradeReports.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 font-black uppercase tracking-widest text-xs italic border-2 border-dashed border-gray-200">
                            No assessment reports found for this student.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {gradeReports.map(record => {
                                const isReportLoading = reportLoadingMap[record.termId] === true;
                                return (
                                    <div key={record.termId} className="border-2 border-gray-200 p-6 hover:border-coha-900 transition-colors flex flex-col justify-between h-full bg-gray-50">
                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <h4 className="font-black text-xl uppercase tracking-tighter">{record.termName}</h4>
                                                {record.isComplete ? (
                                                    <span className="bg-green-100 text-green-700 px-2 py-1 text-[9px] font-black uppercase tracking-widest flex items-center gap-1"><CheckCircle size={10} /> Ready</span>
                                                ) : (
                                                    <span className="bg-yellow-100 text-yellow-700 px-2 py-1 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">Pending</span>
                                                )}
                                            </div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                                                Last Updated: {record.updatedAt ? new Date(record.updatedAt).toLocaleDateString() : '-'}
                                            </p>
                                            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Subjects Recorded</p>
                                                <p className="mt-2 text-3xl font-black text-coha-900">{record.subjectCount}</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleDownloadReport(record)}
                                            disabled={!record.isComplete || isReportLoading}
                                            className={`mt-6 w-full py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border-none rounded-none
                                                ${record.isComplete
                                                    ? 'bg-coha-900 text-white hover:bg-coha-800 cursor-pointer'
                                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                }
                                                ${isReportLoading ? 'opacity-80 cursor-wait' : ''}
                                            `}
                                        >
                                            {isReportLoading ? (
                                                <>
                                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                                    </svg>
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <Download size={14} /> Download Report
                                                </>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )
                ) : assessmentRecords.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 font-black uppercase tracking-widest text-xs italic border-2 border-dashed border-gray-200">
                        No assessment records found for this student.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {assessmentRecords.map(record => {
                            const isReportLoading = reportLoadingMap[record.termId] === true;
                            return (
                                <div key={record.termId} className="border-2 border-gray-200 p-6 hover:border-coha-900 transition-colors flex flex-col justify-between h-full bg-gray-50">
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <h4 className="font-black text-xl uppercase tracking-tighter">{record.termId}</h4>
                                            {record.isComplete ? (
                                                <span className="bg-green-100 text-green-700 px-2 py-1 text-[9px] font-black uppercase tracking-widest flex items-center gap-1"><CheckCircle size={10} /> Complete</span>
                                            ) : (
                                                <span className="bg-yellow-100 text-yellow-700 px-2 py-1 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">In Progress</span>
                                            )}
                                        </div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">
                                            Last Updated: {new Date(record.updatedAt).toLocaleDateString()}
                                        </p>
                                        
                                        <div className="space-y-3 mb-6">
                                            {PRE_PRIMARY_AREAS.map(area => {
                                                const areaRatings = area.components.map(c => record.ratings[c.id]).filter(Boolean);
                                                const rated = areaRatings.length;
                                                let currentScore = 0;
                                                areaRatings.forEach(rating => {
                                                    if (rating === 'FM') currentScore += 2;
                                                    else if (rating === 'AM') currentScore += 1;
                                                });
                                                const maxScore = rated * 2;
                                                const progress = maxScore === 0 ? 0 : Math.round((currentScore / maxScore) * 100);
                                                return (
                                                    <div key={area.id}>
                                                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-1">
                                                            <span className="text-gray-600 truncate mr-2">{area.name}</span>
                                                            <span className="text-coha-900 shrink-0">{progress}%</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 h-1.5 overflow-hidden">
                                                            <div className={`h-full ${progress >= 80 ? 'bg-green-500' : progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${progress}%` }}></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    
                                    <button
                                        onClick={() => handleDownloadReport(record)}
                                        disabled={!record.isComplete || isReportLoading}
                                        className={`w-full py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border-none rounded-none
                                            ${record.isComplete
                                                ? 'bg-coha-900 text-white hover:bg-coha-800 cursor-pointer'
                                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            }
                                            ${isReportLoading ? 'opacity-80 cursor-wait' : ''}
                                        `}
                                    >
                                        {isReportLoading ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                                </svg>
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Download size={14} /> Download Report
                                            </>
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            </div>
            <ParentBottomNav userId={user?.id} />
        </div>
      );
  }

  const currentDayData = student.assessment?.teacherAssessments?.[selectedDay];
  const completedDays = student.assessment?.teacherAssessments ? Object.values(student.assessment.teacherAssessments).filter((d:any) => d.completed).length : 0;
  const totalDays = 14;
  const progressPercent = Math.round((completedDays / totalDays) * 100);

  return (
    <div className="-m-5 min-h-screen bg-[#f7f8fa] text-slate-900">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 pb-24 pt-3">
      
      {/* Header Summary */}
      <div className="bg-white p-6 shadow-sm border-l-8 border-coha-900 mb-8">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div>
                 <h2 className="text-2xl font-bold text-coha-900">Observation Progress</h2>
                 <p className="text-gray-600">14-Day Assessment for {student.name}</p>
             </div>
             <div className="text-right">
                 <p className="text-sm font-bold text-gray-500 uppercase">Status</p>
                 {student.assessment?.isComplete ? (
                     <span className="text-green-600 font-bold text-lg flex items-center gap-2 justify-end">
                         <CheckCircle size={20}/> Completed
                     </span>
                 ) : (
                     <div className="flex items-center gap-2">
                        <span className="text-3xl font-bold text-coha-500">{progressPercent}%</span>
                        <div className="text-left leading-tight">
                            <span className="block text-xs font-bold text-gray-400">COMPLETE</span>
                            <span className="block text-xs text-gray-500">{completedDays} / {totalDays} Days</span>
                        </div>
                     </div>
                 )}
             </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Day Selector Sidebar */}
          <div className="lg:col-span-1">
              <div className="bg-white p-4 shadow-sm border border-gray-200">
                  <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Calendar size={18}/> Select Day</h3>
                  <div className="grid grid-cols-4 gap-2">
                      {Array.from({ length: 14 }, (_, i) => i + 1).map((day) => {
                          const dayData = student.assessment?.teacherAssessments?.[day];
                          const isCompleted = dayData?.completed;
                          const isSelected = day === selectedDay;
                          const percentage = calculateDayPercentage(dayData);
                          
                          return (
                              <button
                                  key={day}
                                  onClick={() => setSelectedDay(day)}
                                  className={`aspect-square flex flex-col items-center justify-center border-2 transition-all rounded-lg
                                      ${isSelected ? 'border-coha-900 bg-coha-900 text-white scale-105 shadow-md' : 
                                        isCompleted ? 'border-green-500 bg-green-50 text-green-700' : 
                                        'border-gray-200 bg-gray-50 text-gray-300'}
                                  `}
                              >
                                  <span className="font-bold text-sm">{day}</span>
                                  {isCompleted && (
                                      <span className="text-[10px] font-bold">{percentage}%</span>
                                  )}
                              </button>
                          );
                      })}
                  </div>
              </div>
          </div>

          {/* Details Content */}
          <div className="lg:col-span-3">
              {!currentDayData ? (
                  <div className="bg-white p-12 text-center border border-dashed border-gray-300 rounded-lg">
                      <Clock size={48} className="mx-auto text-gray-300 mb-4" />
                      <h3 className="text-xl font-bold text-gray-500 mb-2">Assessment Pending</h3>
                      <p className="text-gray-400">The teacher has not yet completed the assessment for Day {selectedDay}.</p>
                  </div>
              ) : (
                  <div className="space-y-6 animate-fade-in">
                      
                      {/* Section 1: Scores */}
                      <div className="bg-white p-6 shadow-sm border border-gray-200">
                          <h3 className="font-bold text-coha-900 border-b pb-2 mb-4 flex items-center gap-2">
                              <Activity size={20} className="text-coha-500"/> Daily Performance (Scores /5)
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                              {Object.entries(currentDayData.scores).map(([key, score]) => (
                                  <div key={key} className="bg-gray-50 p-3 text-center rounded border border-gray-100">
                                      <p className="text-xs font-bold text-gray-500 uppercase mb-1">{key}</p>
                                      <div className="flex items-center justify-center">
                                          <span className="text-2xl font-bold text-coha-900">{score}</span>
                                          <span className="text-gray-400 text-sm">/5</span>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>

                      {/* Section 2: Thinking Task */}
                      <div className="bg-white p-6 shadow-sm border border-gray-200">
                          <h3 className="font-bold text-coha-900 border-b pb-2 mb-4 flex items-center gap-2">
                              <Brain size={20} className="text-purple-500"/> Cognitive Task
                          </h3>
                          <div className="bg-purple-50 p-4 border-l-4 border-purple-400">
                              <p className="text-sm font-bold text-purple-900 uppercase mb-1">Task: {currentDayData.thinkingTask?.taskId}</p>
                              <p className="text-gray-800 mb-3">{currentDayData.thinkingTask?.description}</p>
                              <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-gray-500">Result:</span>
                                  <span className={`px-2 py-1 text-xs font-bold rounded uppercase 
                                      ${currentDayData.thinkingTask?.response === 'Yes' ? 'bg-green-100 text-green-700' : 
                                        currentDayData.thinkingTask?.response === 'No' ? 'bg-red-100 text-red-700' : 
                                        'bg-yellow-100 text-yellow-800'}`}>
                                      {currentDayData.thinkingTask?.response}
                                  </span>
                              </div>
                          </div>
                      </div>

                      {/* Section 3: Behaviour Logs */}
                      <div className="bg-white p-6 shadow-sm border border-gray-200">
                          <h3 className="font-bold text-coha-900 border-b pb-2 mb-4 flex items-center gap-2">
                              <ClipboardList size={20} className="text-orange-500"/> Behaviour Logs (ABC)
                          </h3>
                          {(!currentDayData.abcLogs || currentDayData.abcLogs.length === 0) ? (
                              <p className="text-gray-500 italic text-sm">No specific behaviour incidents recorded for this day.</p>
                          ) : (
                              <div className="space-y-4">
                                  {currentDayData.abcLogs.map((log: any) => (
                                      <div key={log.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                          <div className={`p-2 flex justify-between items-center ${log.isPositive ? 'bg-green-50 border-b border-green-100' : 'bg-red-50 border-b border-red-100'}`}>
                                              <div className="flex items-center gap-2">
                                                  <span className="text-xs font-bold text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded">{log.time}</span>
                                                  <span className={`text-xs font-bold uppercase ${log.isPositive ? 'text-green-700' : 'text-red-700'}`}>
                                                      {log.isPositive ? 'Positive' : 'Negative'}
                                                  </span>
                                              </div>
                                          </div>
                                          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100 text-sm">
                                              <div className="p-3">
                                                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Antecedent</span>
                                                  <p className="text-gray-800">{log.antecedent}</p>
                                              </div>
                                              <div className="p-3 bg-gray-50">
                                                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Behaviour</span>
                                                  <p className="font-medium text-gray-900">{log.behaviour}</p>
                                              </div>
                                              <div className="p-3">
                                                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Consequence</span>
                                                  <p className="text-gray-800">{log.consequence}</p>
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>

                  </div>
              )}
          </div>
      </div>
      </div>
      <ParentBottomNav userId={user?.id} />
    </div>
  );
};
