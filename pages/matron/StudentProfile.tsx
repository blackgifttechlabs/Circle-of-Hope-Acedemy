import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getStudentById,
  getStudentMedications,
  getMedicationAdministrationsForStudent,
  addMatronLog,
  addMedicationAdministration,
  getMatronLogsForStudent
} from '../../services/dataService';
import { Student, StudentMedication, MedicationAdministration, MatronLogCategory } from '../../types';
import { Loader } from '../../components/ui/Loader';
import {
  Utensils,
  Baby,
  Droplets,
  Pill,
  AlertCircle,
  Calendar,
  Smile,
  ClipboardList,
  X,
  CheckCircle2,
  Clock,
  ChevronRight
} from 'lucide-react';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { STUDENTS_COLLECTION } from '../../services/dataService';
import { Button } from '../../components/ui/Button';

const CATEGORIES = [
  { id: 'eating', label: 'Eating', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Utensils },
  { id: 'potty_training', label: 'Potty Training', color: 'bg-teal-100 text-teal-700 border-teal-200', icon: Baby },
  { id: 'bed_wetting', label: 'Bed Wetting', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Droplets },
  { id: 'medication', label: 'Medication', color: 'bg-coral-100 text-coral-700 border-coral-200', icon: Pill }, // Note: coral-100 might need custom hex if not in tailwind
  { id: 'incident', label: 'Incident', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle },
  { id: 'appointment', label: 'Appointment', color: 'bg-green-100 text-green-700 border-green-200', icon: Calendar },
  { id: 'behavior', label: 'Behaviour', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Smile },
  { id: 'discipline', label: 'Discipline & Routine', color: 'bg-pink-100 text-pink-700 border-pink-200', icon: ClipboardList },
];

