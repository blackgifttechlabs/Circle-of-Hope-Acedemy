import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { getSystemSettings, saveSystemSettings } from '../../services/dataService';
import { SystemSettings, FeeItem, SupplyItem } from '../../types';
import { Save, User, DollarSign, Package, Calendar, Plus, Trash2, CheckSquare, Square, Eye, EyeOff, BookOpen, Heart, Settings } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { CalendarSettings } from './CalendarSettings';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'FEES' | 'UNIFORMS' | 'CONFIG' | 'CALENDAR'>('PROFILE');
  const [settings, setSettings] = useState<SystemSettings>({
    adminName: '',
    adminPin: '',
    fees: [],
    uniforms: [],
    stationery: [],
    grades: [],
    specialNeedsLevels: [],
    schoolCalendars: [],
    hostelCalendars: [],
    termStartDate: '',
    termStartTime: ''
  });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [showPin, setShowPin] = useState(false);

  // Local state for new entries
  const [newFee, setNewFee] = useState<FeeItem>({ id: '', category: '', amount: '', frequency: 'Monthly', notes: '' });
  const [customFrequency, setCustomFrequency] = useState(false);
  const [newUniform, setNewUniform] = useState('');
  const [newStationery, setNewStationery] = useState('');
  const [newGrade, setNewGrade] = useState('');
  const [newLevel, setNewLevel] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      const data = await getSystemSettings();
      if (data) {
        setSettings({
            ...data,
            fees: data.fees || [],
            uniforms: data.uniforms || [],
            stationery: data.stationery || [],
            grades: data.grades || [],
            specialNeedsLevels: data.specialNeedsLevels || ['Level 1A', 'Level 1B', 'Level 2', 'Level 3'],
            schoolCalendars: data.schoolCalendars || [],
            hostelCalendars: data.hostelCalendars || []
        });
      }
    };
    loadSettings();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if(e) e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    const success = await saveSystemSettings(settings);
    if (success) {
        setSuccessMsg('Settings saved successfully.');
        setTimeout(() => setSuccessMsg(''), 3000);
    }
    setLoading(false);
  };

  // Fee Management
  const addFee = () => {
    if (newFee.category && newFee.amount) {
      setSettings({
        ...settings,
        fees: [...settings.fees, { ...newFee, id: uuidv4() }]
      });
      setNewFee({ id: '', category: '', amount: '', frequency: 'Monthly', notes: '' });
      setCustomFrequency(false);
    }
  };

  const removeFee = (id: string) => {
    setSettings({ ...settings, fees: settings.fees.filter(f => f.id !== id) });
  };

  // Supplies Management (Uniforms/Stationery)
  const addSupply = (type: 'uniforms' | 'stationery') => {
    const name = type === 'uniforms' ? newUniform : newStationery;
    if (name) {
      const newItem: SupplyItem = { id: uuidv4(), name, isRequired: true };
      setSettings({
        ...settings,
        [type]: [...settings[type], newItem]
      });
      if (type === 'uniforms') setNewUniform('');
      else setNewStationery('');
    }
  };

  const removeSupply = (type: 'uniforms' | 'stationery', id: string) => {
    setSettings({ ...settings, [type]: settings[type].filter(i => i.id !== id) });
  };

  const toggleSupplyRequired = (type: 'uniforms' | 'stationery', id: string) => {
    setSettings({
      ...settings,
      [type]: settings[type].map(i => i.id === id ? { ...i, isRequired: !i.isRequired } : i)
    });
  };

  // Grade Management
  const addGrade = () => {
    if (newGrade && !settings.grades.includes(newGrade)) {
        setSettings({ ...settings, grades: [...settings.grades, newGrade] });
        setNewGrade('');
    }
  };

  const removeGrade = (grade: string) => {
    setSettings({ ...settings, grades: settings.grades.filter(g => g !== grade) });
  };
  
  const addLevel = () => {
    if (newLevel && !settings.specialNeedsLevels.includes(newLevel)) {
        setSettings({ ...settings, specialNeedsLevels: [...settings.specialNeedsLevels, newLevel] });
        setNewLevel('');
    }
  };

  const removeLevel = (lvl: string) => {
    setSettings({ ...settings, specialNeedsLevels: settings.specialNeedsLevels.filter(l => l !== lvl) });
  };

  return (
    <div className="w-full px-5 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
           <h2 className="text-2xl font-bold text-coha-900">System Settings</h2>
           <p className="text-gray-600">Configure school parameters and fees.</p>
        </div>
        <Button onClick={() => handleSave()} disabled={loading}>
            <Save size={20} /> {loading ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>

      {successMsg && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 flex items-center gap-2">
            <CheckSquare size={20} /> {successMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 flex flex-wrap mb-6">
        <button 
            onClick={() => setActiveTab('PROFILE')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold uppercase tracking-wider border-b-4 transition-colors ${activeTab === 'PROFILE' ? 'border-coha-900 text-coha-900' : 'border-transparent text-gray-500 hover:text-coha-900'}`}
        >
            <User size={18} /> Admin Profile
        </button>
        <button 
            onClick={() => setActiveTab('FEES')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold uppercase tracking-wider border-b-4 transition-colors ${activeTab === 'FEES' ? 'border-coha-900 text-coha-900' : 'border-transparent text-gray-500 hover:text-coha-900'}`}
        >
            <DollarSign size={18} /> Fees Structure
        </button>
        <button 
            onClick={() => setActiveTab('UNIFORMS')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold uppercase tracking-wider border-b-4 transition-colors ${activeTab === 'UNIFORMS' ? 'border-coha-900 text-coha-900' : 'border-transparent text-gray-500 hover:text-coha-900'}`}
        >
            <Package size={18} /> Uniforms & Stationery
        </button>
        <button 
            onClick={() => setActiveTab('CONFIG')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold uppercase tracking-wider border-b-4 transition-colors ${activeTab === 'CONFIG' ? 'border-coha-900 text-coha-900' : 'border-transparent text-gray-500 hover:text-coha-900'}`}
        >
            <Settings size={18} /> School Config
        </button>
        <button 
            onClick={() => setActiveTab('CALENDAR')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold uppercase tracking-wider border-b-4 transition-colors ${activeTab === 'CALENDAR' ? 'border-coha-900 text-coha-900' : 'border-transparent text-gray-500 hover:text-coha-900'}`}
        >
            <Calendar size={18} /> Calendar
        </button>
      </div>

      <div className="bg-white p-6 shadow-sm border border-gray-200">
        
        {/* PROFILE TAB */}
        {activeTab === 'PROFILE' && (
          <div className="animate-fade-in max-w-2xl">
             <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">Administrator Details</h3>
             <div className="grid gap-6">
                <Input 
                    label="Administrator Name" 
                    value={settings.adminName} 
                    onChange={(e) => setSettings({...settings, adminName: e.target.value})} 
                />
                <div className="relative">
                    <Input 
                        label="Login PIN (4 Digits)" 
                        type={showPin ? 'text' : 'password'}
                        maxLength={4}
                        value={settings.adminPin} 
                        onChange={(e) => setSettings({...settings, adminPin: e.target.value})} 
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-9 text-gray-500 hover:text-coha-900"
                    >
                        {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
             </div>
          </div>
        )}

        {/* FEES TAB */}
        {activeTab === 'FEES' && (
          <div className="animate-fade-in">
             <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">2026 Fee Structure</h3>
             
             {/* Fee Table */}
             <div className="overflow-x-auto mb-8">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-600">
                        <tr>
                            <th className="p-3 border-b">Category / Description</th>
                            <th className="p-3 border-b">Amount</th>
                            <th className="p-3 border-b">Frequency</th>
                            <th className="p-3 border-b">Notes</th>
                            <th className="p-3 border-b w-16"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {settings.fees.map((fee) => (
                            <tr key={fee.id} className="border-b last:border-0 hover:bg-gray-50">
                                <td className="p-3 font-medium text-gray-800">{fee.category}</td>
                                <td className="p-3 font-mono font-bold text-coha-900">N$ {fee.amount}</td>
                                <td className="p-3">
                                    <span className="bg-gray-100 px-2 py-1 text-xs font-bold uppercase text-gray-600 border border-gray-200">
                                        {fee.frequency}
                                    </span>
                                </td>
                                <td className="p-3 text-sm text-gray-600 italic">{fee.notes || '-'}</td>
                                <td className="p-3 text-center">
                                    <button onClick={() => removeFee(fee.id)} className="text-red-500 hover:text-red-700">
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                         {settings.fees.length === 0 && (
                            <tr><td colSpan={5} className="p-6 text-center text-gray-500">No fee structures added yet.</td></tr>
                        )}
                    </tbody>
                </table>
             </div>

             {/* Add Fee Form */}
             <div className="bg-gray-50 p-6 border-2 border-dashed border-gray-300">
                <h4 className="font-bold text-gray-700 mb-4">Add New Fee Item</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-1">
                        <Input 
                            label="Fee Category" 
                            placeholder="e.g. Bus Fare" 
                            value={newFee.category} 
                            onChange={(e) => setNewFee({...newFee, category: e.target.value})}
                            className="mb-0"
                        />
                    </div>
                    <div>
                        <Input 
                            label="Amount (N$)" 
                            type="number"
                            placeholder="0.00" 
                            value={newFee.amount} 
                            onChange={(e) => setNewFee({...newFee, amount: e.target.value})}
                            className="mb-0"
                        />
                    </div>
                    <div>
                        <label className="block text-coha-900 text-sm font-semibold mb-1 uppercase tracking-wider">Frequency</label>
                        {customFrequency ? (
                            <div className="flex gap-2">
                                <input 
                                    className="w-full p-3 border-2 border-gray-300 focus:border-coha-500 outline-none bg-white rounded-none"
                                    placeholder="Enter custom..."
                                    value={newFee.frequency}
                                    onChange={(e) => setNewFee({...newFee, frequency: e.target.value})}
                                />
                                <button onClick={() => {setCustomFrequency(false); setNewFee({...newFee, frequency: 'Monthly'})}} className="p-2 border bg-gray-200 hover:bg-gray-300"><XIcon /></button>
                            </div>
                        ) : (
                            <select 
                                className="w-full p-3 border-2 border-gray-300 focus:border-coha-500 outline-none bg-white rounded-none"
                                value={newFee.frequency}
                                onChange={(e) => {
                                    if(e.target.value === 'Custom') {
                                        setCustomFrequency(true);
                                        setNewFee({...newFee, frequency: ''});
                                    } else {
                                        setNewFee({...newFee, frequency: e.target.value});
                                    }
                                }}
                            >
                                <option value="Monthly">Monthly</option>
                                <option value="Termly">Termly</option>
                                <option value="Yearly">Yearly</option>
                                <option value="Once-off">Once-off</option>
                                <option value="Custom">Custom...</option>
                            </select>
                        )}
                    </div>
                    <div>
                         <Input 
                            label="Notes (Optional)" 
                            placeholder="e.g. Due 1st of month" 
                            value={newFee.notes || ''} 
                            onChange={(e) => setNewFee({...newFee, notes: e.target.value})}
                            className="mb-0"
                        />
                    </div>
                </div>
                <div className="mt-4 flex justify-end">
                    <Button onClick={addFee}>
                        <Plus size={20} /> Add Fee Item
                    </Button>
                </div>
             </div>
          </div>
        )}

        {/* UNIFORMS & STATIONERY TAB */}
        {activeTab === 'UNIFORMS' && (
          <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* Same as before, omitted for brevity... */}
             {/* Uniforms Column */}
             <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b flex items-center gap-2">
                    <Package size={20} className="text-coha-500"/> Uniform List
                </h3>
                <ul className="space-y-2 mb-4">
                    {settings.uniforms.map((item) => (
                        <li key={item.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100">
                            <div className="flex items-center gap-3">
                                <button onClick={() => toggleSupplyRequired('uniforms', item.id)} className="text-coha-500">
                                    {item.isRequired ? <CheckSquare size={20} /> : <Square size={20} />}
                                </button>
                                <span className={item.isRequired ? 'font-bold text-gray-800' : 'text-gray-600'}>
                                    {item.name} {item.isRequired ? '' : '(Optional)'}
                                </span>
                            </div>
                            <button onClick={() => removeSupply('uniforms', item.id)} className="text-red-400 hover:text-red-600">
                                <Trash2 size={16} />
                            </button>
                        </li>
                    ))}
                </ul>
                <div className="flex gap-2">
                    <Input 
                        placeholder="Add new uniform item..." 
                        value={newUniform} 
                        onChange={(e) => setNewUniform(e.target.value)}
                        className="mb-0"
                    />
                    <Button onClick={() => addSupply('uniforms')} className="px-4">Add</Button>
                </div>
             </div>

             {/* Stationery Column */}
             <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b flex items-center gap-2">
                    <Package size={20} className="text-coha-500"/> Stationery List
                </h3>
                <ul className="space-y-2 mb-4">
                    {settings.stationery.map((item) => (
                        <li key={item.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100">
                            <div className="flex items-center gap-3">
                                <button onClick={() => toggleSupplyRequired('stationery', item.id)} className="text-coha-500">
                                    {item.isRequired ? <CheckSquare size={20} /> : <Square size={20} />}
                                </button>
                                <span className={item.isRequired ? 'font-bold text-gray-800' : 'text-gray-600'}>
                                    {item.name} {item.isRequired ? '' : '(Optional)'}
                                </span>
                            </div>
                            <button onClick={() => removeSupply('stationery', item.id)} className="text-red-400 hover:text-red-600">
                                <Trash2 size={16} />
                            </button>
                        </li>
                    ))}
                </ul>
                <div className="flex gap-2">
                    <Input 
                        placeholder="Add new stationery item..." 
                        value={newStationery} 
                        onChange={(e) => setNewStationery(e.target.value)}
                        className="mb-0"
                    />
                    <Button onClick={() => addSupply('stationery')} className="px-4">Add</Button>
                </div>
             </div>
          </div>
        )}

        {/* SCHOOL CONFIG TAB */}
        {activeTab === 'CONFIG' && (
            <div className="animate-fade-in space-y-10">
                
                {/* Section 0: General Configuration */}
                <div className="bg-gray-50 border-l-4 border-coha-500 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-coha-100 rounded-full text-coha-900">
                            <Settings size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-coha-900">General Configuration</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input 
                            label="School Name" 
                            type="text"
                            value={settings.schoolName || ''} 
                            onChange={(e) => setSettings({...settings, schoolName: e.target.value})} 
                        />
                    </div>
                </div>

                {/* Section 1: Term Configuration */}
                <div className="bg-gray-50 border-l-4 border-coha-500 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-coha-100 rounded-full text-coha-900">
                            <Calendar size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-coha-900">Term Configuration</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input 
                            label="Next Term Start Date" 
                            type="date"
                            value={settings.termStartDate} 
                            onChange={(e) => setSettings({...settings, termStartDate: e.target.value})} 
                        />
                        <Input 
                            label="School Daily Start Time" 
                            type="time"
                            value={settings.termStartTime} 
                            onChange={(e) => setSettings({...settings, termStartTime: e.target.value})} 
                        />
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Section 2: Mainstream Grades */}
                    <div className="bg-white border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-gray-100 rounded-full text-gray-700">
                                <BookOpen size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Mainstream Grades</h3>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-6 p-4 bg-gray-50 border border-gray-100 min-h-[100px] content-start">
                            {settings.grades.map((grade) => (
                                <div key={grade} className="bg-white text-coha-900 px-4 py-2 shadow-sm flex items-center gap-3 border border-gray-200 font-bold">
                                    {grade}
                                    <button onClick={() => removeGrade(grade)} className="text-red-400 hover:text-red-600">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Input 
                                placeholder="Add (e.g. Grade 8)" 
                                value={newGrade} 
                                onChange={(e) => setNewGrade(e.target.value)}
                                className="mb-0"
                            />
                            <Button onClick={addGrade}>Add</Button>
                        </div>
                    </div>

                    {/* Section 3: Special Needs Levels */}
                    <div className="bg-white border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-100 rounded-full text-blue-700">
                                <Heart size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-blue-900">Special Needs Levels</h3>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-6 p-4 bg-blue-50 border border-blue-100 min-h-[100px] content-start">
                            {settings.specialNeedsLevels.map((lvl) => (
                                <div key={lvl} className="bg-white text-blue-900 px-4 py-2 shadow-sm flex items-center gap-3 border border-blue-200 font-bold">
                                    {lvl}
                                    <button onClick={() => removeLevel(lvl)} className="text-red-400 hover:text-red-600">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Input 
                                placeholder="Add (e.g. Level 4)" 
                                value={newLevel} 
                                onChange={(e) => setNewLevel(e.target.value)}
                                className="mb-0"
                            />
                            <Button onClick={addLevel} variant="secondary">Add</Button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* CALENDAR TAB */}
        {activeTab === 'CALENDAR' && (
            <CalendarSettings settings={settings} setSettings={setSettings} />
        )}

      </div>
    </div>
  );
};

const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);