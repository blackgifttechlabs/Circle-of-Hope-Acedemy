import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { verifyAdminPin, searchTeachers, searchStudents } from '../services/dataService';
import { UserRole, Teacher, Student } from '../types';
import { User, ShieldCheck, GraduationCap, ArrowLeft } from 'lucide-react';

interface LoginProps {
  onLogin: (role: UserRole, user: any) => void;
  showToast?: (message: string) => void;
}

export const LoginPage: React.FC<LoginProps> = ({ onLogin, showToast }) => {
  const [activeTab, setActiveTab] = useState<'ADMIN' | 'TEACHER' | 'PARENT'>('ADMIN');
  const [pin, setPin] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Check against Firebase Auth via verifyAdminPin
    const isValid = await verifyAdminPin(pin);
    
    if (isValid) {
      if (showToast) showToast('Welcome back, Admin!');
      onLogin(UserRole.ADMIN, { name: 'Administrator', id: 'admin' });
      navigate('/admin/dashboard');
    } else {
      setError('Invalid PIN.');
    }
    setLoading(false);
  };

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    setSelectedUser(null);
    setPin('');
    setError('');

    if (term.length > 1) {
      if (activeTab === 'TEACHER') {
        const results = await searchTeachers(term);
        setSearchResults(results);
      } else if (activeTab === 'PARENT') {
        const results = await searchStudents(term);
        setSearchResults(results);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleUserSelect = (user: any) => {
    setSelectedUser(user);
    setSearchResults([]);
    setSearchTerm(activeTab === 'PARENT' ? user.name : user.name);
  };

  const handleUserLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      setError('Please select a user first');
      return;
    }

    let success = false;
    let role = UserRole.TEACHER;
    let userData = selectedUser;

    if (activeTab === 'TEACHER') {
      if (selectedUser.pin === pin) {
        success = true;
        role = UserRole.TEACHER;
      }
    } else if (activeTab === 'PARENT') {
      if (selectedUser.parentPin === pin) {
        success = true;
        role = UserRole.PARENT;
        userData = { ...selectedUser, name: selectedUser.parentName };
      }
    }

    if (success) {
      if (showToast) showToast(`Welcome back, ${userData.name}!`);
      onLogin(role, userData);
      if (role === UserRole.TEACHER) navigate('/teacher/dashboard');
      if (role === UserRole.PARENT) navigate('/parent/dashboard');
    } else {
      setError('Incorrect PIN');
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0" 
        style={{ backgroundImage: 'url("https://i.ibb.co/zWNcsGPP/login-wallpaper.jpg")' }}
      />
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-coha-900 bg-opacity-80 z-0" />

      {/* Back Button */}
      <button 
        onClick={() => navigate('/')} 
        className="absolute top-6 left-6 z-10 text-white flex items-center gap-2 hover:text-coha-400 transition-colors font-medium group"
      >
        <div className="p-2 bg-white bg-opacity-10 group-hover:bg-opacity-20 transition-all">
           <ArrowLeft size={20} />
        </div>
        <span className="text-sm uppercase tracking-widest font-bold">Back to Home</span>
      </button>

      {/* Login Container */}
      <div className="bg-white w-full max-w-md shadow-2xl overflow-hidden h-[600px] flex flex-col z-10 relative">
        {/* Header */}
        <div className="p-8 text-center bg-gray-50 border-b border-gray-200 shrink-0">
          <img src="https://i.ibb.co/LzYXwYfX/logo.png" alt="COHA Logo" className="h-20 w-auto mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-coha-900 uppercase tracking-widest">Portal Login</h2>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 shrink-0">
          <button
            onClick={() => { setActiveTab('ADMIN'); setSelectedUser(null); setSearchTerm(''); setError(''); }}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider flex justify-center items-center gap-2 transition-colors ${activeTab === 'ADMIN' ? 'bg-white text-coha-900 border-b-4 border-coha-900' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            <ShieldCheck size={18} /> Admin
          </button>
          <button
            onClick={() => { setActiveTab('TEACHER'); setSelectedUser(null); setSearchTerm(''); setError(''); }}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider flex justify-center items-center gap-2 transition-colors ${activeTab === 'TEACHER' ? 'bg-white text-coha-900 border-b-4 border-coha-900' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            <User size={18} /> Teacher
          </button>
          <button
            onClick={() => { setActiveTab('PARENT'); setSelectedUser(null); setSearchTerm(''); setError(''); }}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider flex justify-center items-center gap-2 transition-colors ${activeTab === 'PARENT' ? 'bg-white text-coha-900 border-b-4 border-coha-900' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            <GraduationCap size={18} /> Parent
          </button>
        </div>

        {/* Body */}
        <div className="p-8 flex-1 overflow-y-auto relative">
          {activeTab === 'ADMIN' && (
            <form onSubmit={handleAdminLogin} className="animate-fade-in">
              <p className="mb-6 text-gray-600 text-sm">Enter your administrative PIN to access the dashboard.</p>
              <Input
                type="password"
                label="Security PIN"
                placeholder="Enter PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={4}
                autoFocus
                disabled={loading}
              />
              {error && <p className="text-red-600 mb-4 font-medium">{error}</p>}
              <Button type="submit" fullWidth disabled={loading}>
                {loading ? 'Verifying...' : 'Access Dashboard'}
              </Button>
            </form>
          )}

          {(activeTab === 'TEACHER' || activeTab === 'PARENT') && (
            <form onSubmit={handleUserLogin} className="animate-fade-in h-full">
              {!selectedUser ? (
                <div className="relative">
                   <p className="mb-6 text-gray-600 text-sm">
                    {activeTab === 'TEACHER' ? 'Search for your name to begin.' : 'Search for the student name.'}
                  </p>
                  <Input
                    label={activeTab === 'TEACHER' ? "Search Name" : "Student Name"}
                    placeholder="Start typing..."
                    value={searchTerm}
                    onChange={handleSearch}
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute top-[85px] left-0 w-full bg-white border-2 border-coha-500 z-10 max-h-48 overflow-y-auto shadow-lg">
                      {searchResults.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleUserSelect(item)}
                          className="p-3 hover:bg-coha-50 cursor-pointer border-b border-gray-100 last:border-0"
                        >
                          <p className="font-bold text-coha-900">{item.name}</p>
                          {activeTab === 'PARENT' && <p className="text-xs text-gray-500">Grade: {item.grade}</p>}
                          {activeTab === 'TEACHER' && <p className="text-xs text-gray-500">{item.subject}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="animate-fade-in">
                  <div className="bg-coha-50 p-4 mb-4 border-l-4 border-coha-500 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Selected</p>
                      <p className="font-bold text-coha-900">{selectedUser.name}</p>
                    </div>
                    <button type="button" onClick={() => { setSelectedUser(null); setSearchTerm(''); }} className="text-sm text-red-500 underline">Change</button>
                  </div>
                  <Input
                    type="password"
                    label="Enter PIN"
                    placeholder="****"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    maxLength={4}
                    autoFocus
                  />
                  {error && <p className="text-red-600 mb-4 font-medium">{error}</p>}
                  <Button type="submit" fullWidth>Login</Button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};