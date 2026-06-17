import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { UserRole } from '../types';
import { signInPortalAccount, verifyAdminPin } from '../services/dataService';

const LOGO_URL = 'https://i.ibb.co/LzYXwYfX/logo.png';
const INACTIVITY_TIMEOUT_MS = 150_000;
const LOCK_STORAGE_KEY = 'coha_inactivity_locked';
const ACTIVITY_EVENTS = ['click', 'keydown', 'touchstart', 'scroll', 'pointerdown'] as const;

interface InactivityLockProps {
  user: any;
  role: UserRole | null;
}

export const InactivityLock: React.FC<InactivityLockProps> = ({ user, role }) => {
  const [isLocked, setIsLocked] = useState(() => localStorage.getItem(LOCK_STORAGE_KEY) === 'true');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const timerRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isAuthenticated = !!user && !!role;

  const expectedLabel = useMemo(() => {
    if (role === UserRole.ADMIN || role === UserRole.TEACHER) return 'password';
    return 'PIN';
  }, [role]);

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const armTimer = () => {
    clearTimer();
    if (!isAuthenticated || isLocked) return;
    timerRef.current = window.setTimeout(() => {
      localStorage.setItem(LOCK_STORAGE_KEY, 'true');
      setIsLocked(true);
      setPassword('');
      setError('');
    }, INACTIVITY_TIMEOUT_MS);
  };

  useEffect(() => {
    if (!isLocked) return;
    const timeout = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(timeout);
  }, [isLocked]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearTimer();
      setIsLocked(false);
      localStorage.removeItem(LOCK_STORAGE_KEY);
      setPassword('');
      setError('');
      return;
    }

    const handleActivity = () => armTimer();
    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });
    armTimer();

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      clearTimer();
    };
  }, [isAuthenticated, isLocked, role, user?.id]);

  const validatePassword = async () => {
    if (!role || !user) return false;
    const value = password.trim();
    if (!value) return false;

    if (role === UserRole.ADMIN) {
      return !!(await verifyAdminPin(value));
    }

    if (
      role === UserRole.TEACHER
      || role === UserRole.PARENT
      || role === UserRole.VTC_STUDENT
      || role === UserRole.MATRON
    ) {
      await signInPortalAccount(role, user.id, value);
      return true;
    }

    return false;
  };

  const handleUnlock = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsUnlocking(true);

    try {
      const isValid = await validatePassword();
      if (!isValid) {
        setError(`Incorrect ${expectedLabel}.`);
        setIsUnlocking(false);
        return;
      }

      window.setTimeout(() => {
        localStorage.removeItem(LOCK_STORAGE_KEY);
        setIsLocked(false);
        setPassword('');
        setIsUnlocking(false);
        armTimer();
      }, 950);
    } catch (error) {
      console.error('Unlock failed:', error);
      setError('Could not unlock right now. Please try again.');
      setIsUnlocking(false);
    }
  };

  if (!isLocked) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xl">
      <style>{`
        @keyframes cohaLockIn {
          0% { opacity: 0; transform: translateY(26px) scale(.9) rotateX(14deg); filter: blur(8px); }
          55% { opacity: 1; transform: translateY(-8px) scale(1.035) rotateX(0deg); filter: blur(0); }
          75% { transform: translateY(4px) scale(.985); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes cohaUnlock {
          0% { transform: scale(1) rotate(0deg); opacity: 1; }
          22% { transform: scale(.96) rotate(-1deg); }
          48% { transform: scale(1.08) rotate(1deg); }
          70% { transform: scale(.98) rotate(0deg); opacity: .98; }
          100% { transform: scale(.18) rotate(8deg); opacity: 0; filter: blur(12px); }
        }
        @keyframes cohaPulseRing {
          0% { transform: scale(.7); opacity: .7; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes cohaShieldBounce {
          0%, 100% { transform: translateY(0) scale(1); }
          45% { transform: translateY(-8px) scale(1.08); }
          68% { transform: translateY(3px) scale(.98); }
        }
      `}</style>

      <form
        onSubmit={handleUnlock}
        className={`w-full max-w-md border border-white/20 bg-white/95 p-7 shadow-[0_24px_80px_rgba(0,0,0,0.35)] ${isUnlocking ? 'animate-[cohaUnlock_.95s_cubic-bezier(.2,.9,.2,1)_forwards]' : 'animate-[cohaLockIn_.55s_cubic-bezier(.2,.9,.2,1)_both]'}`}
      >
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-5">
            <span className="absolute inset-0 rounded-full bg-coha-500/25 animate-[cohaPulseRing_1.4s_ease-out_infinite]" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-slate-200 bg-white shadow-xl">
              <img src={LOGO_URL} alt="COHA logo" className="h-14 w-14 object-contain" />
            </div>
          </div>

          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-coha-900 text-white animate-[cohaShieldBounce_1.1s_ease-in-out_infinite]">
            {isUnlocking ? <ShieldCheck size={24} /> : <LockKeyhole size={24} />}
          </div>

          <h2 className="text-xl font-black text-slate-950">You have been inactive for too long</h2>
          <p className="mt-2 max-w-xs text-sm font-semibold leading-6 text-slate-600">
            The app has been secured.
          </p>
        </div>

        <div className="mt-7">
          <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            Enter password
          </label>
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isUnlocking}
            className="h-12 w-full border border-slate-300 bg-white px-4 text-base font-semibold text-slate-950 outline-none transition focus:border-coha-500 focus:ring-4 focus:ring-coha-500/10 disabled:opacity-60"
          />
          {error && <p className="mt-3 text-sm font-bold text-red-600">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={isUnlocking}
          className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 bg-coha-900 px-4 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-coha-800 disabled:opacity-70"
        >
          {isUnlocking ? 'Unlocking...' : 'Unlock App'}
        </button>
      </form>
    </div>
  );
};
