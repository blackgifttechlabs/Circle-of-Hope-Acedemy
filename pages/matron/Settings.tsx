import React, { useState } from 'react';
import { updateMatron, verifyMatronPin } from '../../services/dataService';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Key, Lock, ShieldCheck, CheckCircle } from 'lucide-react';
import { hashPin } from '../../utils/crypto';

export const MatronSettings: React.FC<{ user: any }> = ({ user }) => {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const verifiedMatron = await verifyMatronPin(user.id, currentPin);
    if (!verifiedMatron) {
      setMessage({ type: 'error', text: 'Current PIN is incorrect.' });
      setLoading(false);
      return;
    }

    if (newPin.length !== 4 || isNaN(Number(newPin))) {
      setMessage({ type: 'error', text: 'New PIN must be a 4-digit number.' });
      setLoading(false);
      return;
    }

    if (newPin !== confirmPin) {
      setMessage({ type: 'error', text: 'New PINs do not match.' });
      setLoading(false);
      return;
    }

    const hashedNewPin = await hashPin(newPin);
    const success = await updateMatron(user.id, { pin: hashedNewPin });
    if (success) {
      setMessage({ type: 'success', text: 'PIN updated successfully.' });
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } else {
      setMessage({ type: 'error', text: 'Failed to update PIN.' });
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 font-medium">Manage your profile and security</p>
      </div>

      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-4 mb-8 p-4 bg-gray-50 rounded-3xl">
          <div className="w-16 h-16 bg-coha-900 text-white rounded-2xl flex items-center justify-center text-2xl font-black">
            {user?.name?.charAt(0)}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Loggged in as</p>
            <p className="text-xl font-bold text-gray-900">{user?.name}</p>
          </div>
        </div>

        <form onSubmit={handleUpdatePin} className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={18} className="text-coha-600" />
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-900">Change PIN</h2>
          </div>

          {message && (
            <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message.type === 'success' ? <CheckCircle size={18} /> : <Lock size={18} />}
              {message.text}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Current PIN</label>
            <div className="flex justify-between gap-2">
                {[0, 1, 2, 3].map(idx => (
                    <input
                        key={idx}
                        id={`curr-pin-${idx}`}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        value={currentPin[idx] || ''}
                        onChange={e => {
                            const val = e.target.value;
                            if (val && !/^\d$/.test(val)) return;
                            const newP = currentPin.split('');
                            newP[idx] = val;
                            setCurrentPin(newP.join(''));
                            if (val && idx < 3) document.getElementById(`curr-pin-${idx+1}`)?.focus();
                        }}
                        onKeyDown={e => {
                            if (e.key === 'Backspace' && !currentPin[idx] && idx > 0) document.getElementById(`curr-pin-${idx-1}`)?.focus();
                        }}
                        className="w-full h-14 bg-gray-50 border border-gray-200 rounded-2xl text-center text-xl font-bold focus:border-coha-500 outline-none transition-all"
                    />
                ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">New 4-Digit PIN</label>
            <div className="flex justify-between gap-2">
                {[0, 1, 2, 3].map(idx => (
                    <input
                        key={idx}
                        id={`new-pin-${idx}`}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        value={newPin[idx] || ''}
                        onChange={e => {
                            const val = e.target.value;
                            if (val && !/^\d$/.test(val)) return;
                            const newP = newPin.split('');
                            newP[idx] = val;
                            setNewPin(newP.join(''));
                            if (val && idx < 3) document.getElementById(`new-pin-${idx+1}`)?.focus();
                        }}
                        onKeyDown={e => {
                            if (e.key === 'Backspace' && !newPin[idx] && idx > 0) document.getElementById(`new-pin-${idx-1}`)?.focus();
                        }}
                        className="w-full h-14 bg-gray-50 border border-gray-200 rounded-2xl text-center text-xl font-bold focus:border-coha-500 outline-none transition-all"
                    />
                ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Confirm New PIN</label>
            <div className="flex justify-between gap-2">
                {[0, 1, 2, 3].map(idx => (
                    <input
                        key={idx}
                        id={`conf-pin-${idx}`}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        value={confirmPin[idx] || ''}
                        onChange={e => {
                            const val = e.target.value;
                            if (val && !/^\d$/.test(val)) return;
                            const newP = confirmPin.split('');
                            newP[idx] = val;
                            setConfirmPin(newP.join(''));
                            if (val && idx < 3) document.getElementById(`conf-pin-${idx+1}`)?.focus();
                        }}
                        onKeyDown={e => {
                            if (e.key === 'Backspace' && !confirmPin[idx] && idx > 0) document.getElementById(`conf-pin-${idx-1}`)?.focus();
                        }}
                        className="w-full h-14 bg-gray-50 border border-gray-200 rounded-2xl text-center text-xl font-bold focus:border-coha-500 outline-none transition-all"
                    />
                ))}
            </div>
          </div>

          <Button type="submit" fullWidth disabled={loading} className="!py-5 !rounded-3xl shadow-lg shadow-coha-900/10">
            {loading ? 'Updating...' : 'Save New PIN'}
          </Button>
        </form>
      </div>
    </div>
  );
};
