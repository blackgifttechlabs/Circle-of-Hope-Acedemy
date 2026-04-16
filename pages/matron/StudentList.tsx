import React, { useEffect, useState } from 'react';
import { getStudents, getMedicationAdministrationsToday, getStudentMedications } from '../../services/dataService';
import { Student } from '../../types';
import { Loader } from '../../components/ui/Loader';
import { Search, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const MatronStudentList: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [medicationStatus, setMedicationStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchData = async () => {
      const studentsData = await getStudents();
      const adminsToday = await getMedicationAdministrationsToday();

      const status: Record<string, boolean> = {};
      for (const student of studentsData) {
        const meds = await getStudentMedications(student.id);
        const adminIds = adminsToday.filter(a => a.student_id === student.id).map(a => a.student_medication_id);
        status[student.id] = meds.length > 0 && meds.every(m => adminIds.includes(m.id));
      }

      setStudents(studentsData);
      setMedicationStatus(status);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.assignedClass || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <Loader />;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Students</h1>
        <p className="text-gray-500 font-medium">Select a student to log daily care</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search by name or room..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-gray-900 shadow-sm focus:outline-none focus:border-coha-500 focus:ring-4 focus:ring-coha-500/10 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredStudents.map(student => (
          <Link
            key={student.id}
            to={`/matron/students/${student.id}`}
            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:border-coha-500 transition-all group"
          >
            {student.profileImageBase64 ? (
              <img src={student.profileImageBase64} alt={student.name} className="w-16 h-16 rounded-xl object-cover" />
            ) : (
              <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-xl font-bold">
                {student.name.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">{student.name}</h3>
              <p className="text-sm text-gray-500 font-medium">Room: {student.assignedClass || 'N/A'}</p>
            </div>
            {medicationStatus[student.id] && (
              <div className="text-green-500" title="All medications given today">
                <CheckCircle2 size={24} />
              </div>
            )}
            <ChevronRight className="text-gray-300 group-hover:text-coha-500 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
};
