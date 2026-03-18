import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { addTeacher, getTeachers, deleteTeacher, updateTeacher, getSystemSettings } from '../../services/dataService';
import { Teacher, SystemSettings } from '../../types';
import { Plus, Search, Trash2, Edit2 } from 'lucide-react';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

export const TeachersPage: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [assignedClass, setAssignedClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);

  const fetchData = async () => {
    const data = await getTeachers();
    const settingsData = await getSystemSettings();
    setTeachers(data);
    setSettings(settingsData);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (teacher: Teacher) => {
    setName(teacher.name);
    setSubject(teacher.subject || '');
    setAssignedClass(teacher.assignedClass || '');
    setEditingId(teacher.id);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setName('');
    setSubject('');
    setAssignedClass('');
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    let success = false;
    if (editingId) {
        success = await updateTeacher(editingId, { name, subject, assignedClass });
    } else {
        success = await addTeacher(name, subject, assignedClass);
    }

    if (success) {
      handleFormClose();
      fetchData();
    }
    setLoading(false);
  };

  const confirmDelete = (teacher: Teacher) => {
    setTeacherToDelete(teacher);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (teacherToDelete) {
        setLoading(true);
        const success = await deleteTeacher(teacherToDelete.id);
        if (success) {
            setDeleteModalOpen(false);
            setTeacherToDelete(null);
            fetchData();
        }
        setLoading(false);
    }
  };

  const filteredTeachers = teachers.filter(t => 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (t.subject && t.subject.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // Build Class Options from Settings
  const getClassOptions = () => {
      if (!settings) return [];
      const grades = settings.grades.map(g => ({ label: g, value: g }));
      
      // For Special Needs, teachers might be assigned to a Level or a Stage
      // Let's create general Level buckets for now, since stages are dynamic
      const levels = settings.specialNeedsLevels.map(l => ({ label: `${l} (Special Needs)`, value: l }));
      
      return [...grades, ...levels];
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-coha-900">Teachers</h2>
          <p className="text-gray-600">Manage faculty members.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus size={20} /> {editingId ? 'Edit Teacher' : 'Add Teacher'}
        </Button>
      </div>

      <ConfirmModal 
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Teacher?"
        message={`Are you sure you want to delete ${teacherToDelete?.name}? This action cannot be undone.`}
        isLoading={loading}
      />

      {showForm && (
        <div className="bg-white p-6 mb-8 border-t-4 border-coha-500 shadow-lg animate-fade-in">
          <h3 className="text-lg font-bold mb-4">{editingId ? 'Edit Teacher Details' : 'Add New Teacher'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="Full Name" 
              placeholder="e.g. Mrs. Sarah Smith" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input 
              label="Subject / Role" 
              placeholder="e.g. Mathematics" 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
            <div className="md:col-span-2">
                <CustomSelect 
                    label="Assigned Class / Division"
                    value={assignedClass}
                    options={getClassOptions()}
                    onChange={setAssignedClass}
                    placeholder="Select class..."
                />
            </div>
            
            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
              <Button type="button" variant="outline" onClick={handleFormClose}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : (editingId ? 'Update Teacher' : 'Save Teacher')}</Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:border-coha-500 outline-none rounded-none"
              placeholder="Search teachers..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-bold">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Assigned Class</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTeachers.map((teacher) => (
                <tr key={teacher.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-bold text-coha-900">{teacher.name}</td>
                  <td className="px-6 py-4">{teacher.subject}</td>
                  <td className="px-6 py-4">
                      {teacher.assignedClass ? <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 font-bold rounded">{teacher.assignedClass}</span> : <span className="text-gray-400 italic">Unassigned</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(teacher)} className="text-coha-500 hover:text-coha-700 p-1">
                            <Edit2 size={18} />
                        </button>
                        <button onClick={() => confirmDelete(teacher)} className="text-red-400 hover:text-red-600 p-1">
                            <Trash2 size={18} />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTeachers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No teachers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};