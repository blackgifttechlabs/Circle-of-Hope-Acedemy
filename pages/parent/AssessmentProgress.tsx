import React, { useEffect, useState } from 'react';
import { getStudentById, calculateDayPercentage } from '../../services/dataService';
import { Student } from '../../types';
import { Loader } from '../../components/ui/Loader';
import { Calendar, Activity, Brain, CheckCircle, ClipboardList, Clock } from 'lucide-react';

interface ParentAssessmentProgressProps {
  user: any;
}

export const ParentAssessmentProgress: React.FC<ParentAssessmentProgressProps> = ({ user }) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(1);

  useEffect(() => {
    if (user?.id) {
      const fetchStudent = async () => {
        const data = await getStudentById(user.id);
        setStudent(data);
        setLoading(false);
      };
      fetchStudent();
    }
  }, [user]);

  if (loading) return <Loader />;
  if (!student) return <div className="p-8 text-center text-gray-500">Student record not found.</div>;

  const currentDayData = student.assessment?.teacherAssessments?.[selectedDay];
  const completedDays = student.assessment?.teacherAssessments ? Object.values(student.assessment.teacherAssessments).filter((d:any) => d.completed).length : 0;
  const totalDays = 14;
  const progressPercent = Math.round((completedDays / totalDays) * 100);

  return (
    <div className="w-full pb-10">
      
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
  );
};