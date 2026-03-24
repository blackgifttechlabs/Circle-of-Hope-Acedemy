import React, { useState, useEffect } from 'react';
import { getSystemSettings, getTeacherById, updateTeacher } from '../../services/dataService';
import { SystemSettings, TermCalendar, Teacher } from '../../types';
import { Calendar, CheckCircle2, Circle } from 'lucide-react';

interface TeacherSettingsProps {
  user: any;
}

export const TeacherSettings: React.FC<TeacherSettingsProps> = ({ user }) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'terms'>('terms');

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      try {
        const [sysSettings, teacherData] = await Promise.all([
          getSystemSettings(),
          getTeacherById(user.id)
        ]);
        setSettings(sysSettings);
        setTeacher(teacherData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleToggleTerm = async (termId: string) => {
    if (!teacher || !user?.id) return;
    setSaving(true);
    try {
      const termToSave = teacher.activeTermId === termId ? '' : termId;
      await updateTeacher(user.id, { activeTermId: termToSave });
      setTeacher({ ...teacher, activeTermId: termToSave });
      window.location.reload();
    } catch (error) {
      console.error("Error updating active term:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 font-archivo">Teacher Settings</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            className={`px-6 py-4 text-sm font-semibold transition-colors ${
              activeTab === 'terms'
                ? 'text-coha-600 border-b-2 border-coha-600 bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('terms')}
          >
            <div className="flex items-center gap-2">
              <Calendar size={18} />
              Active Term
            </div>
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'terms' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Active Term</h2>
              <p className="text-sm text-gray-500 mb-6">
                Choose the term you are currently working in. This will be used as the default term for your classes, registers, and assessments.
              </p>
              
              {settings?.schoolCalendars && settings.schoolCalendars.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {settings.schoolCalendars.map((term: TermCalendar) => {
                    const isActive = teacher?.activeTermId === term.id;
                    return (
                      <div 
                        key={term.id}
                        onClick={() => !saving && handleToggleTerm(term.id)}
                        className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          isActive 
                            ? 'border-coha-500 bg-blue-50/30 shadow-md' 
                            : 'border-gray-200 hover:border-coha-300 hover:bg-gray-50'
                        } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className={`font-bold text-lg ${isActive ? 'text-coha-700' : 'text-gray-800'}`}>
                            {term.termName}
                          </h3>
                          <div className={`${isActive ? 'text-coha-600' : 'text-gray-300'}`}>
                            {isActive ? <CheckCircle2 size={24} className="fill-blue-100" /> : <Circle size={24} />}
                          </div>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p><span className="font-medium">Starts:</span> {new Date(term.learnersOpeningDate).toLocaleDateString()}</p>
                          <p><span className="font-medium">Ends:</span> {new Date(term.learnersClosingDate).toLocaleDateString()}</p>
                          <p><span className="font-medium">School Days:</span> {term.schoolDays}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                  <p className="text-gray-500">No terms have been configured by the administrator yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
