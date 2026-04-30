import React, { useEffect, useState } from 'react';
import { getTeacherById, updateTeacher } from '../../services/dataService';
import { Teacher } from '../../types';
import { KeyRound, LockKeyhole, Save } from 'lucide-react';

interface TeacherSettingsProps {
  user: any;
}

export const TeacherSettings: React.FC<TeacherSettingsProps> = ({ user }) => {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [changedPinValue, setChangedPinValue] = useState('');

  useEffect(() => {
    const fetchTeacher = async () => {
      if (!user?.id) return;
      try {
        const teacherData = await getTeacherById(user.id);
        setTeacher(teacherData);
      } catch (error) {
        console.error('Error fetching teacher:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacher();
  }, [user?.id]);

  const handlePinUpdate = async () => {
    if (!teacher) return;

    if (currentPin !== teacher.pin) {
      setMessageType('error');
      setMessage('Current PIN is incorrect.');
      return;
    }
    if (newPin.length < 4) {
      setMessageType('error');
      setMessage('New PIN must be at least 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setMessageType('error');
      setMessage('New PIN and confirm PIN do not match.');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      const success = await updateTeacher(teacher.id, { pin: newPin });
      if (!success) {
        setMessageType('error');
        setMessage('Could not update teacher PIN. Please try again.');
        return;
      }

      setTeacher({ ...teacher, pin: newPin });
      setChangedPinValue(newPin);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setMessageType('success');
      setMessage('Teacher PIN updated successfully.');

      const pinUpdate = {
        teacherId: teacher.id,
        pin: newPin,
        updatedAt: Date.now(),
      };
      localStorage.setItem('coha_teacher_pin_update', JSON.stringify(pinUpdate));
      window.dispatchEvent(new CustomEvent('coha-teacher-pin-update', { detail: pinUpdate }));
    } catch (error) {
      console.error('Error updating teacher PIN:', error);
      setMessageType('error');
      setMessage('Failed to update teacher PIN.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-archivo">Teacher Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Change your teacher login PIN.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2 text-coha-700">
            <KeyRound size={18} />
            <span className="text-sm font-bold uppercase tracking-[0.16em]">Change PIN</span>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid gap-4">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 mb-2">Current PIN</label>
              <input
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                type="password"
                inputMode="numeric"
                placeholder="Enter current PIN"
                className="w-full h-12 border border-gray-300 rounded-xl px-4 text-sm font-semibold outline-none focus:border-coha-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 mb-2">New PIN</label>
              <input
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                type="password"
                inputMode="numeric"
                placeholder="Enter new PIN"
                className="w-full h-12 border border-gray-300 rounded-xl px-4 text-sm font-semibold outline-none focus:border-coha-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 mb-2">Confirm PIN</label>
              <input
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                type="password"
                inputMode="numeric"
                placeholder="Confirm new PIN"
                className="w-full h-12 border border-gray-300 rounded-xl px-4 text-sm font-semibold outline-none focus:border-coha-500"
              />
            </div>
          </div>

          {message && (
            <p className={`text-sm font-semibold ${messageType === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}

          {changedPinValue && (
            <div className="rounded-[1.25rem] border border-orange-200 bg-orange-50/70 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.22em] font-black text-orange-600">Changed To</p>
              <p className="mt-2 text-3xl font-black tracking-[0.28em] text-green-600">{changedPinValue}</p>
            </div>
          )}

          <button
            disabled={saving}
            onClick={handlePinUpdate}
            className="w-full h-12 rounded-xl bg-coha-900 text-white text-sm font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {saving ? <LockKeyhole size={16} /> : <Save size={16} />}
            {saving ? 'Updating PIN...' : 'Update PIN'}
          </button>
        </div>
      </div>
    </div>
  );
};
