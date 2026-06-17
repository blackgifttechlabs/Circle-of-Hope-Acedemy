import React from 'react';
import { Check, X, XCircle } from 'lucide-react';

type UploadResultModalProps = {
  open: boolean;
  status: 'success' | 'error';
  title: string;
  message: string;
  onClose: () => void;
};

export const UploadResultModal: React.FC<UploadResultModalProps> = ({
  open,
  status,
  title,
  message,
  onClose,
}) => {
  if (!open) return null;

  const isSuccess = status === 'success';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-[lessonModalFade_.22s_ease-out_both]">
      <style>{`
        @keyframes lessonModalFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes lessonModalPop {
          0% { opacity: 0; transform: translateY(18px) scale(.92); }
          70% { opacity: 1; transform: translateY(-3px) scale(1.02); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes lessonIconBurst {
          0% { transform: scale(.35) rotate(-18deg); opacity: 0; }
          60% { transform: scale(1.08) rotate(4deg); opacity: 1; }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
        @keyframes lessonRingPulse {
          0% { transform: scale(.78); opacity: .75; }
          100% { transform: scale(1.55); opacity: 0; }
        }
      `}</style>
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-[lessonModalPop_.42s_cubic-bezier(.2,.9,.2,1)_both]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className={`h-2 ${isSuccess ? 'bg-emerald-500' : 'bg-red-500'}`} />
        <div className="px-7 pb-7 pt-8 text-center">
          <div className="relative mx-auto mb-5 flex h-24 w-24 items-center justify-center">
            <span className={`absolute h-20 w-20 rounded-full ${isSuccess ? 'bg-emerald-100' : 'bg-red-100'} animate-[lessonRingPulse_1s_ease-out_infinite]`} />
            <span className={`relative flex h-20 w-20 items-center justify-center rounded-full text-white shadow-xl ${isSuccess ? 'bg-emerald-500 shadow-emerald-500/25' : 'bg-red-500 shadow-red-500/25'} animate-[lessonIconBurst_.5s_cubic-bezier(.2,.9,.2,1)_both]`}>
              {isSuccess ? <Check size={46} strokeWidth={4} /> : <XCircle size={48} strokeWidth={3} />}
            </span>
          </div>
          <h3 className="text-2xl font-black text-slate-950">{title}</h3>
          <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{message}</p>
          <button
            type="button"
            onClick={onClose}
            className={`mt-7 h-11 w-full rounded-xl text-sm font-black text-white shadow-lg transition-transform hover:-translate-y-0.5 ${isSuccess ? 'bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700' : 'bg-red-600 shadow-red-600/20 hover:bg-red-700'}`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
