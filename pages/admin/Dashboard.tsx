import React, { useEffect, useState } from 'react';
import {
  Users, GraduationCap, DollarSign, AlertCircle, X,
  TrendingUp, TrendingDown, ArrowRight, Bell, ChevronRight,
  BookOpen, Activity, BarChart2, Banknote, Clock, CheckCircle,
  ShieldCheck, Edit2, Trash2, History, Save
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import {
  getDashboardStats,
  createSubAdmin,
  getSystemSettings,
  getActivityLogs,
  updateAdminAccount,
  deleteSubAdmin,
  addMatron,
} from '../../services/dataService';
import { Loader } from '../../components/ui/Loader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ActivityLog, SystemSettings } from '../../types';

/* ─── Avatar ─── */
const Av = ({ name, imageUrl, size = 36 }: { name: string; imageUrl?: string; size?: number }) => {
  const palette = ['#6366f1','#f59e0b','#10b981','#ec4899','#3b82f6','#8b5cf6','#06b6d4'];
  const bg = palette[(name.charCodeAt(0) + (name.charCodeAt(1)||0)) % palette.length];
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', flexShrink:0, border:'1px solid #e2e8f0' }}
      />
    );
  }
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:bg, flexShrink:0,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:size*0.38, fontWeight:900, color:'white' }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

