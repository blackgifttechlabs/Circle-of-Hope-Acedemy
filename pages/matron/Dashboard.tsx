import React, { useEffect, useState } from 'react';
import {
  Users, GraduationCap, AlertCircle, Clock, CheckCircle,
  BarChart2, Activity, HeartPulse, ChevronRight, TrendingUp, Bell
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import {
  getMatronAlerts, getStudents, getAllMatronLogs,
  getMedicationAdministrationsToday, getAllStudentMedications, dismissMatronAlert
} from '../../services/dataService';
import { Loader } from '../../components/ui/Loader';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg">
      <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-black" style={{ color: p.color }}>
          {p.value} {p.name}
        </p>
      ))}
    </div>
  );
};

export const MatronDashboard: React.FC<{ user: any }> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  const handleDismissAlert = async (alertId: string) => {
    const success = await dismissMatronAlert(alertId);
    if (success) {
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    }
  };

  const fetchData = async () => {
    const [alertsData, studentsData, logsData, adminsToday, allMeds] = await Promise.all([
      getMatronAlerts(),
      getStudents(),
      getAllMatronLogs(new Date(new Date().setHours(0,0,0,0))),
      getMedicationAdministrationsToday(),
      getAllStudentMedications()
    ]);

    setAlerts(alertsData);

    // Process stats for charts
    const compliance = {
      onTime: adminsToday.filter(a => a.was_on_time).length,
      late: adminsToday.filter(a => !a.was_on_time).length,
      missed: alertsData.filter(a => a.type === 'MISSED').length
    };

    const categoryData = logsData.reduce((acc: any, log) => {
      const cat = log.category.replace('_', ' ');
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    const chartData = Object.entries(categoryData).map(([name, value]) => ({ name, value }));
    const pieData = [
      { name: 'On Time', value: compliance.onTime, color: '#10b981' },
      { name: 'Late', value: compliance.late, color: '#f59e0b' },
      { name: 'Missed', value: compliance.missed, color: '#f43f5e' }
    ].filter(d => d.value > 0);

    setStats({
      totalStudents: studentsData.length,
      logsToday: logsData.length,
      medsDue: allMeds.length,
      medsGiven: adminsToday.length,
      chartData,
      pieData
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <Loader />;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10 font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,800;9..40,900&display=swap');
        .matron-grid { display: grid; grid-template-columns: 1fr 320px; gap: 24px; }
        @media (max-width: 1100px) { .matron-grid { grid-template-columns: 1fr; } }
      `}</style>

      {/* HEADER */}
      <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Academy Matron Portal</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Good morning, {user?.name}</h1>
          <p className="text-sm font-bold text-slate-500">{dateStr}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/matron/students" className="bg-coha-900 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-coha-900/20 hover:scale-105 transition-transform flex items-center gap-2">
            <GraduationCap size={18} /> Manage Students
          </Link>
          <button className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm text-slate-500 relative">
            <Bell size={20} />
            {alerts.length > 0 && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />}
          </button>
        </div>
      </div>

      <div className="matron-grid">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* STATS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Students', val: stats.totalStudents, icon: <Users size={20} />, color: '#6366f1', bg: '#eef2ff' },
              { label: 'Care Logs Today', val: stats.logsToday, icon: <Activity size={20} />, color: '#10b981', bg: '#f0fdf4' },
              { label: 'Meds Compliance', val: `${Math.round((stats.medsGiven / (stats.medsDue || 1)) * 100)}%`, icon: <HeartPulse size={20} />, color: '#f43f5e', bg: '#fff1f2' }
            ].map((s, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-xl" style={{ backgroundColor: s.bg, color: s.color }}>{s.icon}</div>
                  <span className="text-[10px] font-black text-green-500 bg-green-50 px-2 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                    <TrendingUp size={10} /> Active
                  </span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{s.label}</p>
                <p className="text-3xl font-black text-slate-800 tracking-tighter leading-none">{s.val}</p>
              </div>
            ))}
          </div>

          {/* ALERTS */}
          {alerts.length > 0 ? (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="text-red-500" size={18} />
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Critical Alerts</h2>
              </div>
              <div className="space-y-3">
                {alerts.map((alert, i) => (
                  <div key={i} className={`p-4 rounded-xl flex items-center gap-4 ${alert.type === 'MISSED' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${alert.type === 'MISSED' ? 'bg-red-100' : 'bg-amber-100'}`}>
                      <HeartPulse size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{alert.type} Medication</p>
                      <p className="text-sm font-bold">{alert.studentName} — {alert.medicineName}</p>
                      <p className="text-xs font-medium opacity-80">
                        {alert.type === 'MISSED' ? `Due between ${alert.dueTime}` : `Given at ${alert.timeGiven}, was due ${alert.dueTime}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleDismissAlert(alert.id)} className="p-1 hover:bg-black/5 rounded-lg transition-colors text-current opacity-40 hover:opacity-100">
                        <X size={18} />
                      </button>
                      <Link to={`/matron/students`} className="text-slate-400 hover:text-slate-900 transition-colors">
                        <ChevronRight size={20} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-green-50 p-6 rounded-2xl border border-green-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                <CheckCircle size={24} />
              </div>
              <div>
                <p className="text-green-800 font-black text-sm uppercase tracking-widest">All Clear</p>
                <p className="text-green-700 text-xs font-bold">All medications administered on time today.</p>
              </div>
            </div>
          )}

          {/* ACTIVITY CHART */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Care Activity Today</h2>
                <p className="text-xs font-bold text-slate-400">Records by category</p>
              </div>
              <BarChart2 className="text-slate-300" />
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chartData} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', radius: 8 }} />
                  <Bar dataKey="value" name="Logs" radius={[6, 6, 0, 0]}>
                    {stats.chartData.map((_: any, i: number) => (
                      <Cell key={i} fill={['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#ec4899'][i % 6]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* MEDICATION DONUT */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-6">Meds Performance</h2>
            <div className="h-[200px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.pieData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.pieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-800">{stats.medsGiven}</span>
                <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Total Given</span>
              </div>
            </div>
            <div className="mt-6 space-y-2">
              {stats.pieData.map((d: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-slate-500">{d.name}</span>
                  </div>
                  <span className="text-slate-800">{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* QUICK LINKS */}
          <div className="bg-[#0f172a] p-6 rounded-2xl shadow-xl shadow-slate-900/20 text-white">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Quick Actions</p>
            <div className="space-y-2">
              <Link to="/matron/students" className="w-full flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <HeartPulse size={18} className="text-red-400" />
                  <span className="text-xs font-black uppercase tracking-widest">Log Medication</span>
                </div>
                <ChevronRight size={16} className="text-slate-600" />
              </Link>
              <Link to="/matron/settings" className="w-full flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <Clock size={18} className="text-blue-400" />
                  <span className="text-xs font-black uppercase tracking-widest">Settings</span>
                </div>
                <ChevronRight size={16} className="text-slate-600" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
