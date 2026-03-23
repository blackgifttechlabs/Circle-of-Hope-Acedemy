import React, { useState, useEffect } from 'react';
import { getStudentDailyRegister, getStudentById } from '../../services/dataService';
import { StudentDailyRegister, Student } from '../../types';
import { Loader } from '../../components/ui/Loader';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const ParentDailyRegister: React.FC<{ user: any }> = ({ user }) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [registerData, setRegisterData] = useState<StudentDailyRegister | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const studentData = await getStudentById(user.id);
    setStudent(studentData);
    if (studentData && studentData.assignedClass) {
      const data = await getStudentDailyRegister(studentData.assignedClass, user.id);
      setRegisterData(data);
    }
    setLoading(false);
  };

  if (loading) return <Loader />;
  if (!student) return <div className="p-8 text-center text-gray-500">Student record not found.</div>;

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <div className="w-full pb-10">
      <div className="bg-white p-6 shadow-sm border-l-8 border-coha-900 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-coha-900">Attendance Calendar</h2>
            <p className="text-gray-600">Daily Register for {student.name}</p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-8 max-w-4xl mx-auto bg-white border border-gray-200 shadow-sm rounded-[20px]">
        <div className="flex justify-between items-center mb-6">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft size={24} className="text-gray-600" />
          </button>
          <h3 className="text-xl font-black uppercase tracking-widest text-coha-900">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronRight size={24} className="text-gray-600" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 sm:gap-4 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center font-black text-xs uppercase tracking-widest text-gray-400">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2 sm:gap-4">
          {days.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="aspect-square"></div>;
            }

            const dateString = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const record = registerData?.attendance[dateString];
            
            let bgColor = 'bg-gray-100';
            let textColor = 'text-gray-400';
            
            if (record) {
              if (record.status === 'present') {
                bgColor = 'bg-green-500';
                textColor = 'text-white';
              } else if (record.status === 'absent') {
                bgColor = 'bg-red-500';
                textColor = 'text-white';
              }
            }

            // Check if it's today
            const today = new Date();
            const isToday = today.getDate() === day && today.getMonth() === currentMonth.getMonth() && today.getFullYear() === currentMonth.getFullYear();

            return (
              <div key={day} className="aspect-square flex flex-col items-center justify-center relative">
                <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-sm sm:text-lg font-bold transition-all ${bgColor} ${textColor} ${isToday && !record ? 'ring-2 ring-coha-500 ring-offset-2' : ''}`}>
                  {day}
                </div>
                {record && (
                  <span className="absolute bottom-[-10px] text-[9px] font-black uppercase tracking-widest text-gray-400 hidden sm:block">
                    {record.status}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-12 flex justify-center gap-6 border-t border-gray-100 pt-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Present</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Absent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-100 border border-gray-200"></div>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Not Recorded</span>
          </div>
        </div>
      </div>
    </div>
  );
};
