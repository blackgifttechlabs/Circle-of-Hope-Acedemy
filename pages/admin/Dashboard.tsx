import React, { useEffect, useState } from 'react';
import { Users, GraduationCap, DollarSign, Activity, FileText, AlertCircle, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getDashboardStats } from '../../services/dataService';
import { Loader } from '../../components/ui/Loader';

const StatCard: React.FC<{ 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  color: string; 
  onClick?: () => void;
  isClickable?: boolean;
}> = ({ title, value, icon, color, onClick, isClickable }) => (
  <div 
    onClick={onClick}
    className={`bg-white p-4 md:p-6 border-b-4 border-coha-900 shadow-sm flex flex-col justify-between h-full ${isClickable ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}`}
  >
    <div className="flex items-center justify-between mb-2 md:mb-4">
      <div className={`p-2 md:p-3 bg-${color}-100 text-${color}-600 rounded-none scale-90 md:scale-100 origin-left`}>
        {icon}
      </div>
      <span className="text-green-500 text-xs md:text-sm font-bold flex items-center">
        <Activity size={12} className="mr-1" /> <span className="hidden md:inline">Active</span>
      </span>
    </div>
    <div>
      <h3 className="text-gray-500 text-xs md:text-sm font-bold uppercase tracking-wider truncate">{title}</h3>
      <p className="text-xl md:text-3xl font-bold text-coha-900 mt-1">{value}</p>
    </div>
  </div>
);

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDefaulters, setShowDefaulters] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      const data = await getDashboardStats();
      setStats(data);
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      <div className="mb-4 md:mb-8">
        <h2 className="text-2xl font-bold text-coha-900">Dashboard Overview</h2>
        <p className="text-gray-600">Welcome back, Admin.</p>
      </div>

      {/* Stats Grid - 2 columns on mobile, 4 on large screens */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard 
          title="Students" 
          value={stats?.totalStudents.toString() || '0'} 
          icon={<GraduationCap size={24} className="text-coha-500"/>} 
          color="blue" 
        />
        <StatCard 
          title="Teachers" 
          value={stats?.totalTeachers.toString() || '0'} 
          icon={<Users size={24} className="text-coha-500"/>} 
          color="blue" 
        />
        <StatCard 
          title="Exp. Revenue" 
          value={`N$ ${(stats?.expectedRevenue || 0).toLocaleString()}`} 
          icon={<DollarSign size={24} className="text-green-600"/>} 
          color="green" 
        />
        <StatCard 
          title="Outstanding Fees" 
          value={`N$ ${(stats?.outstandingRevenue || 0).toLocaleString()}`} 
          icon={<AlertCircle size={24} className="text-red-600"/>} 
          color="red" 
          isClickable={true}
          onClick={() => setShowDefaulters(true)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 md:p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-coha-900 mb-6">Enrollment Trends</h3>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.graphData || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" interval={0} />
                <YAxis allowDecimals={false} />
                <Tooltip cursor={{fill: '#f0f9ff'}} />
                <Bar dataKey="students" fill="#001d64" name="New Students" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-coha-900 mb-6">Recent Applications</h3>
          <div className="space-y-4">
            {stats?.recentActivities && stats.recentActivities.length > 0 ? (
              stats.recentActivities.map((activity: any, i: number) => (
                <div key={i} className="flex items-start gap-4 border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-100 flex items-center justify-center text-coha-500 font-bold shrink-0">
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 text-sm md:text-base">{activity.title}</p>
                    <p className="text-xs md:text-sm text-gray-500 truncate">{activity.desc}</p>
                  </div>
                  <span className="ml-auto text-[10px] md:text-xs text-gray-400 whitespace-nowrap">{activity.time}</span>
                </div>
              ))
            ) : (
               <p className="text-gray-500 text-sm italic">No recent activity.</p>
            )}
          </div>
        </div>
      </div>

      {/* Defaulters Modal */}
      {showDefaulters && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white w-full max-w-3xl shadow-2xl max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <div>
                        <h3 className="text-xl font-bold text-red-600 flex items-center gap-2">
                            <AlertCircle size={24} /> Outstanding Payments
                        </h3>
                        <p className="text-gray-500 text-sm mt-1">Students with pending fee payments.</p>
                    </div>
                    <button onClick={() => setShowDefaulters(false)} className="text-gray-500 hover:text-gray-900">
                        <X size={24} />
                    </button>
                </div>
                <div className="p-0 overflow-y-auto flex-1">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="p-4 text-xs font-bold uppercase text-gray-600">Student Name</th>
                                <th className="p-4 text-xs font-bold uppercase text-gray-600">Grade</th>
                                <th className="p-4 text-xs font-bold uppercase text-gray-600">Parent</th>
                                <th className="p-4 text-xs font-bold uppercase text-gray-600">Contact</th>
                                <th className="p-4 text-xs font-bold uppercase text-gray-600">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {stats?.defaulters && stats.defaulters.length > 0 ? (
                                stats.defaulters.map((student: any) => (
                                    <tr key={student.id} className="hover:bg-red-50">
                                        <td className="p-4 font-bold text-coha-900">{student.name}</td>
                                        <td className="p-4">{student.grade}</td>
                                        <td className="p-4">{student.parentName}</td>
                                        <td className="p-4 font-mono text-xs">{student.parentPhone}</td>
                                        <td className="p-4">
                                            <span className="bg-red-100 text-red-700 px-2 py-1 text-xs font-bold uppercase">Unpaid</span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">No outstanding payments found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-gray-200 bg-gray-50 text-right">
                    <button 
                        onClick={() => setShowDefaulters(false)}
                        className="px-6 py-2 bg-coha-900 text-white hover:bg-coha-800 font-bold"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};