export const MatronStudentProfile: React.FC<{ user: any }> = ({ user }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [studentList, setStudentList] = useState<string[]>([]);
  const [medications, setMedications] = useState<StudentMedication[]>([]);
  const [administrations, setAdministrations] = useState<MedicationAdministration[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<MatronLogCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [loggedToday, setLoggedToday] = useState<Record<string, boolean>>({});
  const [medicationOverdue, setMedicationOverdue] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    const studentData = await getStudentById(id);
    const savedList = sessionStorage.getItem('matron_student_context');
    if (savedList) {
      setStudentList(JSON.parse(savedList));
    }

    const medsData = await getStudentMedications(id);
    const adminsData = await getMedicationAdministrationsForStudent(id, new Date());
    const logsData = await getMatronLogsForStudent(id, new Date());

    const status: Record<string, boolean> = {};
    if (medsData.length > 0 && medsData.every(m => adminsData.some(a => a.student_medication_id === m.id))) {
        status['medication'] = true;
    }

    const now = new Date();
    const currentTimeStr = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    const overdue = medsData.some(m => {
        const alreadyGiven = adminsData.some(a => a.student_medication_id === m.id);
        return !alreadyGiven && currentTimeStr > m.scheduled_time_to;
    });
    setMedicationOverdue(overdue);
    logsData.forEach(log => {
        status[log.category] = true;
    });

    setStudent(studentData);
    setMedications(medsData);
    setAdministrations(adminsData);
    setLoggedToday(status);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleSaveLog = async (category: MatronLogCategory, data: any) => {
    if (!id || !user) return;
    setSaving(true);
    const success = await addMatronLog({
      student_id: id,
      matron_id: user.id,
      category,
      log_data: data,
      logged_at: new Date(),
    });
    if (success) {
      setLoggedToday(prev => ({ ...prev, [category]: true }));
      setActiveModal(null);
    }
    setSaving(false);
  };

  const handleMarkMedicationGiven = async (med: StudentMedication, time: string, sideEffects: string, notes: string) => {
    if (!id || !user) return;
    setSaving(true);

    const timeGiven = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    timeGiven.setHours(hours, minutes, 0, 0);

    const scheduledFrom = new Date();
    const [fromH, fromM] = med.scheduled_time_from.split(':').map(Number);
    scheduledFrom.setHours(fromH, fromM, 0, 0);

    const scheduledTo = new Date();
    const [toH, toM] = med.scheduled_time_to.split(':').map(Number);
    scheduledTo.setHours(toH, toM, 0, 0);

    const was_on_time = timeGiven >= scheduledFrom && timeGiven <= scheduledTo;
    let minutes_late = null;
    if (timeGiven > scheduledTo) {
        minutes_late = Math.floor((timeGiven.getTime() - scheduledTo.getTime()) / 60000);
    }

    const success = await addMedicationAdministration({
      student_medication_id: med.id,
      student_id: id,
      matron_id: user.id,
      time_given: timeGiven,
      was_on_time,
      minutes_late,
      side_effects: sideEffects,
      notes
    });

    if (success) {
      await fetchData();
    }
    setSaving(false);
  };

  const navigateStudent = (dir: 'next' | 'prev') => {
    const currentIndex = studentList.indexOf(id || '');
    if (currentIndex === -1) return;
    const nextIndex = dir === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < studentList.length) {
      navigate(`/matron/students/${studentList[nextIndex]}`);
    }
  };

  const currentIndex = studentList.indexOf(id || '');

  if (loading || !student) return <Loader />;

  return (
    <div className="px-[10px] pb-20">
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => navigate('/matron/students')} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-500 shadow-sm">
          <ChevronRight size={24} className="rotate-180" />
        </button>
        {studentList.length > 0 && (
          <div className="flex gap-2">
            <button
              disabled={currentIndex <= 0}
              onClick={() => navigateStudent('prev')}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-30"
            >
              Prev
            </button>
            <button
              disabled={currentIndex >= studentList.length - 1}
              onClick={() => navigateStudent('next')}
              className="px-4 py-2 bg-coha-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8 relative">
        {student.profileImageBase64 ? (
          <img src={student.profileImageBase64} alt={student.name} className="w-24 h-24 rounded-2xl object-cover" />
        ) : (
          <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 text-3xl font-bold">
            {student.name.charAt(0)}
          </div>
        )}
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{student.name}</h1>
          <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
            <p className="text-sm font-bold text-slate-500">Room: {student.assignedClass || 'N/A'}</p>
            <span className="text-slate-300">|</span>
            <input
              className="text-sm font-black text-coha-600 bg-coha-50 px-2 py-0.5 rounded outline-none w-24 text-center"
              value={student.dorm || ''}
              onChange={async (e) => {
                const newDorm = e.target.value;
                setStudent({ ...student, dorm: newDorm });
                await updateDoc(doc(db, STUDENTS_COLLECTION, student.id), { dorm: newDorm });
              }}
              placeholder="Set Dorm"
            />
          </div>
          {student.medicalConditions && (
            <div className="mt-2 flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1 rounded-full w-fit">
              <AlertCircle size={14} />
              <span className="text-xs font-bold uppercase tracking-wider">{student.medicalConditions}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveModal(cat.id as MatronLogCategory)}
              className={`${cat.color} p-6 rounded-3xl border-2 flex flex-col items-center text-center gap-3 transition-transform active:scale-95 relative overflow-hidden`}
            >
              <Icon size={32} />
              <span className="font-bold text-sm uppercase tracking-wider leading-tight">{cat.label}</span>
              {loggedToday[cat.id] && (
                <div className="absolute top-2 right-2 text-current">
                  <CheckCircle2 size={20} />
                </div>
              )}
              {cat.id === 'medication' && medicationOverdue && !loggedToday['medication'] && (
                <div className="absolute top-2 right-2 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {activeModal && (
        <CategoryModal
          category={activeModal}
          studentName={student.name}
          onClose={() => setActiveModal(null)}
          onSave={(data) => handleSaveLog(activeModal, data)}
          saving={saving}
          medications={medications}
          administrations={administrations}
          onMarkMedicationGiven={handleMarkMedicationGiven}
        />
      )}
    </div>
  );
};

const CategoryModal: React.FC<{
  category: MatronLogCategory;
  studentName: string;
  onClose: () => void;
  onSave: (data: any) => void;
  saving: boolean;
  medications: StudentMedication[];
  administrations: MedicationAdministration[];
  onMarkMedicationGiven: (med: StudentMedication, time: string, sideEffects: string, notes: string) => void;
}> = ({ category, studentName, onClose, onSave, saving, medications, administrations, onMarkMedicationGiven }) => {
  const [formData, setFormData] = useState<any>({});
  const [selectedMed, setSelectedMed] = useState<StudentMedication | null>(null);
  const [medForm, setMedForm] = useState({ time: new Date().getHours().toString().padStart(2, '0') + ":" + new Date().getMinutes().toString().padStart(2, '0'), sideEffects: '', notes: '' });

  const renderContent = () => {
    switch (category) {
      case 'eating':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Appetite</label>
              <div className="flex gap-2">
                {['Good', 'Fair', 'Poor'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFormData({ ...formData, appetite: opt })}
                    className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${formData.appetite === opt ? 'bg-coha-900 text-white border-coha-900' : 'bg-white text-gray-600 border-gray-100 hover:border-gray-300'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Meals Eaten</label>
              <div className="space-y-2">
                {['Breakfast', 'Lunch', 'Supper'].map(meal => (
                  <label key={meal} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-gray-300 text-coha-900 focus:ring-coha-900"
                      checked={(formData.meals || []).includes(meal)}
                      onChange={(e) => {
                        const meals = formData.meals || [];
                        if (e.target.checked) setFormData({ ...formData, meals: [...meals, meal] });
                        else setFormData({ ...formData, meals: meals.filter((m: string) => m !== meal) });
                      }}
                    />
                    <span className="font-bold text-gray-700">{meal}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Problems or Refusal</label>
              <textarea
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold focus:outline-none focus:border-coha-900"
                rows={2}
                value={formData.notes || ''}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
        );
      case 'potty_training':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Independence Level</label>
              <div className="space-y-2">
                {['Independent', 'Needs reminding', 'Needs full help'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFormData({ ...formData, independence: opt })}
                    className={`w-full py-4 px-4 rounded-xl font-bold border-2 text-left transition-all ${formData.independence === opt ? 'bg-coha-900 text-white border-coha-900' : 'bg-white text-gray-600 border-gray-100 hover:border-gray-300'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Accidents Today</label>
              <input
                type="number"
                min="0"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold focus:outline-none focus:border-coha-900"
                value={formData.accidents || 0}
                onChange={e => setFormData({ ...formData, accidents: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Progress Notes</label>
              <textarea
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold focus:outline-none focus:border-coha-900"
                rows={2}
                value={formData.notes || ''}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
        );
      case 'bed_wetting':
        return (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Did bed wetting occur?</label>
                <div className="flex gap-2">
                  {['Yes', 'No'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFormData({ ...formData, occurred: opt === 'Yes' })}
                      className={`flex-1 py-4 rounded-xl font-bold border-2 transition-all ${formData.occurred === (opt === 'Yes') ? 'bg-coha-900 text-white border-coha-900' : 'bg-white text-gray-600 border-gray-100 hover:border-gray-300'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              {formData.occurred && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Time Found</label>
                    <input
                      type="time"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold focus:outline-none focus:border-coha-900"
                      value={formData.time_found || new Date().getHours().toString().padStart(2, '0') + ":" + new Date().getMinutes().toString().padStart(2, '0')}
                      onChange={e => setFormData({ ...formData, time_found: e.target.value })}
                    />
                  </div>
              )}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Progress Notes</label>
                <textarea
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold focus:outline-none focus:border-coha-900"
                  rows={2}
                  value={formData.notes || ''}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
          );
      case 'medication':
        return (
          <div className="space-y-4">
            {medications.map(med => {
              const admin = administrations.find(a => a.student_medication_id === med.id);
              return (
                <div key={med.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-gray-900">{med.medicine_name}</h4>
                      <p className="text-xs font-medium text-gray-500">{med.dosage} · {med.scheduled_time_from} – {med.scheduled_time_to}</p>
                    </div>
                    {admin ? (
                      <div className="flex items-center gap-1 text-green-600 font-bold text-xs uppercase tracking-wider">
                        <CheckCircle2 size={16} /> Given at {admin.time_given?.toDate ? admin.time_given.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : new Date(admin.time_given).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedMed(med)}
                        className="px-3 py-1.5 bg-coha-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider"
                      >
                        Mark as given
                      </button>
                    )}
                  </div>
                  {selectedMed?.id === med.id && (
                    <div className="mt-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm space-y-4 animate-fade-in">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Administration details</span>
                        <button onClick={() => setSelectedMed(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Time Given</label>
                        <input
                          type="time"
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm font-bold"
                          value={medForm.time}
                          onChange={e => setMedForm({ ...medForm, time: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Side Effects Observed</label>
                        <input
                          type="text"
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm font-bold"
                          placeholder="None"
                          value={medForm.sideEffects}
                          onChange={e => setMedForm({ ...medForm, sideEffects: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Notes</label>
                        <input
                          type="text"
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm font-bold"
                          value={medForm.notes}
                          onChange={e => setMedForm({ ...medForm, notes: e.target.value })}
                        />
                      </div>
                      <Button
                        fullWidth
                        onClick={() => onMarkMedicationGiven(med, medForm.time, medForm.sideEffects, medForm.notes)}
                        disabled={saving}
                      >
                        Confirm
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
            {medications.length === 0 && <p className="text-center text-gray-400 italic py-4">No medications scheduled.</p>}
          </div>
        );
      case 'incident':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">What happened?</label>
              <textarea
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold focus:outline-none focus:border-coha-900"
                rows={3}
                required
                value={formData.description || ''}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Where?</label>
              <input
                type="text"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold focus:outline-none focus:border-coha-900"
                value={formData.location || ''}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">When?</label>
              <input
                type="datetime-local"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold focus:outline-none focus:border-coha-900"
                value={formData.timestamp || new Date().toISOString().slice(0, 16)}
                onChange={e => setFormData({ ...formData, timestamp: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Severity</label>
              <div className="flex gap-2">
                {['Minor', 'Moderate', 'Serious'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFormData({ ...formData, severity: opt })}
                    className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${formData.severity === opt ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-100 hover:border-gray-300'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 'appointment':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Doctor/Specialist Name</label>
              <input
                type="text"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold"
                value={formData.doctor || ''}
                onChange={e => setFormData({ ...formData, doctor: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Visit Date</label>
              <input
                type="date"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold"
                value={formData.date || ''}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Outcome</label>
              <textarea
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold"
                rows={2}
                value={formData.outcome || ''}
                onChange={e => setFormData({ ...formData, outcome: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Follow-up Required?</label>
              <div className="flex gap-2">
                {['Yes', 'No'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFormData({ ...formData, follow_up: opt === 'Yes' })}
                    className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${formData.follow_up === (opt === 'Yes') ? 'bg-coha-900 text-white border-coha-900' : 'bg-white text-gray-600 border-gray-100 hover:border-gray-300'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            {formData.follow_up && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Follow-up Date</label>
                <input
                  type="date"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold"
                  value={formData.follow_up_date || ''}
                  onChange={e => setFormData({ ...formData, follow_up_date: e.target.value })}
                />
              </div>
            )}
          </div>
        );
      case 'behavior':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Mood Today</label>
              <div className="grid grid-cols-2 gap-2">
                {['Happy', 'Calm', 'Anxious', 'Upset', 'Aggressive', 'Withdrawn'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFormData({ ...formData, mood: opt })}
                    className={`py-3 rounded-xl font-bold border-2 transition-all ${formData.mood === opt ? 'bg-coha-900 text-white border-coha-900' : 'bg-white text-gray-600 border-gray-100 hover:border-gray-300'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Improvements</label>
                <textarea
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-bold"
                    rows={2}
                    value={formData.improvements || ''}
                    onChange={e => setFormData({ ...formData, improvements: e.target.value })}
                />
                </div>
                <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Triggers</label>
                <textarea
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-bold"
                    rows={2}
                    value={formData.triggers || ''}
                    onChange={e => setFormData({ ...formData, triggers: e.target.value })}
                />
                </div>
            </div>
            <div className="space-y-3 p-4 bg-purple-50 rounded-2xl border border-purple-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-purple-400">ABC Notes</p>
                <div>
                    <label className="block text-[10px] font-bold uppercase text-purple-700 mb-1">What caused it</label>
                    <input type="text" className="w-full bg-white border border-purple-200 rounded-lg p-3 text-sm font-bold" value={formData.abc_a || ''} onChange={e => setFormData({...formData, abc_a: e.target.value})} />
                </div>
                <div>
                    <label className="block text-[10px] font-bold uppercase text-purple-700 mb-1">What happened</label>
                    <input type="text" className="w-full bg-white border border-purple-200 rounded-lg p-3 text-sm font-bold" value={formData.abc_b || ''} onChange={e => setFormData({...formData, abc_b: e.target.value})} />
                </div>
                <div>
                    <label className="block text-[10px] font-bold uppercase text-purple-700 mb-1">What followed</label>
                    <input type="text" className="w-full bg-white border border-purple-200 rounded-lg p-3 text-sm font-bold" value={formData.abc_c || ''} onChange={e => setFormData({...formData, abc_c: e.target.value})} />
                </div>
            </div>
          </div>
        );
      case 'discipline':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Strategies Used</label>
              <div className="grid grid-cols-2 gap-2">
                {['Praise', 'Redirection', 'Time out', 'Reward chart', 'Other'].map(opt => (
                  <label key={opt} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-coha-900"
                      checked={(formData.strategies || []).includes(opt)}
                      onChange={(e) => {
                        const strats = formData.strategies || [];
                        if (e.target.checked) setFormData({ ...formData, strategies: [...strats, opt] });
                        else setFormData({ ...formData, strategies: strats.filter((s: string) => s !== opt) });
                      }}
                    />
                    <span className="text-sm font-bold text-gray-700">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
            {formData.strategies?.includes('Other') && (
               <input
               type="text"
               placeholder="Details of 'Other' strategy..."
               className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold"
               value={formData.other_strategy || ''}
               onChange={e => setFormData({ ...formData, other_strategy: e.target.value })}
             />
            )}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Routine Adherence</label>
              <div className="flex gap-2">
                {['Good', 'Partial', 'Poor'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFormData({ ...formData, adherence: opt })}
                    className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${formData.adherence === opt ? 'bg-coha-900 text-white border-coha-900' : 'bg-white text-gray-600 border-gray-100 hover:border-gray-300'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Rewards Given</label>
                    <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold" value={formData.rewards || ''} onChange={e => setFormData({...formData, rewards: e.target.value})} />
                </div>
                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Outcome</label>
                    <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold" value={formData.outcome || ''} onChange={e => setFormData({...formData, outcome: e.target.value})} />
                </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-gray-100 flex justify-between items-start shrink-0">
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">{category.replace('_', ' ').charAt(0).toUpperCase() + category.replace('_', ' ').slice(1)}</h3>
            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Logging for {studentName}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
          {renderContent()}
        </div>

        <div className="p-8 bg-gray-50 border-t border-gray-100 shrink-0">
          <Button
            fullWidth
            className="!py-5 !rounded-3xl !text-lg shadow-xl shadow-coha-900/20"
            onClick={() => category === 'medication' ? onClose() : onSave(formData)}
            disabled={saving}
          >
            {category === 'medication' ? 'Done' : (saving ? 'Saving...' : 'Save Log')}
          </Button>
        </div>
      </div>
    </div>
  );
};
