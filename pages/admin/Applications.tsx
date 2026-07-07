import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApplications } from '../../services/dataService';
import { Application } from '../../types';
import { Search, MoreHorizontal, ListChecks, CreditCard, Hash, User, GraduationCap, Users, CalendarDays, BadgeCheck, MousePointerClick } from 'lucide-react';
import { ApplicationWorkspace } from '../../components/admin/ApplicationWorkspace';
import { getAdminApplicationUnreadCounts } from '../../utils/adminApplicationNotifications';
import { TableHeaderCell, TableSkeletonRows } from '../../components/ui/TablePrimitives';

export const ApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'REJECTED'>('PENDING');
  const [pendingPaymentCount, setPendingPaymentCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    getAdminApplicationUnreadCounts('admin').then((counts) => setPendingPaymentCount(counts.payments));
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await getApplications();
    setApplications(data);
    setLoading(false);
  };

  const filteredApps = applications.filter(app => {
      const matchesSearch = (() => {
        const fullName = `${app.firstName} ${app.surname}`.toLowerCase();
        const parent = (app.fatherName || app.motherName || '').toLowerCase();
        const term = searchTerm.toLowerCase();
        return (
          fullName.includes(term) ||
          parent.includes(term) ||
          (app.id || '').toLowerCase().includes(term) ||
          (app.status || '').toLowerCase().includes(term) ||
          (app.grade || '').toLowerCase().includes(term) ||
          (app.level || '').toLowerCase().includes(term)
        );
      })();
      return matchesSearch && app.status === statusFilter;
  });

  const pendingCount = applications.filter((item) => item.status === 'PENDING').length;
  const rejectedCount = applications.filter((item) => item.status === 'REJECTED').length;

  return (
    <ApplicationWorkspace activeTab="student">

         <div className="apps-toolbar" style={{ paddingTop: '76px' }}>
            <div className="apps-search-wrap" style={{ marginRight: 'auto' }}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  className="apps-search-input"
                  placeholder="Filter applications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="apps-tabs" style={{ marginLeft: 'auto', justifyContent: 'flex-end' }}>
              <button
                className={`apps-tab ${statusFilter === 'PENDING' ? 'active' : ''}`}
                onClick={() => setStatusFilter('PENDING')}
              >
                <ListChecks size={16} />
                Student Apps <span className={`pill ${pendingCount === 0 ? 'zero' : ''}`}>{pendingCount}</span>
              </button>
              <button
                className={`apps-tab ${statusFilter === 'REJECTED' ? 'active' : ''}`}
                onClick={() => setStatusFilter('REJECTED')}
              >
                Rejected <span className={`pill ${rejectedCount === 0 ? 'zero' : ''}`}>{rejectedCount}</span>
              </button>
              <button className="apps-tab" onClick={() => navigate('/admin/payments')}>
                <CreditCard size={16} />
                Pending Payments
                <span className={`pill ${pendingPaymentCount === 0 ? 'zero' : ''}`}>{pendingPaymentCount}</span>
              </button>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="apps-table">
                <thead>
                    <tr>
                        <TableHeaderCell icon={ListChecks} className="!w-9"><input type="checkbox" className="apps-checkbox" disabled /></TableHeaderCell>
                        <TableHeaderCell icon={Hash}>ID</TableHeaderCell>
                        <TableHeaderCell icon={User}>Learner</TableHeaderCell>
                        <TableHeaderCell icon={GraduationCap}>Class Applied</TableHeaderCell>
                        <TableHeaderCell icon={Users}>Parent</TableHeaderCell>
                        <TableHeaderCell icon={CalendarDays}>Submitted</TableHeaderCell>
                        <TableHeaderCell icon={BadgeCheck}>Status</TableHeaderCell>
                        <TableHeaderCell icon={MousePointerClick}>Action</TableHeaderCell>
                        <TableHeaderCell icon={MoreHorizontal} className="!w-9"></TableHeaderCell>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                      <TableSkeletonRows rows={10} columns={9} showCheckbox />
                    ) : filteredApps.map((item) => (
                        <tr key={item.id}>
                            <td>
                              <input type="checkbox" className="apps-checkbox" />
                            </td>
                            <td className="apps-id">{item.id}</td>
                            <td className="apps-name">{item.firstName} {item.surname}</td>
                            <td className="font-bold text-gray-800">{item.grade || item.level || '-'}</td>
                            <td className="text-xs font-bold text-gray-600">{item.fatherName || item.motherName || '-'}</td>
                            <td className="text-xs text-gray-500">{item.submissionDate?.toDate ? item.submissionDate.toDate().toLocaleDateString() : '-'}</td>
                            <td>
                              <span className={`status-dot-wrap ${statusFilter === 'REJECTED' ? 'status-rejected' : 'status-pending'}`}>
                                <span className="status-dot"></span>
                                {statusFilter === 'REJECTED' ? 'REJECTED' : 'PENDING'}
                              </span>
                            </td>
                            <td>
                                <button onClick={() => navigate(`/admin/applications/${item.id}`)} className="apps-open-btn">Open</button>
                            </td>
                            <td>
                              <span className="apps-row-menu"><MoreHorizontal size={16} /></span>
                            </td>
                        </tr>
                    ))}
                    {!loading && filteredApps.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-6 py-10 text-center text-sm text-gray-500">
                          No applications found for this filter.
                        </td>
                      </tr>
                    )}
                </tbody>
            </table>
         </div>
    </ApplicationWorkspace>
  );
};
