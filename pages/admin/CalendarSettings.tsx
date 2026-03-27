import React, { useState, useEffect } from 'react';
import { SystemSettings, TermCalendar, HostelCalendar, Holiday, HostelHoliday } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { Calendar, Plus, Trash2, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface CalendarSettingsProps {
  settings: SystemSettings;
  setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
}

const calculateDays = (startStr: string, endStr: string, holidays: {startDate: string, endDate?: string}[], excludeWeekends: boolean) => {
    if (!startStr || !endStr) return 0;
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

    let count = 0;
    let current = new Date(start);

    while (current <= end) {
        const dayOfWeek = current.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        let isHoliday = false;
        for (const h of holidays) {
            if (!h.startDate) continue;
            const hStart = new Date(h.startDate);
            const hEnd = h.endDate ? new Date(h.endDate) : hStart;
            if (current >= hStart && current <= hEnd) {
                isHoliday = true;
                break;
            }
        }

        if (!isHoliday && (!excludeWeekends || !isWeekend)) {
            count++;
        }
        current.setDate(current.getDate() + 1);
    }
    return count;
};

export const CalendarSettings: React.FC<CalendarSettingsProps> = ({ settings, setSettings }) => {
  const [activeSubTab, setActiveSubTab] = useState<'SCHOOL' | 'HOSTEL'>('SCHOOL');
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; termId: string | null; type: 'SCHOOL' | 'HOSTEL' | null }>({ isOpen: false, termId: null, type: null });

  // Initialize if undefined
  const schoolCalendars = settings.schoolCalendars || [];
  const hostelCalendars = settings.hostelCalendars || [];

  const updateSchoolCalendars = (newCalendars: TermCalendar[]) => {
      setSettings({ ...settings, schoolCalendars: newCalendars });
  };

  const updateHostelCalendars = (newCalendars: HostelCalendar[]) => {
      setSettings({ ...settings, hostelCalendars: newCalendars });
  };

  const confirmDeleteTerm = () => {
      if (!deleteConfirm.termId || !deleteConfirm.type) return;
      
      if (deleteConfirm.type === 'SCHOOL') {
          updateSchoolCalendars(schoolCalendars.filter(t => t.id !== deleteConfirm.termId));
      } else {
          updateHostelCalendars(hostelCalendars.filter(t => t.id !== deleteConfirm.termId));
      }
      
      setDeleteConfirm({ isOpen: false, termId: null, type: null });
  };

  // --- SCHOOL CALENDAR ACTIONS ---
  const addSchoolTerm = () => {
      const newTerm: TermCalendar = {
          id: uuidv4(),
          termName: `Term ${schoolCalendars.length + 1}`,
          learnersOpeningDate: '',
          learnersClosingDate: '',
          teachersOpeningDate: '',
          teachersClosingDate: '',
          holidays: [],
          schoolDays: 0
      };
      updateSchoolCalendars([...schoolCalendars, newTerm]);
      setExpandedTerm(newTerm.id);
  };

  const removeSchoolTerm = (id: string) => {
      setDeleteConfirm({ isOpen: true, termId: id, type: 'SCHOOL' });
  };

  const updateSchoolTerm = (id: string, field: keyof TermCalendar, value: any) => {
      const updated = schoolCalendars.map(t => {
          if (t.id === id) {
              const newTerm = { ...t, [field]: value };
              // Auto calculate days if dates or holidays change
              if (['learnersOpeningDate', 'learnersClosingDate', 'holidays'].includes(field)) {
                  newTerm.schoolDays = calculateDays(newTerm.learnersOpeningDate, newTerm.learnersClosingDate, newTerm.holidays, true);
              }
              return newTerm;
          }
          return t;
      });
      updateSchoolCalendars(updated);
  };

  const addSchoolHoliday = (termId: string) => {
      const updated = schoolCalendars.map(t => {
          if (t.id === termId) {
              const newHoliday: Holiday = { id: uuidv4(), name: '', type: 'Public Holiday', startDate: '', endDate: '' };
              const newHolidays = [...t.holidays, newHoliday];
              return { 
                  ...t, 
                  holidays: newHolidays,
                  schoolDays: calculateDays(t.learnersOpeningDate, t.learnersClosingDate, newHolidays, true)
              };
          }
          return t;
      });
      updateSchoolCalendars(updated);
  };

  const updateSchoolHoliday = (termId: string, holidayId: string, field: keyof Holiday, value: any) => {
      const updated = schoolCalendars.map(t => {
          if (t.id === termId) {
              const newHolidays = t.holidays.map(h => h.id === holidayId ? { ...h, [field]: value } : h);
              return { 
                  ...t, 
                  holidays: newHolidays,
                  schoolDays: calculateDays(t.learnersOpeningDate, t.learnersClosingDate, newHolidays, true)
              };
          }
          return t;
      });
      updateSchoolCalendars(updated);
  };

  const removeSchoolHoliday = (termId: string, holidayId: string) => {
      const updated = schoolCalendars.map(t => {
          if (t.id === termId) {
              const newHolidays = t.holidays.filter(h => h.id !== holidayId);
              return { 
                  ...t, 
                  holidays: newHolidays,
                  schoolDays: calculateDays(t.learnersOpeningDate, t.learnersClosingDate, newHolidays, true)
              };
          }
          return t;
      });
      updateSchoolCalendars(updated);
  };

  // --- HOSTEL CALENDAR ACTIONS ---
  const addHostelTerm = () => {
      const newTerm: HostelCalendar = {
          id: uuidv4(),
          termName: `Term ${hostelCalendars.length + 1}`,
          hostelOpeningDate: '',
          hostelClosingDate: '',
          staffOpeningDate: '',
          staffClosingDate: '',
          holidays: [],
          hostelDays: 0
      };
      updateHostelCalendars([...hostelCalendars, newTerm]);
      setExpandedTerm(newTerm.id);
  };

  const removeHostelTerm = (id: string) => {
      setDeleteConfirm({ isOpen: true, termId: id, type: 'HOSTEL' });
  };

  const updateHostelTerm = (id: string, field: keyof HostelCalendar, value: any) => {
      const updated = hostelCalendars.map(t => {
          if (t.id === id) {
              const newTerm = { ...t, [field]: value };
              if (['hostelOpeningDate', 'hostelClosingDate', 'holidays'].includes(field)) {
                  newTerm.hostelDays = calculateDays(newTerm.hostelOpeningDate, newTerm.hostelClosingDate, newTerm.holidays, false);
              }
              return newTerm;
          }
          return t;
      });
      updateHostelCalendars(updated);
  };

  const addHostelHoliday = (termId: string) => {
      const updated = hostelCalendars.map(t => {
          if (t.id === termId) {
              const newHoliday: HostelHoliday = { id: uuidv4(), name: '', startDate: '', endDate: '' };
              const newHolidays = [...t.holidays, newHoliday];
              return { 
                  ...t, 
                  holidays: newHolidays,
                  hostelDays: calculateDays(t.hostelOpeningDate, t.hostelClosingDate, newHolidays, false)
              };
          }
          return t;
      });
      updateHostelCalendars(updated);
  };

  const updateHostelHoliday = (termId: string, holidayId: string, field: keyof HostelHoliday, value: any) => {
      const updated = hostelCalendars.map(t => {
          if (t.id === termId) {
              const newHolidays = t.holidays.map(h => h.id === holidayId ? { ...h, [field]: value } : h);
              return { 
                  ...t, 
                  holidays: newHolidays,
                  hostelDays: calculateDays(t.hostelOpeningDate, t.hostelClosingDate, newHolidays, false)
              };
          }
          return t;
      });
      updateHostelCalendars(updated);
  };

  const removeHostelHoliday = (termId: string, holidayId: string) => {
      const updated = hostelCalendars.map(t => {
          if (t.id === termId) {
              const newHolidays = t.holidays.filter(h => h.id !== holidayId);
              return { 
                  ...t, 
                  holidays: newHolidays,
                  hostelDays: calculateDays(t.hostelOpeningDate, t.hostelClosingDate, newHolidays, false)
              };
          }
          return t;
      });
      updateHostelCalendars(updated);
  };

  const totalSchoolDays = schoolCalendars.reduce((acc, term) => acc + (Number(term.schoolDays) || 0), 0);
  const totalHostelDays = hostelCalendars.reduce((acc, term) => acc + (Number(term.hostelDays) || 0), 0);

  return (
    <div className="animate-fade-in space-y-6">
        <div className="flex gap-4 border-b border-gray-200">
            <button 
                onClick={() => setActiveSubTab('SCHOOL')}
                className={`pb-3 px-4 font-bold border-b-2 transition-colors ${activeSubTab === 'SCHOOL' ? 'border-coha-900 text-coha-900' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
                Term Calendar
            </button>
            <button 
                onClick={() => setActiveSubTab('HOSTEL')}
                className={`pb-3 px-4 font-bold border-b-2 transition-colors ${activeSubTab === 'HOSTEL' ? 'border-coha-900 text-coha-900' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
                Hostel Calendar
            </button>
        </div>

        {activeSubTab === 'SCHOOL' && (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Term Calendars</h3>
                        <p className="text-sm text-gray-500">Total School Days for Year: <span className="font-bold text-coha-900">{totalSchoolDays}</span></p>
                    </div>
                </div>

                {schoolCalendars.map((term, index) => (
                    <div key={term.id} className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm">
                        <div 
                            className="bg-gray-50 p-4 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                            onClick={() => setExpandedTerm(expandedTerm === term.id ? null : term.id)}
                        >
                            <div className="flex items-center gap-3">
                                {expandedTerm === term.id ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                                <h4 className="font-bold text-lg text-gray-800">{term.termName || `Term ${index + 1}`}</h4>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-bold bg-coha-100 text-coha-900 px-3 py-1 rounded-full">{term.schoolDays || 0} Days</span>
                            </div>
                        </div>

                        {expandedTerm === term.id && (
                            <div className="p-6 border-t border-gray-200 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <Input label="Term Name" value={term.termName} onChange={(e) => updateSchoolTerm(term.id, 'termName', e.target.value)} />
                                    </div>
                                    <div>
                                        <Input label="Total School Days (Auto-calculated)" type="number" value={term.schoolDays.toString()} onChange={(e) => updateSchoolTerm(term.id, 'schoolDays', parseInt(e.target.value) || 0)} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                                    <h5 className="md:col-span-2 font-bold text-blue-900">Learners</h5>
                                    <Input label="Opening Date" type="date" value={term.learnersOpeningDate} onChange={(e) => updateSchoolTerm(term.id, 'learnersOpeningDate', e.target.value)} />
                                    <Input label="Closing Date" type="date" value={term.learnersClosingDate} onChange={(e) => updateSchoolTerm(term.id, 'learnersClosingDate', e.target.value)} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-purple-50 p-4 rounded-lg border border-purple-100">
                                    <h5 className="md:col-span-2 font-bold text-purple-900">Teachers</h5>
                                    <Input label="Opening Date" type="date" value={term.teachersOpeningDate} onChange={(e) => updateSchoolTerm(term.id, 'teachersOpeningDate', e.target.value)} />
                                    <Input label="Closing Date" type="date" value={term.teachersClosingDate} onChange={(e) => updateSchoolTerm(term.id, 'teachersClosingDate', e.target.value)} />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h5 className="font-bold text-gray-800">Holidays</h5>
                                        <Button variant="secondary" onClick={() => addSchoolHoliday(term.id)}><Plus size={16} className="mr-1" /> Add Holiday</Button>
                                    </div>
                                    
                                    {term.holidays.length === 0 ? (
                                        <p className="text-sm text-gray-500 italic">No holidays added for this term.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {term.holidays.map((holiday, hIndex) => (
                                                <div key={holiday.id} className="flex flex-wrap md:flex-nowrap items-end gap-3 bg-gray-50 p-3 rounded border border-gray-200">
                                                    <div className="w-full md:w-1/4">
                                                        <label className="block text-xs font-bold text-gray-700 mb-1">Name</label>
                                                        <input className="w-full p-2 border border-gray-300 rounded text-sm" value={holiday.name} onChange={(e) => updateSchoolHoliday(term.id, holiday.id, 'name', e.target.value)} placeholder="e.g. Easter" />
                                                    </div>
                                                    <div className="w-full md:w-1/4">
                                                        <label className="block text-xs font-bold text-gray-700 mb-1">Type</label>
                                                        <select className="w-full p-2 border border-gray-300 rounded text-sm" value={holiday.type} onChange={(e) => updateSchoolHoliday(term.id, holiday.id, 'type', e.target.value)}>
                                                            <option value="Public Holiday">Public Holiday</option>
                                                            <option value="Other">Other</option>
                                                        </select>
                                                    </div>
                                                    {holiday.type === 'Other' && (
                                                        <div className="w-full md:w-1/4">
                                                            <label className="block text-xs font-bold text-gray-700 mb-1">Specify Type</label>
                                                            <input className="w-full p-2 border border-gray-300 rounded text-sm" value={holiday.otherType || ''} onChange={(e) => updateSchoolHoliday(term.id, holiday.id, 'otherType', e.target.value)} placeholder="e.g. Mid-term break" />
                                                        </div>
                                                    )}
                                                    <div className="w-full md:w-1/5">
                                                        <label className="block text-xs font-bold text-gray-700 mb-1">Start Date</label>
                                                        <input type="date" className="w-full p-2 border border-gray-300 rounded text-sm" value={holiday.startDate} onChange={(e) => updateSchoolHoliday(term.id, holiday.id, 'startDate', e.target.value)} />
                                                    </div>
                                                    <div className="w-full md:w-1/5">
                                                        <label className="block text-xs font-bold text-gray-700 mb-1">End Date (Optional)</label>
                                                        <input type="date" className="w-full p-2 border border-gray-300 rounded text-sm" value={holiday.endDate || ''} onChange={(e) => updateSchoolHoliday(term.id, holiday.id, 'endDate', e.target.value)} />
                                                    </div>
                                                    <button onClick={() => removeSchoolHoliday(term.id, holiday.id)} className="p-2 text-red-500 hover:bg-red-50 rounded">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )}

        {activeSubTab === 'HOSTEL' && (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Hostel Calendars</h3>
                        <p className="text-sm text-gray-500">Total Hostel Days for Year: <span className="font-bold text-coha-900">{totalHostelDays}</span></p>
                    </div>
                </div>

                {hostelCalendars.map((term, index) => (
                    <div key={term.id} className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm">
                        <div 
                            className="bg-gray-50 p-4 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                            onClick={() => setExpandedTerm(expandedTerm === term.id ? null : term.id)}
                        >
                            <div className="flex items-center gap-3">
                                {expandedTerm === term.id ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                                <h4 className="font-bold text-lg text-gray-800">{term.termName || `Term ${index + 1}`}</h4>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-bold bg-orange-100 text-orange-900 px-3 py-1 rounded-full">{term.hostelDays || 0} Days</span>
                            </div>
                        </div>

                        {expandedTerm === term.id && (
                            <div className="p-6 border-t border-gray-200 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <Input label="Term Name" value={term.termName} onChange={(e) => updateHostelTerm(term.id, 'termName', e.target.value)} />
                                    </div>
                                    <div>
                                        <Input label="Total Hostel Days (Auto-calculated)" type="number" value={term.hostelDays.toString()} onChange={(e) => updateHostelTerm(term.id, 'hostelDays', parseInt(e.target.value) || 0)} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-orange-50 p-4 rounded-lg border border-orange-100">
                                    <h5 className="md:col-span-2 font-bold text-orange-900">Hostel Learners</h5>
                                    <Input label="Opening Date" type="date" value={term.hostelOpeningDate} onChange={(e) => updateHostelTerm(term.id, 'hostelOpeningDate', e.target.value)} />
                                    <Input label="Closing Date" type="date" value={term.hostelClosingDate} onChange={(e) => updateHostelTerm(term.id, 'hostelClosingDate', e.target.value)} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-teal-50 p-4 rounded-lg border border-teal-100">
                                    <h5 className="md:col-span-2 font-bold text-teal-900">Supervisory Teachers</h5>
                                    <Input label="Opening Date" type="date" value={term.staffOpeningDate} onChange={(e) => updateHostelTerm(term.id, 'staffOpeningDate', e.target.value)} />
                                    <Input label="Closing Date" type="date" value={term.staffClosingDate} onChange={(e) => updateHostelTerm(term.id, 'staffClosingDate', e.target.value)} />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h5 className="font-bold text-gray-800">Home Weekends / Holidays</h5>
                                        <Button variant="secondary" onClick={() => addHostelHoliday(term.id)}><Plus size={16} className="mr-1" /> Add Home Weekend</Button>
                                    </div>
                                    
                                    {term.holidays.length === 0 ? (
                                        <p className="text-sm text-gray-500 italic">No home weekends added for this term.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {term.holidays.map((holiday, hIndex) => (
                                                <div key={holiday.id} className="flex flex-wrap md:flex-nowrap items-end gap-3 bg-gray-50 p-3 rounded border border-gray-200">
                                                    <div className="w-full md:w-1/3">
                                                        <label className="block text-xs font-bold text-gray-700 mb-1">Name</label>
                                                        <input className="w-full p-2 border border-gray-300 rounded text-sm" value={holiday.name} onChange={(e) => updateHostelHoliday(term.id, holiday.id, 'name', e.target.value)} placeholder="e.g. Home weekend" />
                                                    </div>
                                                    <div className="w-full md:w-1/3">
                                                        <label className="block text-xs font-bold text-gray-700 mb-1">Start Date</label>
                                                        <input type="date" className="w-full p-2 border border-gray-300 rounded text-sm" value={holiday.startDate} onChange={(e) => updateHostelHoliday(term.id, holiday.id, 'startDate', e.target.value)} />
                                                    </div>
                                                    <div className="w-full md:w-1/3">
                                                        <label className="block text-xs font-bold text-gray-700 mb-1">End Date</label>
                                                        <input type="date" className="w-full p-2 border border-gray-300 rounded text-sm" value={holiday.endDate || ''} onChange={(e) => updateHostelHoliday(term.id, holiday.id, 'endDate', e.target.value)} />
                                                    </div>
                                                    <button onClick={() => removeHostelHoliday(term.id, holiday.id)} className="p-2 text-red-500 hover:bg-red-50 rounded">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )}

        <ConfirmModal
            isOpen={deleteConfirm.isOpen}
            onClose={() => setDeleteConfirm({ isOpen: false, termId: null, type: null })}
            onConfirm={confirmDeleteTerm}
            title="Delete Term"
            message="Are you sure you want to delete this term? This action cannot be undone and will remove all associated dates and holidays."
        />
    </div>
  );
};
