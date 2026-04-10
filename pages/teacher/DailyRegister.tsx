import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getStudentsByAssignedClass, getDailyRegister, markDailyRegister } from '../../services/dataService';
import { Student, StudentDailyRegister } from '../../types';
import { Loader } from '../../components/ui/Loader';
import { CheckCircle, XCircle, Search, Calendar as CalendarIcon, Users, ChevronRight, RotateCcw, TableIcon, ClipboardCheck } from 'lucide-react';
import { getSelectedTeachingClass } from '../../utils/teacherClassSelection';

export const DailyRegister: React.FC<{ user: any }> = ({ user }) => {
  const location = useLocation();
  const className = getSelectedTeachingClass(user, location.search);
  const [students, setStudents] = useState<Student[]>([]);
  const [registerData, setRegisterData] = useState<StudentDailyRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'mark' | 'table'>('mark');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (className) fetchData();
  }, [className]);

  const fetchData = async () => {
    setLoading(true);
    const classStudents = await getStudentsByAssignedClass(className);
    setStudents(classStudents);
    const data = await getDailyRegister(className);
    setRegisterData(data);
    setLoading(false);
  };

  const handleMarkAttendance = async (studentId: string, studentName: string, status: 'present' | 'absent') => {
    try {
      await markDailyRegister(className, studentId, studentName, selectedDate, status);
      setRegisterData(prev => {
        const existing = prev.find(r => r.id === studentId);
        const timestamp = new Date().toISOString();
        if (existing) {
          return prev.map(r => r.id === studentId
            ? { ...r, attendance: { ...r.attendance, [selectedDate]: { status, timestamp } } }
            : r);
        }
        return [...prev, { id: studentId, studentName, attendance: { [selectedDate]: { status, timestamp } } }];
      });
      setAnimating(true);
      setTimeout(() => {
        setAnimating(false);
        if (currentIndex < filteredStudents.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          setCurrentIndex(filteredStudents.length);
        }
      }, 260);
    } catch (error) {
      console.error('Failed to mark attendance', error);
    }
  };

  if (loading) return <Loader />;

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const allDates = Array.from(
    new Set(registerData.flatMap(r => Object.keys(r.attendance)))
  ).sort().reverse();

  const currentStudent = filteredStudents[currentIndex];
  const isFinished = currentIndex >= filteredStudents.length && filteredStudents.length > 0;
  const progress = filteredStudents.length > 0 ? (currentIndex / filteredStudents.length) * 100 : 0;

  // Count today's marked attendance
  const todayPresent = registerData.filter(r => r.attendance[selectedDate]?.status === 'present').length;
  const todayAbsent = registerData.filter(r => r.attendance[selectedDate]?.status === 'absent').length;
  const todayMarked = todayPresent + todayAbsent;

  return (
    <div
      className="w-full pb-16 min-h-screen"
      style={{ fontFamily: "'DM Sans', 'Outfit', system-ui, sans-serif", background: 'linear-gradient(135deg, #f0f0fa 0%, #e8e8f5 50%, #f5f0ff 100%)' }}
    >
      {/* ── Page Header ── */}
      <div
        className="relative overflow-hidden mb-8"
        style={{ background: 'linear-gradient(135deg, #2b2b5e 0%, #1e1e4a 60%, #3a2a6e 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-[0.06]" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
        <div className="absolute top-4 right-1/3 w-2 h-2 rounded-full bg-white opacity-20" />
        <div className="absolute bottom-6 right-1/4 w-1.5 h-1.5 rounded-full bg-blue-300 opacity-30" />

        <div className="relative z-10 px-6 sm:px-10 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold tracking-[2px] text-blue-300 uppercase">Daily Register</span>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight leading-none">
                {className}
              </h1>
              <p className="text-white/50 text-sm mt-1.5 font-medium">
                {new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {/* Stats pills */}
            <div className="flex gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl px-4 py-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                  <Users size={15} className="text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="text-[10px] text-white/50 font-semibold tracking-wider uppercase">Total</div>
                  <div className="text-lg font-black text-white leading-none">{students.length}</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 bg-emerald-500/20 backdrop-blur-sm border border-emerald-400/25 rounded-2xl px-4 py-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle size={15} className="text-emerald-300" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="text-[10px] text-emerald-300/70 font-semibold tracking-wider uppercase">Present</div>
                  <div className="text-lg font-black text-emerald-300 leading-none">{todayPresent}</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 bg-red-500/20 backdrop-blur-sm border border-red-400/25 rounded-2xl px-4 py-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <XCircle size={15} className="text-red-300" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="text-[10px] text-red-300/70 font-semibold tracking-wider uppercase">Absent</div>
                  <div className="text-lg font-black text-red-300 leading-none">{todayAbsent}</div>
                </div>
              </div>
            </div>
          </div>

          {/* View toggle */}
          <div className="mt-6 flex gap-2">
            {[
              { mode: 'mark' as const, icon: <ClipboardCheck size={14} strokeWidth={2.5} />, label: 'Mark Register' },
              { mode: 'table' as const, icon: <TableIcon size={14} strokeWidth={2.5} />, label: 'Full Table' },
            ].map(({ mode, icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold tracking-wide transition-all duration-200"
                style={viewMode === mode
                  ? { background: 'white', color: '#2b2b5e' }
                  : { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.12)' }
                }
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="px-1.5 sm:px-8 max-w-5xl mx-auto">
        {viewMode === 'mark' ? (
          <>
            {/* Controls row */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm flex-1">
                <CalendarIcon size={14} className="text-gray-400" strokeWidth={2.5} />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => { setSelectedDate(e.target.value); setCurrentIndex(0); }}
                  className="text-[12px] font-bold text-gray-700 bg-transparent outline-none flex-1"
                />
              </div>
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm flex-1">
                <Search size={14} className="text-gray-400" strokeWidth={2.5} />
                <input
                  type="text"
                  placeholder="Search student..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentIndex(0); }}
                  className="text-[12px] font-bold text-gray-700 bg-transparent outline-none flex-1 placeholder:text-gray-400 placeholder:font-normal"
                />
              </div>
            </div>

            {isFinished ? (
              /* ── All Done State ── */
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-12 text-center">
                <div
                  className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}
                >
                  <CheckCircle size={44} className="text-emerald-500" strokeWidth={2} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">All Done!</h3>
                <p className="text-gray-400 font-medium mb-2">Register marked for all {filteredStudents.length} students.</p>
                <div className="flex justify-center gap-6 my-6 py-5 border-y border-gray-100">
                  <div className="text-center">
                    <div className="text-2xl font-black text-emerald-600">{todayPresent}</div>
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Present</div>
                  </div>
                  <div className="w-px bg-gray-100" />
                  <div className="text-center">
                    <div className="text-2xl font-black text-red-500">{todayAbsent}</div>
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Absent</div>
                  </div>
                  <div className="w-px bg-gray-100" />
                  <div className="text-center">
                    <div className="text-2xl font-black" style={{ color: '#2b2b5e' }}>
                      {filteredStudents.length > 0 ? Math.round((todayPresent / filteredStudents.length) * 100) : 0}%
                    </div>
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Rate</div>
                  </div>
                </div>
                <button
                  onClick={() => setCurrentIndex(0)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white text-sm font-bold tracking-wide transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #2b2b5e, #3a2a6e)' }}
                >
                  <RotateCcw size={15} strokeWidth={2.5} />
                  Start Over
                </button>
              </div>
            ) : currentStudent ? (
              /* ── Card-flip student marker ── */
              <div className="max-w-lg mx-auto">
                {/* Progress bar */}
                <div className="mb-5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">
                      {currentIndex + 1} of {filteredStudents.length}
                    </span>
                    <span className="text-[12px] font-bold" style={{ color: '#2b2b5e' }}>
                      {Math.round(progress)}% complete
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #2b2b5e, #5b5bae)' }}
                    />
                  </div>
                </div>

                {/* Student card */}
                <div
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-200"
                  style={{ opacity: animating ? 0 : 1, transform: animating ? 'translateY(8px) scale(0.98)' : 'translateY(0) scale(1)' }}
                >
                  {/* Card header */}
                  <div
                    className="relative px-6 pt-6 pb-8 text-center overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #f8f8ff 0%, #ebebff 100%)' }}
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-1/2 translate-x-1/2 opacity-[0.08]"
                      style={{ background: '#2b2b5e' }} />
                    {/* Avatar */}
                    <div
                      className="w-16 h-16 rounded-xl mx-auto mb-3 flex items-center justify-center shadow-md"
                      style={{ background: 'linear-gradient(135deg, #2b2b5e, #5b5bae)' }}
                    >
                      <span className="text-xl font-black text-white">
                        {currentStudent.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">{currentStudent.name}</h3>
                    {/* Already marked badge */}
                    {(() => {
                      const rec = registerData.find(r => r.id === currentStudent.id);
                      const dayRec = rec?.attendance[selectedDate];
                      if (dayRec) {
                        return (
                          <span className={`inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${dayRec.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                            {dayRec.status === 'present' ? <CheckCircle size={10} strokeWidth={3} /> : <XCircle size={10} strokeWidth={3} />}
                            Marked {dayRec.status}
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {/* Action buttons */}
                  <div className="p-4 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleMarkAttendance(currentStudent.id, currentStudent.name, 'present')}
                      className="group flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                      style={{ borderColor: '#d1fae5', background: '#f0fdf4' }}
                    >
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                        <CheckCircle size={24} className="text-emerald-600" strokeWidth={2} />
                      </div>
                      <span className="text-[11px] font-black text-emerald-700 tracking-wider uppercase">Present</span>
                    </button>
                    <button
                      onClick={() => handleMarkAttendance(currentStudent.id, currentStudent.name, 'absent')}
                      className="group flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                      style={{ borderColor: '#fecdd3', background: '#fff1f2' }}
                    >
                      <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                        <XCircle size={24} className="text-red-500" strokeWidth={2} />
                      </div>
                      <span className="text-[11px] font-black text-red-600 tracking-wider uppercase">Absent</span>
                    </button>
                  </div>

                  {/* Prev / Skip */}
                  <div className="px-6 pb-5 flex justify-between items-center border-t border-gray-100 pt-4">
                    <button
                      onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentIndex === 0}
                      className="text-[12px] font-bold uppercase tracking-widest transition-colors disabled:text-gray-300 disabled:cursor-not-allowed text-gray-400 hover:text-gray-700"
                    >
                      ← Previous
                    </button>
                    <button
                      onClick={() => setCurrentIndex(prev => Math.min(filteredStudents.length, prev + 1))}
                      className="flex items-center gap-1 text-[12px] font-bold uppercase tracking-widest text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      Skip <ChevronRight size={13} strokeWidth={3} />
                    </button>
                  </div>
                </div>

                {/* Mini student list preview */}
                <div className="mt-4 flex gap-1.5 flex-wrap justify-center">
                  {filteredStudents.map((s, i) => {
                    const rec = registerData.find(r => r.id === s.id);
                    const status = rec?.attendance[selectedDate]?.status;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setCurrentIndex(i)}
                        title={s.name}
                        className="w-7 h-7 rounded-lg text-[10px] font-black transition-all duration-150 border-2"
                        style={{
                          background: i === currentIndex ? '#2b2b5e' : status === 'present' ? '#d1fae5' : status === 'absent' ? '#fee2e2' : '#f3f4f6',
                          color: i === currentIndex ? 'white' : status === 'present' ? '#065f46' : status === 'absent' ? '#991b1b' : '#9ca3af',
                          borderColor: i === currentIndex ? '#2b2b5e' : 'transparent',
                        }}
                      >
                        {s.name[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center text-gray-400 font-medium">
                No students found.
              </div>
            )}
          </>
        ) : (
          /* ── Table View ── */
          <>
            <div className="flex justify-end mb-4">
              <div className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-2xl px-4 py-2.5 shadow-sm w-full max-w-xs">
                <Search size={16} className="text-gray-400" strokeWidth={2.5} />
                <input
                  type="text"
                  placeholder="Search student..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-[13px] font-semibold text-gray-700 bg-transparent outline-none flex-1 placeholder:text-gray-400 placeholder:font-normal"
                />
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, #2b2b5e, #1e1e4a)' }}>
                      <th className="px-5 py-4 text-[11px] font-black uppercase tracking-[1.5px] text-white/60 sticky left-0 z-10" style={{ background: '#2b2b5e' }}>
                        Student Name
                      </th>
                      {allDates.map(date => (
                        <th key={date} className="px-4 py-4 text-[11px] font-black uppercase tracking-[1.2px] text-white/60 text-center whitespace-nowrap">
                          {new Date(date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student, idx) => {
                      const record = registerData.find(r => r.id === student.id);
                      return (
                        <tr
                          key={student.id}
                          className="border-b border-gray-100 transition-colors hover:bg-gray-50/60"
                        >
                          <td className="px-5 py-3.5 sticky left-0 bg-white z-10 border-r border-gray-100">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-[11px] font-black text-white"
                                style={{ background: 'linear-gradient(135deg, #2b2b5e, #5b5bae)' }}
                              >
                                {student.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                              </div>
                              <span className="text-[13px] font-bold text-gray-800">{student.name}</span>
                            </div>
                          </td>
                          {allDates.map(date => {
                            const dayRecord = record?.attendance[date];
                            return (
                              <td key={date} className="px-4 py-3.5 text-center">
                                {dayRecord ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase ${dayRecord.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                                      {dayRecord.status === 'present' ? 'P' : 'A'}
                                    </span>
                                    <span className="text-[9px] text-gray-400 font-medium">
                                      {new Date(dayRecord.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-gray-300 font-black">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    {filteredStudents.length === 0 && (
                      <tr>
                        <td colSpan={allDates.length + 1} className="p-12 text-center text-gray-400 font-medium italic">
                          No students found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
