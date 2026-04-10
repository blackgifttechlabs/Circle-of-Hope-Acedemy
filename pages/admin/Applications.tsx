import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApplications, getPendingActionCounts } from '../../services/dataService';
import { Application } from '../../types';
import { Search, CreditCard } from 'lucide-react';

export const ApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'REJECTED'>('PENDING');
  const navigate = useNavigate();
  
  const [counts, setCounts] = useState({ pendingApps: 0, pendingVerifications: 0, pendingVtcApps: 0, total: 0 });

  useEffect(() => {
    loadData();
    getPendingActionCounts().then(setCounts);
  }, []);

  const loadData = async () => {
    const data = await getApplications();
    setApplications(data);
  };

  const filteredApps = applications.filter(app => {
      const matchesSearch = (() => {
        const fullName = `${app.firstName} ${app.surname}`.toLowerCase();
        const parent = (app.fatherName || app.motherName || '').toLowerCase();
        const term = searchTerm.toLowerCase();
        return fullName.includes(term) || parent.includes(term) || (app.grade || '').toLowerCase().includes(term);
      })();
      return matchesSearch && app.status === statusFilter;
  });

  return (
    <div>
      <div className="mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-coha-900">Admission Portal</h2>
            <p className="text-gray-600">Review learner applications. Payment-proof approvals are now handled from the dedicated payments page.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-wrap bg-white shadow-sm border border-gray-200">
                <button onClick={() => setStatusFilter('PENDING')} className={`px-4 py-2 text-sm font-bold uppercase flex items-center gap-2 ${statusFilter === 'PENDING' ? 'bg-coha-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                    New Apps {counts.pendingApps > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{counts.pendingApps}</span>}
                </button>
                <button onClick={() => setStatusFilter('REJECTED')} className={`px-4 py-2 text-sm font-bold uppercase ${statusFilter === 'REJECTED' ? 'bg-coha-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                    Rejected
                </button>
            </div>
            <button
              onClick={() => navigate('/admin/payments')}
              className="px-4 py-2 text-sm font-bold uppercase bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm flex items-center gap-2 transition-colors"
            >
              <CreditCard size={16} /> Pending Payments
              {counts.pendingVerifications > 0 && <span className="bg-white text-emerald-700 text-[10px] px-1.5 rounded-full">{counts.pendingVerifications}</span>}
            </button>
            <button onClick={() => navigate('/admin/vtc-applications')} className="px-4 py-2 text-sm font-bold uppercase bg-purple-600 text-white hover:bg-purple-700 shadow-sm flex items-center gap-2 transition-colors">
                VTC Applications
                {counts.pendingVtcApps > 0 && <span className="bg-white text-purple-600 text-[10px] px-1.5 rounded-full">{counts.pendingVtcApps}</span>}
            </button>
        </div>
      </div>
      <div className="bg-white border border-gray-200 shadow-sm animate-fade-in">
         <div className="p-4 border-b border-gray-200">
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input className="w-full pl-10 pr-4 py-2 border border-gray-300 outline-none" placeholder="Search applications..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                    <tr>
                        <th className="px-6 py-4">ID</th>
                        <th className="px-6 py-4">Learner</th>
                        <th className="px-6 py-4">Class Applied</th>
                        <th className="px-6 py-4">Parent</th>
                        <th className="px-6 py-4">Submitted</th>
                        <th className="px-6 py-4">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredApps.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 group">
                            <td className="px-6 py-4 font-mono text-xs text-gray-400">{item.id}</td>
                            <td className="px-6 py-4 font-bold text-coha-900">{item.firstName} {item.surname}</td>
                            <td className="px-6 py-4 font-bold text-gray-800">{item.grade || item.level || '-'}</td>
                            <td className="px-6 py-4 text-xs font-bold text-gray-600">{item.fatherName || item.motherName || '-'}</td>
                            <td className="px-6 py-4 text-xs text-gray-500">{item.submissionDate?.toDate ? item.submissionDate.toDate().toLocaleDateString() : '-'}</td>
                            <td className="px-6 py-4">
                                <button onClick={() => navigate(`/admin/applications/${item.id}`)} className="text-coha-500 font-bold hover:underline uppercase text-[10px] tracking-widest">Open</button>
                            </td>
                        </tr>
                    ))}
                    {filteredApps.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                          No applications found for this filter.
                        </td>
                      </tr>
                    )}
                </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};