/* ─── Custom tooltip for charts ─── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:10,
      padding:'10px 14px', boxShadow:'0 4px 16px rgba(0,0,0,.08)' }}>
      <p style={{ fontSize:11, fontWeight:800, color:'#94a3b8', textTransform:'uppercase',
        letterSpacing:'.08em', margin:'0 0 4px' }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ fontSize:14, fontWeight:900, color:p.color || '#6366f1', margin:0 }}>
          {p.value} {p.name}
        </p>
      ))}
    </div>
  );
};

const WeeklyPaymentTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  return (
    <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:10,
      padding:'10px 14px', boxShadow:'0 4px 16px rgba(0,0,0,.08)' }}>
      <p style={{ fontSize:11, fontWeight:900, color:'#0f172a', margin:'0 0 4px' }}>
        {item?.range || payload[0]?.name}
      </p>
      <p style={{ fontSize:13, fontWeight:900, color:'#10b981', margin:0 }}>
        N$ {(payload[0]?.value || 0).toLocaleString()} fees paid
      </p>
      <p style={{ fontSize:10, fontWeight:700, color:'#94a3b8', margin:'4px 0 0' }}>
        {item?.receipts || 0} receipt{item?.receipts === 1 ? '' : 's'}
      </p>
    </div>
  );
};

/* ─── Ring mini chart ─── */
const Ring = ({ pct, color, size=60 }: { pct:number; color:string; size?:number }) => {
  const r = (size-8)/2, circ = 2*Math.PI*r;
  return (
    <svg width={size} height={size} style={{ transform:'rotate(-90deg)', flexShrink:0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={6}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${(pct/100)*circ} ${circ}`} strokeLinecap="round"
        style={{ transition:'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)' }}/>
    </svg>
  );
};

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDefaulters, setShowDefaulters] = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [showAdmins, setShowAdmins] = useState(false);
  const [adminSettings, setAdminSettings] = useState<SystemSettings | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [editAdmin, setEditAdmin] = useState<{ id: string; name: string; pin: string; roleLabel: string } | null>(null);
  const [deleteAdmin, setDeleteAdmin] = useState<{ id: string; name: string } | null>(null);
  const [activityAdmin, setActivityAdmin] = useState<{ id: string; name: string; roleLabel: string } | null>(null);
  const [editAdminForm, setEditAdminForm] = useState({ name: '', pin: '' });
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [adminActionMessage, setAdminActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedRevenueWeekIndex, setSelectedRevenueWeekIndex] = useState(0);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPin, setNewAdminPin] = useState('');
  const [createAdminLoading, setCreateAdminLoading] = useState(false);
  const [createAdminError, setCreateAdminError] = useState('');
  const [createAdminSuccess, setCreateAdminSuccess] = useState('');
  const [showCreateMatron, setShowCreateMatron] = useState(false);
  const [newMatronName, setNewMatronName] = useState('');
  const [newMatronPin, setNewMatronPin] = useState('');
  const [confirmMatronPin, setConfirmMatronPin] = useState('');
  const [createMatronLoading, setCreateMatronLoading] = useState(false);
  const [createMatronError, setCreateMatronError] = useState('');
  const [createMatronSuccess, setCreateMatronSuccess] = useState('');

  const refreshStats = async () => {
    const data = await getDashboardStats();
    setStats(data);
    setLoading(false);
  };

  const loadAdminData = async () => {
    const [settingsData, logsData] = await Promise.all([
      getSystemSettings(),
      getActivityLogs(2000),
    ]);
    setAdminSettings(settingsData);
    setActivityLogs(logsData);
  };

  useEffect(() => {
    refreshStats();

    const handleFocus = () => refreshStats();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'coha_student_profile_image_update') refreshStats();
    };
    const handleCustomProfileImageUpdate = () => refreshStats();

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('coha-student-profile-image-update', handleCustomProfileImageUpdate);
    const interval = setInterval(refreshStats, 30000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('coha-student-profile-image-update', handleCustomProfileImageUpdate);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const weeks = stats?.weeklyPaymentData || [];
    if (!weeks.length) return;
    const now = new Date();
    const currentWeekIndex = weeks.findIndex((week: any) => {
      const start = new Date(week.startDate);
      const end = new Date(week.endDate);
      return now >= start && now <= end;
    });
    setSelectedRevenueWeekIndex(currentWeekIndex >= 0 ? currentWeekIndex : 0);
  }, [stats?.weeklyPaymentData?.length]);

  if (loading) return <Loader />;

  const handleCreateMatron = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMatronLoading(true);
    setCreateMatronError('');
    setCreateMatronSuccess('');

    if (newMatronPin.length !== 4 || isNaN(Number(newMatronPin))) {
      setCreateMatronError('PIN must be a 4-digit number.');
      setCreateMatronLoading(false);
      return;
    }

    if (newMatronPin !== confirmMatronPin) {
      setCreateMatronError('PINs do not match.');
      setCreateMatronLoading(false);
      return;
    }

    const result = await addMatron(newMatronName, newMatronPin, adminSettings?.adminName || 'Admin');
    if (result) {
      setCreateMatronSuccess('Matron created successfully.');
      setNewMatronName('');
      setNewMatronPin('');
      setConfirmMatronPin('');
      setTimeout(() => {
        setShowCreateMatron(false);
        setCreateMatronSuccess('');
      }, 2000);
    } else {
      setCreateMatronError('Failed to create matron.');
    }
    setCreateMatronLoading(false);
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateAdminLoading(true);
    setCreateAdminError('');
    setCreateAdminSuccess('');

    if (newAdminPin.length < 4) {
      setCreateAdminError('PIN must be at least 4 characters long.');
      setCreateAdminLoading(false);
      return;
    }

    const result = await createSubAdmin(newAdminName, newAdminPin);
    if (result.success) {
      setCreateAdminSuccess(result.message);
      setNewAdminName('');
      setNewAdminPin('');
      await loadAdminData();
      setTimeout(() => {
        setShowCreateAdmin(false);
        setCreateAdminSuccess('');
      }, 2000);
    } else {
      setCreateAdminError(result.message);
    }
    setCreateAdminLoading(false);
  };

  const openAdminsModal = async () => {
    setShowAdmins(true);
    setAdminActionMessage(null);
    await loadAdminData();
  };

  const adminRows = [
    {
      id: 'admin',
      name: adminSettings?.adminName || 'Main Admin',
      pin: adminSettings?.adminPin || '',
      roleLabel: 'Main Admin',
      canDelete: false,
    },
    ...((adminSettings?.admins || []).map((admin) => ({
      id: admin.id,
      name: admin.name,
      pin: admin.pin,
      roleLabel: 'Sub Admin',
      canDelete: true,
    }))),
  ];

  const getLogsForAdmin = (admin: { id: string; name: string }) => (
    activityLogs.filter((log) => (
      log.actorId === admin.id ||
      log.actorName === admin.name ||
      (admin.id === 'admin' && log.actorId === 'admin')
    ))
  );

  const openEditAdmin = (admin: { id: string; name: string; pin: string; roleLabel: string }) => {
    setEditAdmin(admin);
    setEditAdminForm({ name: admin.name, pin: admin.pin });
    setAdminActionMessage(null);
  };

  const handleSaveAdmin = async () => {
    if (!editAdmin) return;
    setAdminActionLoading(true);
    setAdminActionMessage(null);
    const result = await updateAdminAccount(editAdmin.id, editAdminForm.name, editAdminForm.pin, adminSettings?.adminName || 'Main admin');
    setAdminActionLoading(false);

    if (!result.success) {
      setAdminActionMessage({ type: 'error', text: result.message });
      return;
    }

    setAdminActionMessage({ type: 'success', text: result.message });
    setEditAdmin(null);
    await loadAdminData();
  };

  const handleDeleteAdmin = async () => {
    if (!deleteAdmin) return;
    setAdminActionLoading(true);
    setAdminActionMessage(null);
    const result = await deleteSubAdmin(deleteAdmin.id, adminSettings?.adminName || 'Main admin');
    setAdminActionLoading(false);

    if (!result.success) {
      setAdminActionMessage({ type: 'error', text: result.message });
      return;
    }

    setAdminActionMessage({ type: 'success', text: result.message });
    setDeleteAdmin(null);
    await loadAdminData();
  };

  const totalStudents   = stats?.totalStudents || 0;
  const totalTeachers   = stats?.totalTeachers || 0;
  const expectedRev     = stats?.expectedRevenue || 0;
  const outstanding     = stats?.outstandingRevenue || 0;
  const collected       = expectedRev - outstanding;
  const collectionPct   = expectedRev > 0 ? Math.round((collected / expectedRev) * 100) : 0;
  const defaulterCount  = stats?.defaulters?.length || 0;
  const weeklyPaymentData = stats?.weeklyPaymentData || [];
  const selectedRevenueWeek = weeklyPaymentData[selectedRevenueWeekIndex] || weeklyPaymentData[0] || {
    range: 'No term weeks',
    paid: 0,
    receipts: 0,
    name: '-',
  };
  const termPaymentsTotal = weeklyPaymentData.reduce((sum: number, week: any) => sum + (week.paid || 0), 0);

  /* bar chart colours per bar */
  const barColors = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ec4899',
                     '#3b82f6','#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b'];

  /* fee health donut data for small display */
  const feeHealth = [
    { label:'Collected', val: collected, color:'#10b981', pct: collectionPct },
    { label:'Outstanding', val: outstanding, color:'#f43f5e', pct: 100-collectionPct },
  ];

  const card: React.CSSProperties = {
    background:'white', borderRadius:16,
    boxShadow:'0 1px 4px rgba(0,0,0,.05), 0 6px 20px rgba(0,0,0,.04)',
    overflow:'hidden',
  };

  return (
    <div style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif",
      background:'#f8fafc', color:'#1e293b', minHeight:'100vh' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,800;9..40,900&display=swap');
        .adg{display:grid;grid-template-columns:1fr 300px;gap:20px}
        .asg{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
        .amg{display:grid;grid-template-columns:1fr 1fr;gap:18px}
        @media(max-width:1100px){.adg{grid-template-columns:1fr}}
        @media(max-width:900px){.asg{grid-template-columns:repeat(2,1fr)}.amg{grid-template-columns:1fr}}
        @media(max-width:480px){.asg{grid-template-columns:1fr}}
        .ahrow:hover{background:#f8fafc}
        .ahrow{transition:background .14s;cursor:pointer}
        .abp{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:9px;
          font-weight:900;font-size:11px;letter-spacing:.07em;text-transform:uppercase;
          cursor:pointer;border:none;transition:filter .15s,transform .12s;color:white}
        .abp:hover{filter:brightness(.9);transform:translateY(-1px)}
        .abo{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:9px;
          font-weight:900;font-size:11px;letter-spacing:.07em;text-transform:uppercase;
          cursor:pointer;background:white;border:1.5px solid #e2e8f0;color:#334155;
          transition:border-color .15s,transform .12s}
        .abo:hover{border-color:#6366f1;color:#6366f1;transform:translateY(-1px)}
        .aai{display:flex;align-items:flex-start;gap:12px;padding:12px 0;
          border-bottom:1px solid #f8fafc}
        .aai:last-child{border-bottom:none}
        th.ath{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;
          color:#94a3b8;padding:11px 16px;border-bottom:1px solid #f1f5f9;text-align:left;white-space:nowrap}
        td.atd{padding:12px 16px;font-size:13px}
        @media(max-width:600px){td.atd,th.ath{padding:9px 10px;font-size:11px}.ahm{display:none}}
        .fadeup{animation:fadeup .4s ease both}
        @keyframes fadeup{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        .delay1{animation-delay:.05s}.delay2{animation-delay:.1s}
        .delay3{animation-delay:.15s}.delay4{animation-delay:.2s}
      `}</style>

      {/* ══ HEADER ══ */}
      <div style={{ padding:'24px 24px 0', display:'flex', justifyContent:'space-between',
        alignItems:'flex-start', flexWrap:'wrap', gap:12, marginBottom:20 }}>
        <div>
          <p style={{ fontSize:10, fontWeight:800, letterSpacing:'.18em',
            textTransform:'uppercase', color:'#94a3b8', margin:'0 0 4px' }}>
            Academic Year 2025–2026
          </p>
          <h1 style={{ fontSize:26, fontWeight:900, letterSpacing:-1.5,
            color:'#0f172a', lineHeight:1, margin:'0 0 4px' }}>
            Admin Dashboard
          </h1>
          <p style={{ fontSize:12, color:'#64748b', fontWeight:600, margin:0 }}>
            Circle of Hope Private Academy · Overview
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Button
            onClick={() => setShowCreateMatron(true)}
            className="!bg-coha-600 hover:!bg-coha-500 text-white !py-2 !px-4 !rounded-lg !text-sm !font-bold"
          >
            Add Matron
          </Button>
          <Button 
            onClick={() => setShowCreateAdmin(true)}
            className="!bg-coha-900 hover:!bg-coha-800 text-white !py-2 !px-4 !rounded-lg !text-sm !font-bold"
          >
            Create Admin
          </Button>
          <Button 
            onClick={openAdminsModal}
            variant="outline"
            className="!py-2 !px-4 !rounded-lg !text-sm !font-bold"
          >
            <ShieldCheck size={16} /> View Admins
          </Button>
          <button style={{ background:'white', border:'1.5px solid #e2e8f0', borderRadius:10,
            width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', position:'relative' }}>
            <Bell size={16} color="#64748b"/>
            {defaulterCount > 0 && (
              <span style={{ position:'absolute', top:7, right:7, width:8, height:8,
                background:'#f43f5e', borderRadius:'50%', border:'2px solid white' }}/>
            )}
          </button>
          <div style={{ background:'white', border:'1.5px solid #e2e8f0', borderRadius:10,
            padding:'6px 14px 6px 10px', display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#0f172a,#6366f1)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:13, fontWeight:900, color:'white' }}>A</div>
            <div>
              <p style={{ fontSize:12, fontWeight:800, color:'#0f172a', margin:0, lineHeight:1.1 }}>Admin</p>
              <p style={{ fontSize:10, color:'#94a3b8', fontWeight:600, margin:0 }}>Administrator</p>
            </div>
          </div>
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div style={{ padding:'0 24px 48px' }}>
        <div className="adg">

          {/* ════ LEFT ════ */}
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

            {/* STAT CARDS */}
            <div className="asg">
              {[
                {
                  label:'Total Students', val: totalStudents,
                  sub: `${stats?.graphData?.slice(-1)[0]?.students || 0} this month`,
                  icon:<GraduationCap size={18}/>, color:'#6366f1', bg:'#eef2ff',
                  trend:true, cls:'fadeup'
                },
                {
                  label:'Teaching Staff', val: totalTeachers,
                  sub: 'Active teachers',
                  icon:<Users size={18}/>, color:'#06b6d4', bg:'#ecfeff',
                  trend:true, cls:'fadeup delay1'
                },
                {
                  label:'Expected Revenue', val: `N$${(expectedRev/1000).toFixed(0)}K`,
                  sub: `N$ ${expectedRev.toLocaleString()} total`,
                  icon:<Banknote size={18}/>, color:'#10b981', bg:'#f0fdf4',
                  trend:true, cls:'fadeup delay2'
                },
                {
                  label:'Outstanding Fees', val: `N$${(outstanding/1000).toFixed(0)}K`,
                  sub: `${defaulterCount} defaulters`,
                  icon:<AlertCircle size={18}/>, color:'#f43f5e', bg:'#fff1f2',
                  trend:false, clickable:true, cls:'fadeup delay3'
                },
              ].map((c, i) => (
                <div key={i} className={c.cls}
                  onClick={c.clickable ? () => setShowDefaulters(true) : undefined}
                  style={{ ...card, padding:20, cursor: c.clickable ? 'pointer' : 'default',
                    transition:'transform .15s, box-shadow .15s',
                    ...(c.clickable ? {} : {}) }}>
                  <div style={{ display:'flex', justifyContent:'space-between',
                    alignItems:'flex-start', marginBottom:14 }}>
                    <div style={{ background:c.bg, padding:10, borderRadius:10, color:c.color }}>
                      {c.icon}
                    </div>
                    <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:10,
                      fontWeight:800, color: c.trend ? '#10b981' : '#f43f5e',
                      background: c.trend ? '#f0fdf4' : '#fff1f2',
                      padding:'3px 8px', borderRadius:20 }}>
                      {c.trend ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
                      {c.trend ? 'Up' : 'Alert'}
                    </span>
                  </div>
                  <p style={{ fontSize:9, fontWeight:800, letterSpacing:'.14em',
                    textTransform:'uppercase', color:'#94a3b8', margin:'0 0 4px' }}>
                    {c.label}
                  </p>
                  <p style={{ fontSize:28, fontWeight:900, letterSpacing:-1.2,
                    color: c.color, lineHeight:1, margin:'0 0 5px' }}>{c.val}</p>
                  <p style={{ fontSize:10, color:'#94a3b8', fontWeight:600, margin:0,
                    display:'flex', alignItems:'center', gap:3 }}>
                    {c.sub}
                    {c.clickable && <ChevronRight size={12} color="#f43f5e"/>}
                  </p>
                </div>
              ))}
            </div>

            {/* FEE HEALTH STRIP */}
            <div style={{ ...card, padding:'16px 22px', display:'flex',
              flexWrap:'wrap', gap:16, alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <p style={{ fontSize:10, fontWeight:800, letterSpacing:'.14em',
                  textTransform:'uppercase', color:'#94a3b8', margin:'0 0 2px' }}>
                  Fee Collection Health
                </p>
                <p style={{ fontSize:13, fontWeight:700, color:'#334155', margin:0 }}>
                  <span style={{ color:'#10b981', fontWeight:900 }}>N$ {collected.toLocaleString()}</span>
                  {' '}collected of{' '}
                  <span style={{ fontWeight:900 }}>N$ {expectedRev.toLocaleString()}</span>
                </p>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
                {feeHealth.map(f => (
                  <div key={f.label} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ position:'relative' }}>
                      <Ring pct={f.pct} color={f.color} size={52}/>
                      <span style={{ position:'absolute', inset:0, display:'flex', alignItems:'center',
                        justifyContent:'center', fontSize:10, fontWeight:900, color:f.color }}>
                        {f.pct}%
                      </span>
                    </div>
                    <div>
                      <p style={{ fontSize:9, fontWeight:800, textTransform:'uppercase',
                        letterSpacing:'.1em', color:'#94a3b8', margin:'0 0 1px' }}>{f.label}</p>
                      <p style={{ fontSize:13, fontWeight:900, color:f.color, margin:0 }}>
                        N$ {f.val.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div style={{ height:36, width:1, background:'#f1f5f9' }}/>
                <button className="abp" style={{ background:'#f43f5e' }}
                  onClick={() => setShowDefaulters(true)}>
                  <AlertCircle size={13}/> View Defaulters
                </button>
              </div>
            </div>

            {/* CHARTS ROW */}
            <div className="amg">

              {/* Enrollment trend */}
              <div style={{ ...card, padding:22 }}>
                <div style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:8 }}>
                  <div>
                    <p style={{ fontSize:10, fontWeight:800, letterSpacing:'.14em',
                      textTransform:'uppercase', color:'#94a3b8', margin:'0 0 4px' }}>
                      Enrollment Trends
                    </p>
                    <p style={{ fontSize:18, fontWeight:900, letterSpacing:-1,
                      color:'#0f172a', margin:0 }}>New Students by Month</p>
                  </div>
                  <span style={{ background:'#eef2ff', color:'#6366f1', fontSize:10,
                    fontWeight:800, padding:'4px 12px', borderRadius:20 }}>This Year</span>
                </div>
                <div style={{ height:200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.graphData || []} barSize={20}
                      margin={{ top:0, right:0, left:-20, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                      <XAxis dataKey="name" tick={{ fontSize:9, fill:'#94a3b8', fontWeight:700 }}
                        axisLine={false} tickLine={false}/>
                      <YAxis allowDecimals={false}
                        tick={{ fontSize:9, fill:'#94a3b8', fontWeight:700 }}
                        axisLine={false} tickLine={false}/>
                      <Tooltip content={<CustomTooltip/>} cursor={{ fill:'#f8fafc', radius:4 }}/>
                      <Bar dataKey="students" name="Students" radius={[6,6,0,0]}>
                        {(stats?.graphData || []).map((_: any, i: number) => (
                          <Cell key={i} fill={barColors[i % barColors.length]}/>
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Weekly payments chart */}
              <div style={{ ...card, padding:22 }}>
                <div style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:8 }}>
                  <div>
                    <p style={{ fontSize:10, fontWeight:800, letterSpacing:'.14em',
                      textTransform:'uppercase', color:'#94a3b8', margin:'0 0 4px' }}>
                      Revenue Overview
                    </p>
                    <p style={{ fontSize:18, fontWeight:900, letterSpacing:-1,
                      color:'#0f172a', margin:0 }}>Fees Paid by Week</p>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                    <span style={{ background:'#f0fdf4', color:'#10b981', fontSize:10,
                      fontWeight:800, padding:'4px 12px', borderRadius:20 }}>
                      {stats?.activeTermName || 'Current Term'}
                    </span>
                    <span style={{ fontSize:10, fontWeight:800, color:'#94a3b8' }}>
                      Term total: N$ {termPaymentsTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}>
                  <div style={{ background:'#0f172a', color:'white', borderRadius:999,
                    padding:'8px 14px', boxShadow:'0 10px 24px rgba(15,23,42,.18)',
                    display:'flex', alignItems:'center', gap:12, flexWrap:'wrap',
                    justifyContent:'center' }}>
                    <span style={{ fontSize:11, fontWeight:900, letterSpacing:'.08em',
                      textTransform:'uppercase', color:'#bfdbfe' }}>
                      {selectedRevenueWeek.range}
                    </span>
                    <span style={{ width:1, height:18, background:'rgba(255,255,255,.22)' }} />
                    <span style={{ fontSize:15, fontWeight:900 }}>
                      N$ {(selectedRevenueWeek.paid || 0).toLocaleString()}
                    </span>
                    <span style={{ fontSize:10, fontWeight:800, color:'rgba(255,255,255,.65)' }}>
                      {selectedRevenueWeek.receipts || 0} receipt{selectedRevenueWeek.receipts === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
                <div style={{ height:200 }}>
                  {weeklyPaymentData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyPaymentData} barSize={18}
                        margin={{ top:8, right:0, left:-20, bottom:0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                        <XAxis dataKey="name" tick={{ fontSize:9, fill:'#94a3b8', fontWeight:700 }}
                          axisLine={false} tickLine={false}/>
                        <YAxis
                          tick={{ fontSize:9, fill:'#94a3b8', fontWeight:700 }}
                          tickFormatter={(value) => `N$${Number(value || 0) / 1000}k`}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<WeeklyPaymentTooltip/>} cursor={{ fill:'#f8fafc', radius:4 }}/>
                        <Bar
                          dataKey="paid"
                          name="Fees Paid"
                          radius={[8,8,0,0]}
                          onMouseEnter={(_: any, index: number) => setSelectedRevenueWeekIndex(index)}
                          onClick={(_: any, index: number) => setSelectedRevenueWeekIndex(index)}
                        >
                          {weeklyPaymentData.map((_: any, i: number) => (
                            <Cell
                              key={i}
                              fill={i === selectedRevenueWeekIndex ? '#10b981' : '#93c5fd'}
                              stroke={i === selectedRevenueWeekIndex ? '#047857' : '#60a5fa'}
                              strokeWidth={i === selectedRevenueWeekIndex ? 2 : 0}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height:'100%', display:'flex', alignItems:'center',
                      justifyContent:'center', color:'#cbd5e1', fontSize:12,
                      fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em' }}>
                      No term payment data found.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RECENT ACTIVITY */}
            <div style={{ ...card, padding:22 }}>
              <div style={{ display:'flex', justifyContent:'space-between',
                alignItems:'center', marginBottom:18 }}>
                <div>
                  <p style={{ fontSize:10, fontWeight:800, letterSpacing:'.14em',
                    textTransform:'uppercase', color:'#94a3b8', margin:'0 0 3px' }}>
                    Recent Applications
                  </p>
                  <p style={{ fontSize:18, fontWeight:900, letterSpacing:-1,
                    color:'#0f172a', margin:0 }}>Latest Activity</p>
                </div>
                <button className="abo" style={{ fontSize:10 }}>
                  View All <ArrowRight size={12}/>
                </button>
              </div>

              {stats?.recentActivities?.length > 0 ? (
                <div>
                  {stats.recentActivities.map((a: any, i: number) => (
                    <div key={i} className="aai">
                      <div style={{ width:38, height:38, borderRadius:10, flexShrink:0,
                        background: ['#eef2ff','#f0fdf4','#fef9c3','#fff1f2','#ecfeff'][i%5],
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:14, fontWeight:900,
                        color: ['#6366f1','#10b981','#f59e0b','#f43f5e','#06b6d4'][i%5] }}>
                        {i+1}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:13, fontWeight:800, color:'#0f172a',
                          margin:'0 0 2px', whiteSpace:'nowrap', overflow:'hidden',
                          textOverflow:'ellipsis' }}>{a.title}</p>
                        <p style={{ fontSize:11, color:'#94a3b8', fontWeight:600, margin:0,
                          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {a.desc}
                        </p>
                      </div>
                      <span style={{ fontSize:10, color:'#94a3b8', fontWeight:700,
                        whiteSpace:'nowrap', flexShrink:0 }}>{a.time}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding:'32px 0', textAlign:'center',
                  color:'#cbd5e1', fontSize:12, fontWeight:700,
                  textTransform:'uppercase', letterSpacing:'.1em' }}>
                  No recent activity.
                </div>
              )}
            </div>
          </div>

          {/* ════ RIGHT SIDEBAR ════ */}
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

            {/* Quick stats */}
            <div style={{ ...card, padding:22 }}>
              <p style={{ fontSize:10, fontWeight:800, letterSpacing:'.14em',
                textTransform:'uppercase', color:'#94a3b8', margin:'0 0 16px' }}>School At a Glance</p>
              {[
                { label:'Enrolled Students', val:totalStudents, icon:<GraduationCap size={15}/>, color:'#6366f1' },
                { label:'Teaching Staff', val:totalTeachers, icon:<Users size={15}/>, color:'#06b6d4' },
                { label:'Fee Defaulters', val:defaulterCount, icon:<AlertCircle size={15}/>, color:'#f43f5e' },
                { label:'Collection Rate', val:`${collectionPct}%`, icon:<BarChart2 size={15}/>, color:'#10b981' },
              ].map((x,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'10px 0', borderBottom: i<3 ? '1px solid #f8fafc' : 'none' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ background: x.color+'18', color:x.color, padding:7,
                      borderRadius:8 }}>{x.icon}</div>
                    <span style={{ fontSize:12, fontWeight:700, color:'#334155' }}>{x.label}</span>
                  </div>
                  <span style={{ fontSize:16, fontWeight:900, color:x.color,
                    letterSpacing:-.5 }}>{x.val}</span>
                </div>
              ))}
            </div>

            {/* Defaulters preview */}
            <div style={{ ...card, padding:22 }}>
              <div style={{ display:'flex', justifyContent:'space-between',
                alignItems:'center', marginBottom:14 }}>
                <p style={{ fontSize:10, fontWeight:800, letterSpacing:'.14em',
                  textTransform:'uppercase', color:'#94a3b8', margin:0 }}>Fee Defaulters</p>
                <span style={{ background:'#fff1f2', color:'#f43f5e', fontSize:9,
                  fontWeight:900, padding:'3px 10px', borderRadius:20,
                  textTransform:'uppercase', letterSpacing:'.08em' }}>
                  {defaulterCount} pending
                </span>
              </div>
              {(stats?.defaulters || []).slice(0,5).map((s: any, i: number) => (
                <div key={i} className="aai">
                  <Av name={s.name} imageUrl={s.profileImageBase64} size={32}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:12, fontWeight:800, color:'#0f172a', margin:0,
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {s.name}
                    </p>
                    <p style={{ fontSize:10, color:'#94a3b8', fontWeight:600, margin:'2px 0 0' }}>
                      {s.grade} · {s.parentName}
                    </p>
                  </div>
                  <span style={{ background:'#fff1f2', color:'#f43f5e', fontSize:9,
                    fontWeight:900, padding:'2px 8px', borderRadius:12, flexShrink:0,
                    textTransform:'uppercase' }}>Unpaid</span>
                </div>
              ))}
              {defaulterCount === 0 && (
                <div style={{ padding:'20px 0', textAlign:'center',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                  <CheckCircle size={28} color="#10b981"/>
                  <p style={{ fontSize:12, color:'#10b981', fontWeight:800, margin:0,
                    textTransform:'uppercase', letterSpacing:'.08em' }}>
                    All fees cleared!
                  </p>
                </div>
              )}
              {defaulterCount > 0 && (
                <button className="abp" style={{ background:'#f43f5e', width:'100%',
                  marginTop:14, justifyContent:'center' }}
                  onClick={() => setShowDefaulters(true)}>
                  View All <ArrowRight size={12}/>
                </button>
              )}
            </div>

            {/* Monthly summary */}
            <div style={{ ...card, padding:22, background:'linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)' }}>
              <p style={{ fontSize:10, fontWeight:800, letterSpacing:'.14em',
                textTransform:'uppercase', color:'rgba(255,255,255,.4)', margin:'0 0 16px' }}>
                Monthly Summary
              </p>
              <p style={{ fontSize:32, fontWeight:900, letterSpacing:-1.5,
                color:'white', lineHeight:1, margin:'0 0 4px' }}>
                N$ {(expectedRev/12).toLocaleString(undefined,{maximumFractionDigits:0})}
              </p>
              <p style={{ fontSize:12, color:'rgba(255,255,255,.5)', fontWeight:600,
                margin:'0 0 20px' }}>Expected monthly revenue</p>
              <div style={{ height:4, background:'rgba(255,255,255,.1)',
                borderRadius:2, overflow:'hidden', marginBottom:8 }}>
                <div style={{ width:`${collectionPct}%`, height:'100%',
                  background:'linear-gradient(90deg,#10b981,#34d399)',
                  borderRadius:2, transition:'width 1.2s ease' }}/>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.4)' }}>
                  {collectionPct}% collected
                </span>
                <span style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.4)' }}>
                  {100-collectionPct}% outstanding
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ══ DEFAULTERS MODAL ══ */}
      {showDefaulters && (
        <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex',
          alignItems:'center', justifyContent:'center',
          background:'rgba(15,23,42,.6)', backdropFilter:'blur(4px)', padding:16 }}>
          <div style={{ background:'white', width:'100%', maxWidth:740,
            borderRadius:20, boxShadow:'0 24px 80px rgba(0,0,0,.2)',
            maxHeight:'85vh', display:'flex', flexDirection:'column',
            animation:'fadeup .25s ease' }}>

            {/* Modal header */}
            <div style={{ padding:'22px 24px', borderBottom:'1px solid #f1f5f9',
              display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                  <div style={{ background:'#fff1f2', padding:8, borderRadius:10 }}>
                    <AlertCircle size={20} color="#f43f5e"/>
                  </div>
                  <h3 style={{ fontSize:18, fontWeight:900, color:'#f43f5e',
                    letterSpacing:-.5, margin:0 }}>Outstanding Payments</h3>
                </div>
                <p style={{ fontSize:12, color:'#94a3b8', fontWeight:600, margin:0 }}>
                  {defaulterCount} student{defaulterCount!==1?'s':''} with pending fee payments
                </p>
              </div>
              <button onClick={() => setShowDefaulters(false)}
                style={{ background:'#f8fafc', border:'none', cursor:'pointer',
                  width:36, height:36, borderRadius:8, display:'flex',
                  alignItems:'center', justifyContent:'center' }}>
                <X size={18} color="#64748b"/>
              </button>
            </div>

            {/* Modal table */}
            <div style={{ overflowY:'auto', flex:1 }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#f8fafc', position:'sticky', top:0 }}>
                    <th className="ath">Student</th>
                    <th className="ath ahm">Grade</th>
                    <th className="ath ahm">Parent</th>
                    <th className="ath ahm">Contact</th>
                    <th className="ath">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.defaulters?.length > 0 ? (
                    stats.defaulters.map((s: any, i: number) => (
                      <tr key={s.id || i} className="ahrow"
                        style={{ borderBottom:'1px solid #f8fafc' }}>
                        <td className="atd">
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <Av name={s.name} imageUrl={s.profileImageBase64} size={32}/>
                            <div>
                              <p style={{ fontSize:13, fontWeight:800, color:'#0f172a',
                                margin:0 }}>{s.name}</p>
                              <p style={{ fontSize:10, color:'#94a3b8', fontWeight:600,
                                margin:'2px 0 0', textTransform:'uppercase' }}>{s.grade}</p>
                            </div>
                          </div>
                        </td>
                        <td className="atd ahm" style={{ color:'#334155', fontWeight:600 }}>
                          {s.grade}
                        </td>
                        <td className="atd ahm" style={{ color:'#334155', fontWeight:600 }}>
                          {s.parentName}
                        </td>
                        <td className="atd ahm">
                          <span style={{ fontFamily:'monospace', fontSize:12,
                            color:'#64748b', fontWeight:700 }}>{s.parentPhone || '—'}</span>
                        </td>
                        <td className="atd">
                          <span style={{ background:'#fff1f2', color:'#f43f5e',
                            padding:'3px 10px', borderRadius:20, fontSize:10,
                            fontWeight:900, textTransform:'uppercase', letterSpacing:'.06em' }}>
                            Unpaid
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ padding:'48px 16px', textAlign:'center',
                        color:'#cbd5e1', fontWeight:800, fontSize:12,
                        textTransform:'uppercase', letterSpacing:'.1em' }}>
                        No outstanding payments found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal footer */}
            <div style={{ padding:'14px 24px', borderTop:'1px solid #f1f5f9',
              background:'#f8fafc', display:'flex', justifyContent:'space-between',
              alignItems:'center', flexWrap:'wrap', gap:8 }}>
              <span style={{ fontSize:11, fontWeight:700, color:'#94a3b8',
                textTransform:'uppercase', letterSpacing:'.08em' }}>
                {defaulterCount} total defaulters · N$ {outstanding.toLocaleString()} outstanding
              </span>
              <button className="abp" style={{ background:'#0f172a' }}
                onClick={() => setShowDefaulters(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ VIEW ADMINS MODAL ══ */}
      {showAdmins && (
        <div style={{ position:'fixed', inset:0, zIndex:90, display:'flex',
          alignItems:'center', justifyContent:'center',
          background:'rgba(15,23,42,.6)', backdropFilter:'blur(4px)', padding:16 }}>
          <div style={{ background:'white', width:'100%', maxWidth:980,
            borderRadius:20, boxShadow:'0 24px 80px rgba(0,0,0,.2)',
            maxHeight:'88vh', display:'flex', flexDirection:'column',
            animation:'fadeup .25s ease', overflow:'hidden' }}>

            <div style={{ padding:'22px 24px', borderBottom:'1px solid #f1f5f9',
              display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16 }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                  <div style={{ background:'#eef2ff', padding:8, borderRadius:10 }}>
                    <ShieldCheck size={20} color="#4f46e5"/>
                  </div>
                  <h3 style={{ fontSize:18, fontWeight:900, color:'#0f172a',
                    letterSpacing:-.5, margin:0 }}>Admins</h3>
                </div>
                <p style={{ fontSize:12, color:'#94a3b8', fontWeight:600, margin:0 }}>
                  View admin names, current PINs, account actions, and activity logs.
                </p>
              </div>
              <button onClick={() => setShowAdmins(false)}
                style={{ background:'#f8fafc', border:'none', cursor:'pointer',
                  width:36, height:36, borderRadius:8, display:'flex',
                  alignItems:'center', justifyContent:'center' }}>
                <X size={18} color="#64748b"/>
              </button>
            </div>

            {adminActionMessage && (
              <div style={{
                margin:'16px 24px 0',
                background: adminActionMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
                color: adminActionMessage.type === 'success' ? '#15803d' : '#b91c1c',
                border:`1px solid ${adminActionMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                padding:'10px 14px',
                borderRadius:12,
                fontSize:13,
                fontWeight:700,
              }}>
                {adminActionMessage.text}
              </div>
            )}

            <div style={{ overflowY:'auto', flex:1, paddingTop: adminActionMessage ? 12 : 0 }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#f8fafc', position:'sticky', top:0 }}>
                    <th className="ath">Name</th>
                    <th className="ath">Role</th>
                    <th className="ath">Current PIN</th>
                    <th className="ath">Activities</th>
                    <th className="ath" style={{ textAlign:'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminRows.map((admin) => {
                    const adminLogCount = getLogsForAdmin(admin).length;
                    return (
                      <tr key={admin.id} className="ahrow" style={{ borderBottom:'1px solid #f8fafc' }}>
                        <td className="atd">
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <Av name={admin.name} size={34}/>
                            <div>
                              <p style={{ fontSize:13, fontWeight:900, color:'#0f172a', margin:0 }}>{admin.name}</p>
                              <p style={{ fontSize:10, color:'#94a3b8', fontWeight:700, margin:'2px 0 0' }}>{admin.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="atd">
                          <span style={{ background: admin.canDelete ? '#eff6ff' : '#fef3c7',
                            color: admin.canDelete ? '#1d4ed8' : '#92400e',
                            padding:'4px 10px', borderRadius:20, fontSize:10,
                            fontWeight:900, textTransform:'uppercase', letterSpacing:'.06em' }}>
                            {admin.roleLabel}
                          </span>
                        </td>
                        <td className="atd">
                          <span style={{ fontFamily:'monospace', fontSize:14, fontWeight:900,
                            color:'#0f172a', background:'#f8fafc', border:'1px solid #e2e8f0',
                            padding:'4px 10px', borderRadius:8 }}>
                            {admin.pin || '-'}
                          </span>
                        </td>
                        <td className="atd">
                          <button className="abo" onClick={() => setActivityAdmin(admin)}
                            style={{ padding:'7px 10px' }}>
                            <History size={13}/> {adminLogCount} Logs
                          </button>
                        </td>
                        <td className="atd" style={{ textAlign:'right' }}>
                          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', flexWrap:'wrap' }}>
                            <button className="abo" onClick={() => openEditAdmin(admin)}
                              style={{ padding:'7px 10px' }}>
                              <Edit2 size={13}/> Edit
                            </button>
                            <button
                              className="abo"
                              disabled={!admin.canDelete}
                              onClick={() => admin.canDelete && setDeleteAdmin(admin)}
                              style={{
                                padding:'7px 10px',
                                color: admin.canDelete ? '#dc2626' : '#cbd5e1',
                                borderColor: admin.canDelete ? '#fecaca' : '#e2e8f0',
                                cursor: admin.canDelete ? 'pointer' : 'not-allowed',
                              }}
                            >
                              <Trash2 size={13}/> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ padding:'14px 24px', borderTop:'1px solid #f1f5f9',
              background:'#f8fafc', display:'flex', justifyContent:'space-between',
              alignItems:'center', flexWrap:'wrap', gap:8 }}>
              <span style={{ fontSize:11, fontWeight:700, color:'#94a3b8',
                textTransform:'uppercase', letterSpacing:'.08em' }}>
                {adminRows.length} admin account{adminRows.length !== 1 ? 's' : ''}
              </span>
              <button className="abp" style={{ background:'#0f172a' }}
                onClick={() => setShowAdmins(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ EDIT ADMIN MODAL ══ */}
      {editAdmin && (
        <div style={{ position:'fixed', inset:0, zIndex:110, display:'flex',
          alignItems:'center', justifyContent:'center',
          background:'rgba(15,23,42,.62)', backdropFilter:'blur(4px)', padding:16 }}>
          <div style={{ background:'white', width:'100%', maxWidth:420,
            borderRadius:20, boxShadow:'0 24px 80px rgba(0,0,0,.22)',
            overflow:'hidden', animation:'fadeup .2s ease' }}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid #f1f5f9',
              display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{ margin:0, fontSize:18, fontWeight:900, color:'#0f172a' }}>
                Edit {editAdmin.roleLabel}
              </h3>
              <button onClick={() => setEditAdmin(null)}
                style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8' }}>
                <X size={20}/>
              </button>
            </div>
            <div style={{ padding:24 }}>
              <div style={{ marginBottom:16 }}>
                <Input
                  label="Admin Name"
                  value={editAdminForm.name}
                  onChange={(event) => setEditAdminForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div style={{ marginBottom:24 }}>
                <Input
                  label="Current PIN"
                  value={editAdminForm.pin}
                  onChange={(event) => setEditAdminForm((prev) => ({ ...prev, pin: event.target.value }))}
                />
              </div>
              <Button type="button" fullWidth disabled={adminActionLoading} onClick={handleSaveAdmin}>
                <Save size={16}/> {adminActionLoading ? 'Saving...' : 'Save Admin'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DELETE ADMIN CONFIRMATION ══ */}
      {deleteAdmin && (
        <div style={{ position:'fixed', inset:0, zIndex:110, display:'flex',
          alignItems:'center', justifyContent:'center',
          background:'rgba(15,23,42,.62)', backdropFilter:'blur(4px)', padding:16 }}>
          <div style={{ background:'white', width:'100%', maxWidth:440,
            borderRadius:20, boxShadow:'0 24px 80px rgba(0,0,0,.22)',
            overflow:'hidden', animation:'fadeup .2s ease' }}>
            <div style={{ padding:24 }}>
              <div style={{ background:'#fef2f2', color:'#dc2626', width:44, height:44,
                borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center',
                marginBottom:14 }}>
                <Trash2 size={22}/>
              </div>
              <h3 style={{ margin:'0 0 8px', fontSize:20, fontWeight:900, color:'#0f172a' }}>
                Delete admin?
              </h3>
              <p style={{ margin:'0 0 22px', fontSize:13, lineHeight:1.6, color:'#64748b', fontWeight:600 }}>
                This will remove {deleteAdmin.name}'s admin access immediately. This action cannot be undone.
              </p>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button className="abo" onClick={() => setDeleteAdmin(null)}>Cancel</button>
                <button className="abp" style={{ background:'#dc2626' }}
                  disabled={adminActionLoading}
                  onClick={handleDeleteAdmin}>
                  {adminActionLoading ? 'Deleting...' : 'Delete Admin'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ ADMIN ACTIVITIES MODAL ══ */}
      {activityAdmin && (
        <div style={{ position:'fixed', inset:0, zIndex:110, display:'flex',
          alignItems:'center', justifyContent:'center',
          background:'rgba(15,23,42,.62)', backdropFilter:'blur(4px)', padding:16 }}>
          <div style={{ background:'white', width:'100%', maxWidth:860,
            borderRadius:20, boxShadow:'0 24px 80px rgba(0,0,0,.22)',
            maxHeight:'86vh', display:'flex', flexDirection:'column',
            overflow:'hidden', animation:'fadeup .2s ease' }}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid #f1f5f9',
              display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16 }}>
              <div>
                <h3 style={{ margin:0, fontSize:18, fontWeight:900, color:'#0f172a' }}>
                  Activities: {activityAdmin.name}
                </h3>
                <p style={{ fontSize:12, color:'#94a3b8', fontWeight:700, margin:'4px 0 0' }}>
                  {activityAdmin.roleLabel} activity log
                </p>
              </div>
              <button onClick={() => setActivityAdmin(null)}
                style={{ background:'#f8fafc', border:'none', cursor:'pointer',
                  width:36, height:36, borderRadius:8, display:'flex',
                  alignItems:'center', justifyContent:'center' }}>
                <X size={18} color="#64748b"/>
              </button>
            </div>
            <div style={{ overflowY:'auto', flex:1 }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#f8fafc', position:'sticky', top:0 }}>
                    <th className="ath">Action Time</th>
                    <th className="ath">Category</th>
                    <th className="ath">Action</th>
                    <th className="ath">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {getLogsForAdmin(activityAdmin).map((log) => {
                    const date = log.createdAt?.toDate ? log.createdAt.toDate() : new Date(log.createdAt);
                    return (
                      <tr key={log.id} style={{ borderBottom:'1px solid #f8fafc' }}>
                        <td className="atd" style={{ whiteSpace:'nowrap', color:'#64748b', fontWeight:700 }}>
                          {Number.isNaN(date.getTime()) ? '-' : date.toLocaleString()}
                        </td>
                        <td className="atd">
                          <span style={{ background:'#eef2ff', color:'#4338ca',
                            padding:'3px 9px', borderRadius:20, fontSize:10,
                            fontWeight:900, textTransform:'uppercase', letterSpacing:'.06em' }}>
                            {log.category}
                          </span>
                        </td>
                        <td className="atd" style={{ fontWeight:900, color:'#0f172a' }}>{log.action}</td>
                        <td className="atd" style={{ color:'#64748b', fontWeight:600 }}>{log.details || '-'}</td>
                      </tr>
                    );
                  })}
                  {getLogsForAdmin(activityAdmin).length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding:'42px 16px', textAlign:'center',
                        color:'#cbd5e1', fontWeight:800, fontSize:12,
                        textTransform:'uppercase', letterSpacing:'.1em' }}>
                        No activity logs found for this admin.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══ CREATE MATRON MODAL ══ */}
      {showCreateMatron && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', zIndex:100,
          display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(4px)' }}>
          <div style={{ background:'white', borderRadius:20, width:'100%', maxWidth:400,
            boxShadow:'0 20px 40px rgba(0,0,0,.15)', overflow:'hidden', animation:'fadeup .3s ease' }}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid #f1f5f9', display:'flex',
              justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{ margin:0, fontSize:18, fontWeight:800, color:'#0f172a' }}>Create Matron</h3>
              <button onClick={() => setShowCreateMatron(false)}
                style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8' }}>
                <X size={20}/>
              </button>
            </div>
            <form onSubmit={handleCreateMatron} style={{ padding:24 }}>
              {createMatronError && (
                <div style={{ background:'#fef2f2', color:'#ef4444', padding:'10px 14px', borderRadius:8, fontSize:13, fontWeight:600, marginBottom:16 }}>
                  {createMatronError}
                </div>
              )}
              {createMatronSuccess && (
                <div style={{ background:'#f0fdf4', color:'#10b981', padding:'10px 14px', borderRadius:8, fontSize:13, fontWeight:600, marginBottom:16 }}>
                  {createMatronSuccess}
                </div>
              )}
              <div style={{ marginBottom:16 }}>
                <Input
                  label="Full Name"
                  placeholder="e.g. Mary Jane"
                  value={newMatronName}
                  onChange={(e) => setNewMatronName(e.target.value)}
                  required
                />
              </div>
              <div style={{ marginBottom:16 }}>
                <Input
                  label="4-digit PIN"
                  type="password"
                  maxLength={4}
                  placeholder="Enter PIN"
                  value={newMatronPin}
                  onChange={(e) => setNewMatronPin(e.target.value)}
                  required
                />
              </div>
              <div style={{ marginBottom:24 }}>
                <Input
                  label="Confirm PIN"
                  type="password"
                  maxLength={4}
                  placeholder="Re-enter PIN"
                  value={confirmMatronPin}
                  onChange={(e) => setConfirmMatronPin(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" fullWidth disabled={createMatronLoading}>
                {createMatronLoading ? 'Creating...' : 'Create Matron'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* ══ CREATE ADMIN MODAL ══ */}
      {showCreateAdmin && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', zIndex:100,
          display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(4px)' }}>
          <div style={{ background:'white', borderRadius:20, width:'100%', maxWidth:400,
            boxShadow:'0 20px 40px rgba(0,0,0,.15)', overflow:'hidden', animation:'fadeup .3s ease' }}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid #f1f5f9', display:'flex',
              justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{ margin:0, fontSize:18, fontWeight:800, color:'#0f172a' }}>Create Sub-Admin</h3>
              <button onClick={() => setShowCreateAdmin(false)}
                style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8' }}>
                <X size={20}/>
              </button>
            </div>
            <form onSubmit={handleCreateAdmin} style={{ padding:24 }}>
              {createAdminError && (
                <div style={{ background:'#fef2f2', color:'#ef4444', padding:'10px 14px', borderRadius:8, fontSize:13, fontWeight:600, marginBottom:16 }}>
                  {createAdminError}
                </div>
              )}
              {createAdminSuccess && (
                <div style={{ background:'#f0fdf4', color:'#10b981', padding:'10px 14px', borderRadius:8, fontSize:13, fontWeight:600, marginBottom:16 }}>
                  {createAdminSuccess}
                </div>
              )}
              <div style={{ marginBottom:16 }}>
                <Input 
                  label="Admin Name" 
                  placeholder="e.g. John Doe" 
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  required
                />
              </div>
              <div style={{ marginBottom:24 }}>
                <Input 
                  label="Admin PIN" 
                  type="password"
                  placeholder="Enter a unique PIN" 
                  value={newAdminPin}
                  onChange={(e) => setNewAdminPin(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" fullWidth disabled={createAdminLoading}>
                {createAdminLoading ? 'Creating...' : 'Create Admin'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
