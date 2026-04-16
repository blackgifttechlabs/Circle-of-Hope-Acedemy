import React, { useEffect, useState } from 'react';
import { getMatronAlerts } from '../../services/dataService';
import { AlertTriangle, ChevronRight, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';

export const MatronDashboard: React.FC<{ user: any }> = ({ user }) => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      const data = await getMatronAlerts();
      setAlerts(data);
      setLoading(false);
    };
    fetchAlerts();
  }, []);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Good morning, {user?.name}</h1>
        <p className="text-gray-500 font-medium">{dateStr}</p>
      </div>

      {alerts.length > 0 && (
        <div className="mb-8 space-y-3">
          {alerts.map((alert, i) => (
            <div key={i} className={`p-4 rounded-xl border-l-4 shadow-sm flex items-center gap-4 ${alert.type === 'MISSED' ? 'bg-red-50 border-red-500 text-red-800' : 'bg-amber-50 border-amber-500 text-amber-800'}`}>
              <AlertTriangle className={alert.type === 'MISSED' ? 'text-red-500' : 'text-amber-500'} />
              <div>
                <p className="font-bold uppercase text-xs tracking-wider">{alert.type} MEDICATION</p>
                <p className="text-sm font-medium">
                  {alert.studentName} — {alert.medicineName}
                  {alert.type === 'MISSED' ? ` was due ${alert.dueTime}` : ` given at ${alert.timeGiven}, was due ${alert.dueTime}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Link
          to="/matron/students"
          className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center group hover:border-coha-500 transition-all"
        >
          <div className="w-20 h-20 bg-coha-100 text-coha-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <GraduationCap size={40} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Students</h2>
          <p className="text-sm text-gray-500 mt-2">View student list and log daily care</p>
          <div className="mt-6 flex items-center gap-2 text-coha-600 font-bold text-sm uppercase tracking-widest">
            Go to list <ChevronRight size={16} />
          </div>
        </Link>
      </div>
    </div>
  );
};
