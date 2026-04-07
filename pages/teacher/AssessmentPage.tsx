import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStudentById, saveTeacherAssessmentDay, calculateDayPercentage, calculateFinalStage } from '../../services/dataService';
import { Student, UserRole, AssessmentDay, ABCLog } from '../../types';
import { Loader } from '../../components/ui/Loader';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, CheckCircle, Calendar, Brain, Activity, ClipboardList, Plus, Trash2, X, Heart, User, AlertTriangle, PlayCircle, ArrowRight, Loader2, Clock, Sparkles } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Toast } from '../../components/ui/Toast';
import { CustomSelect } from '../../components/ui/CustomSelect';

const THINKING_TASKS = [
    { id: 'T1', desc: 'Pile objects on top of one another' },
    { id: 'T2', desc: 'Place shapes correctly into a form board' },
    { id: 'T3', desc: 'Search for an object that is hidden' },
    { id: 'T4', desc: 'Sort objects into big and small' },
    { id: 'T5', desc: 'Arrange sticks in order of length' },
    { id: 'T6', desc: 'Sort objects by colour' },
    { id: 'T7', desc: 'Identify the odd-one-out from set of pictures' },
    { id: 'T8', desc: 'Remember where to find objects around the classroom' },
    { id: 'T9', desc: 'Arrange pictures into a correct sequence' },
    { id: 'T10', desc: 'Follow instructions to bring three objects from another room' },
    { id: 'T11', desc: 'Play a memory game to see how many can be recalled' },
    { id: 'T12', desc: 'Review: General cognitive observation' },
    { id: 'T13', desc: 'Review: Problem solving observation' },
    { id: 'T14', desc: 'Final Review: Overall readiness' },
];

const PARENT_QUESTIONS = [
    { id: 's1', text: 'Drink from a cup' },
    { id: 's2', text: 'Feed self with a spoon' },
    { id: 's3', text: 'Wash hands' },
    { id: 's4', text: 'Wash and dry him/herself' },
    { id: 's5', text: 'Dress and undress him/herself' },
    { id: 's6', text: 'Brush teeth and hair by him/herself' },
    { id: 's7', text: 'Go to the toilet by him/herself' },
    { id: 's8', text: 'Assist with simple tasks around the home' },
    { id: 's9', text: 'Can be sent around with messages' },
];

const SCORE_OPTIONS = [
    { label: '0 - No Progress', value: '0' },
    { label: '1 - Minimal', value: '1' },
    { label: '2 - Emerging', value: '2' },
    { label: '3 - Satisfactory', value: '3' },
    { label: '4 - Good', value: '4' },
    { label: '5 - Excellent', value: '5' },
];

interface AssessmentPageProps {
    userRole: UserRole;
    user?: any;
}

export const AssessmentPage: React.FC<AssessmentPageProps> = ({ userRole, user }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [student, setStudent] = useState<Student | null>(null);
    const [selectedDay, setSelectedDay] = useState<number>(1);
    const [viewMode, setViewMode] = useState<'DAILY' | 'PARENT'>('DAILY');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [finalizing, setFinalizing] = useState(false);
    const [toast, setToast] = useState({ show: false, msg: '', type: 'success' as 'success' | 'error' });
    
    const [transferModalOpen, setTransferModalOpen] = useState(false);
    const [finalSuccessModalOpen, setFinalSuccessModalOpen] = useState(false);
    const [transferClass, setTransferClass] = useState('');

    const [formState, setFormState] = useState({
        numbers: 0,
        reading: 0,
        selfCare: 0,
        behaviour: 0,
        senses: 0,
        thinkingResponse: '', 
        abcLogs: [] as ABCLog[]
    });

    const [isAbcModalOpen, setIsAbcModalOpen] = useState(false);
    const [newAbc, setNewAbc] = useState<Partial<ABCLog>>({
        antecedent: '',
        behaviour: '',
        consequence: '',
        isPositive: false
    });

    useEffect(() => {
        const fetchStudent = async () => {
            if (id) {
                const s = await getStudentById(id);
                setStudent(s);
                loadDayData(s, selectedDay);
            }
            setLoading(false);
        };
        fetchStudent();
    }, [id]);

    const loadDayData = (s: Student | null, day: number) => {
        if (!s || !s.assessment || !s.assessment.teacherAssessments[day]) {
            setFormState({
                numbers: 0, reading: 0, selfCare: 0, behaviour: 0, senses: 0,
                thinkingResponse: '',
                abcLogs: []
            });
            return;
        }

        const data = s.assessment.teacherAssessments[day];
        setFormState({
            numbers: data.scores.numbers,
            reading: data.scores.reading,
            selfCare: data.scores.selfCare,
            behaviour: data.scores.behaviour,
            senses: data.scores.senses,
            thinkingResponse: data.thinkingTask?.response || '',
            abcLogs: data.abcLogs || [] 
        });
    };

    const handleDaySelect = (day: number) => {
        setSelectedDay(day);
        setViewMode('DAILY');
        loadDayData(student, day);
    };

    const handleMainScoreChange = (field: string, val: string) => {
        const num = parseInt(val) || 0;
        setFormState(prev => ({ ...prev, [field]: num }));
    };

    const handleAddAbcLog = () => {
        if (!newAbc.behaviour) return; 

        const log: ABCLog = {
            id: uuidv4(),
            antecedent: newAbc.antecedent || 'N/A',
            behaviour: newAbc.behaviour || '',
            consequence: newAbc.consequence || 'N/A',
            isPositive: newAbc.isPositive || false,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setFormState(prev => ({
            ...prev,
            abcLogs: [...prev.abcLogs, log]
        }));
        
        setNewAbc({ antecedent: '', behaviour: '', consequence: '', isPositive: false });
        setIsAbcModalOpen(false);
    };

    const removeAbcLog = (logId: string) => {
        setFormState(prev => ({
            ...prev,
            abcLogs: prev.abcLogs.filter(log => log.id !== logId)
        }));
    };

    const handleSaveDay = async () => {
        if (!student || !id) return;
        setSaving(true);

        let thinkingScore = 0;
        if (formState.thinkingResponse === 'Yes') thinkingScore = 5;
        else if (formState.thinkingResponse === 'Yes with help') thinkingScore = 2.5;

        let abcScore = 0;
        if (formState.abcLogs.length > 0) {
            const totalAbc = formState.abcLogs.reduce((acc, log) => acc + (log.isPositive ? 5 : 0), 0);
            abcScore = parseFloat((totalAbc / formState.abcLogs.length).toFixed(2));
        } else {
             abcScore = 3; 
        }

        const dayData: AssessmentDay = {
            completed: true,
            date: new Date().toISOString(),
            scores: {
                numbers: formState.numbers,
                reading: formState.reading,
                selfCare: formState.selfCare,
                behaviour: formState.behaviour,
                senses: formState.senses
            },
            thinkingTask: {
                taskId: THINKING_TASKS[selectedDay - 1].id,
                description: THINKING_TASKS[selectedDay - 1].desc,
                response: formState.thinkingResponse as any
            },
            thinkingScore,
            abcScore,
            abcLogs: formState.abcLogs
        };

        const success = await saveTeacherAssessmentDay(id, selectedDay, dayData);
        
        if (success) {
            const updatedStudent = await getStudentById(id);
            setStudent(updatedStudent);
            setToast({ show: true, msg: `Day ${selectedDay} assessment saved.`, type: 'success' });
        } else {
            setToast({ show: true, msg: "Failed to save daily assessment.", type: 'error' });
        }
        setSaving(false);
    };

    const completedDaysCount = student?.assessment?.teacherAssessments ? Object.values(student.assessment.teacherAssessments).filter((d:any) => d.completed).length : 0;
    const isReadyToFinalize = completedDaysCount === 14;
    const isCompleted = student?.assessment?.isComplete;

    const handleFinalize = async () => {
        if (!student || !id) return;
        setFinalizing(true);
        
        try {
            const result = await calculateFinalStage(id);
            
            if (result.success && result.assignedClass) {
                const updatedStudent = await getStudentById(id);
                setStudent(updatedStudent);
                
                // Logic: If the student's assigned class cohort matches the teacher's cohort
                const isMyCohort = user && user.assignedClass && result.assignedClass.startsWith(user.assignedClass);

                if (isMyCohort && userRole === UserRole.TEACHER) {
                    setFinalSuccessModalOpen(true);
                } else if (!isMyCohort && userRole === UserRole.TEACHER) {
                    setTransferClass(result.assignedClass);
                    setTransferModalOpen(true);
                } else {
                    setToast({ show: true, msg: `Assessment Finalized! Student enrolled in ${result.assignedClass}`, type: 'success' });
                }
            } else {
                setToast({ show: true, msg: result.error || "Aggregation engine failed.", type: 'error' });
            }
        } catch (e: any) {
            setToast({ show: true, msg: `System error: ${e.message}`, type: 'error' });
        } finally {
            setFinalizing(false);
        }
    };

    if (loading || !student) return <Loader />;

    const isReadOnly = userRole === UserRole.ADMIN || student.assessment?.isComplete;

    return (
        <div className="pb-20 relative font-sans text-black">
            <Toast message={toast.msg} isVisible={toast.show} onClose={() => setToast({...toast, show: false})} variant={toast.type} />
            
            {/* Modal for Cohort Match (Finally Yours) */}
            {finalSuccessModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 animate-fade-in backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md shadow-2xl border-t-8 border-green-600 rounded-none overflow-hidden text-center p-8">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 animate-bounce">
                            <Sparkles size={40} />
                        </div>
                        <h3 className="text-2xl font-black mb-2 uppercase text-green-900 tracking-tighter">Finally Yours!</h3>
                        <p className="text-gray-600 mb-6 font-bold leading-relaxed">
                            {student.name} has completed the observation period and is now officially a member of your class.
                        </p>
                        <div className="bg-green-50 border-2 border-green-200 text-green-900 font-black text-xl py-3 px-4 rounded-none mb-8">
                            {student.assignedClass}
                        </div>
                        <Button fullWidth onClick={() => { setFinalSuccessModalOpen(false); navigate('/teacher/dashboard'); }}>
                            Open Class Register
                        </Button>
                    </div>
                </div>
            )}

            {transferModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 animate-fade-in backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md shadow-2xl border-t-8 border-orange-500 rounded-none overflow-hidden">
                        <div className="p-8 text-center text-black">
                            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-600">
                                <ArrowRight size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-2 uppercase tracking-tighter">Cohort Transfer</h3>
                            <p className="text-gray-800 mb-4 font-medium">
                                Results indicate {student.name} belongs to a different cohort:
                            </p>
                            <div className="bg-orange-50 border border-orange-200 text-orange-900 font-bold text-lg py-2 px-4 rounded-none mb-6 inline-block">
                                {transferClass}
                            </div>
                            <p className="text-xs text-gray-700 mb-6 font-bold uppercase tracking-tight">
                                Student has been moved from your register.
                            </p>
                            <Button fullWidth onClick={() => { setTransferModalOpen(false); navigate('/teacher/dashboard'); }}>
                                Return to Dashboard
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {isAbcModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white w-full max-w-lg shadow-2xl border-t-8 border-coha-900 animate-fade-in rounded-none">
                         <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <h3 className="text-xl font-bold text-coha-900 flex items-center gap-2 uppercase tracking-tighter">
                                <ClipboardList size={24}/> Behavioural Event
                            </h3>
                            <button onClick={() => setIsAbcModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase tracking-widest">Antecedent (A)</label>
                                <textarea 
                                    className="w-full p-3 border-2 border-gray-300 outline-none rounded-none bg-gray-50 h-20 text-sm focus:border-coha-500 text-black" 
                                    placeholder="Context..."
                                    value={newAbc.antecedent} 
                                    onChange={(e) => setNewAbc({...newAbc, antecedent: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase tracking-widest">Behaviour (B)</label>
                                <div className="flex gap-2 mb-2">
                                    <button onClick={() => setNewAbc({...newAbc, isPositive: true})} className={`flex-1 py-2 text-xs font-black rounded-none border-2 transition-all ${newAbc.isPositive ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}>Positive</button>
                                    <button onClick={() => setNewAbc({...newAbc, isPositive: false})} className={`flex-1 py-2 text-xs font-black rounded-none border-2 transition-all ${!newAbc.isPositive ? 'bg-red-600 border-red-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}>Negative</button>
                                </div>
                                <textarea 
                                    className="w-full p-3 border-2 border-gray-300 outline-none rounded-none bg-gray-50 h-20 text-sm focus:border-coha-500 text-black" 
                                    placeholder="Observation..."
                                    value={newAbc.behaviour} 
                                    onChange={(e) => setNewAbc({...newAbc, behaviour: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase tracking-widest">Consequence (C)</label>
                                <textarea 
                                    className="w-full p-3 border-2 border-gray-300 outline-none rounded-none bg-gray-50 h-20 text-sm focus:border-coha-500 text-black" 
                                    placeholder="Outcome..."
                                    value={newAbc.consequence} 
                                    onChange={(e) => setNewAbc({...newAbc, consequence: e.target.value})} 
                                />
                            </div>
                            <Button fullWidth onClick={handleAddAbcLog} disabled={!newAbc.behaviour}><Plus size={20} /> Add Entry</Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
                <button onClick={() => navigate(-1)} className="p-3 bg-white border border-gray-200 hover:bg-gray-50 text-coha-900 transition-all shadow-sm">
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-coha-900 uppercase tracking-tight leading-tight">{student.name}</h2>
                    <p className="text-gray-900 font-black uppercase text-[10px] tracking-[0.2em] opacity-60">Observation Tracking Profile</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1">
                    <div className="bg-white p-5 shadow-sm border border-gray-200 sticky top-24 rounded-none">
                        <h3 className="font-black text-gray-900 mb-5 flex items-center gap-2 border-b pb-2 uppercase text-[10px] tracking-[0.2em]"><Calendar size={18}/> Calendar View</h3>
                        
                        <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-4 gap-2">
                            {Array.from({ length: 14 }, (_, i) => i + 1).map((day) => {
                                const dayData = student.assessment?.teacherAssessments?.[day];
                                const isCompleted = dayData?.completed;
                                const isSelected = day === selectedDay && viewMode === 'DAILY';
                                const percentage = calculateDayPercentage(dayData);
                                
                                return (
                                    <button
                                        key={day}
                                        onClick={() => handleDaySelect(day)}
                                        className={`aspect-square flex flex-col items-center justify-center border-2 transition-all rounded-none relative overflow-hidden
                                            ${isSelected ? 'border-coha-900 bg-coha-900 text-white scale-105 shadow-md' : 
                                              isCompleted ? 'border-green-600 bg-green-50 text-green-800' : 
                                              'border-gray-200 bg-gray-50 text-gray-400 hover:border-coha-300 hover:text-coha-500'}
                                        `}
                                    >
                                        <span className="font-black text-sm">{day}</span>
                                        {isCompleted && <span className="text-[8px] font-black uppercase tracking-tighter">{percentage}%</span>}
                                    </button>
                                );
                            })}
                        </div>
                        
                        <div className="mt-8 border-t pt-5 space-y-3">
                             <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-2">Documentation</h4>
                            <button 
                                onClick={() => setViewMode('PARENT')}
                                className={`w-full text-left p-4 rounded-none flex items-center gap-3 transition-all border-2 ${viewMode === 'PARENT' ? 'bg-purple-50 border-purple-500 text-purple-900 font-bold' : 'bg-white border-gray-100 hover:bg-gray-50 text-gray-800 font-bold'}`}
                            >
                                <Heart size={20} className={viewMode === 'PARENT' ? 'text-purple-600' : 'text-gray-400'} />
                                <div className="flex-1 min-w-0">
                                    <span className="block text-sm truncate">Parent Report</span>
                                    <span className="text-[9px] text-gray-500 uppercase font-black tracking-wider">Self Care Matrix</span>
                                </div>
                                {student.assessment?.parentSelfCare && <CheckCircle size={14} className="text-green-600" />}
                            </button>
                        </div>

                        <div className="mt-8 border-t pt-5">
                            <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4">Enrollment</h4>
                            {isCompleted ? (
                                <div className="text-center bg-green-50 text-green-900 p-5 font-black border-2 border-green-600 shadow-sm">
                                    <CheckCircle className="mx-auto mb-3" size={40} />
                                    <span className="block uppercase text-[9px] tracking-widest mb-1 opacity-70">Enrollment Active</span>
                                    <span className="block text-lg font-black mt-2 leading-tight uppercase">{student.assignedClass}</span>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Progress</span>
                                        <span className="text-sm font-black text-coha-900">{completedDaysCount} / 14</span>
                                    </div>
                                    <div className="w-full bg-gray-200 h-2">
                                        <div className="bg-coha-900 h-full transition-all duration-700" style={{ width: `${(completedDaysCount/14)*100}%` }}></div>
                                    </div>
                                    <Button 
                                        fullWidth 
                                        onClick={handleFinalize} 
                                        disabled={!isReadyToFinalize || finalizing}
                                        className={isReadyToFinalize ? "bg-green-600 hover:bg-green-700 border-none shadow-xl py-4" : "bg-gray-200 opacity-30 cursor-not-allowed py-4"}
                                    >
                                        {finalizing ? (
                                            <Loader2 className="animate-spin" size={24} />
                                        ) : (
                                            <span className="flex items-center gap-3 font-black uppercase tracking-[0.1em] text-[10px]">
                                                <PlayCircle size={20} /> Finalize Period
                                            </span>
                                        )}
                                    </Button>
                                    {!isReadyToFinalize && <p className="text-[9px] text-red-600 text-center font-black uppercase tracking-tight mt-2 italic">Finish all 14 days to finalize.</p>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3 space-y-6">
                    {viewMode === 'PARENT' ? (
                        <div className="bg-white p-6 sm:p-8 shadow-sm border-l-8 border-purple-500 animate-fade-in relative text-black">
                             <h3 className="text-xl sm:text-2xl font-black text-purple-900 mb-8 flex items-center gap-3 uppercase tracking-tight">
                                <User size={28} /> Parent Self-Care Report
                             </h3>
                            {!student.assessment?.parentSelfCare ? (
                                <div className="text-center py-20 bg-gray-50 border-2 border-dashed border-gray-300">
                                    <AlertTriangle className="mx-auto text-gray-300 mb-4" size={48} />
                                    <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Awaiting parent submission</p>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="bg-purple-50 p-6 border-l-4 border-purple-400">
                                            <p className="text-[9px] font-black uppercase text-purple-600 tracking-widest mb-1">Assessment Received</p>
                                            <p className="text-lg font-black text-purple-900">{new Date(student.assessment.parentSelfCare.completedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                        </div>
                                        <div className="bg-purple-900 p-6 text-white shadow-lg">
                                            <p className="text-[9px] font-black uppercase text-purple-300 tracking-widest mb-1">Parent Scoring Index</p>
                                            <p className="text-2xl font-black">{student.assessment.parentSelfCare.calculatedScore} / 5.0</p>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white border-2 border-gray-100 overflow-hidden">
                                        <div className="p-4 bg-gray-50 border-b-2 border-gray-100 font-black uppercase text-[9px] tracking-widest text-gray-600 flex justify-between">
                                            <span>Ability Metric</span>
                                            <span>Parent Response</span>
                                        </div>
                                        <div className="divide-y-2 divide-gray-50">
                                            {PARENT_QUESTIONS.map(q => (
                                                <div key={q.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-5 hover:bg-purple-50/30 transition-colors gap-3">
                                                    <span className="text-black font-bold uppercase text-xs tracking-tight">{q.text}</span>
                                                    <span className={`font-black uppercase text-[9px] tracking-widest px-4 py-2 border-2 ${
                                                        (student.assessment?.parentSelfCare as any)[q.id] === 'Yes' ? 'bg-green-100 text-green-700 border-green-200' :
                                                        (student.assessment?.parentSelfCare as any)[q.id] === 'No' ? 'bg-red-100 text-red-700 border-red-200' :
                                                        'bg-yellow-100 text-yellow-800 border-yellow-200'
                                                    }`}>
                                                        {(student.assessment?.parentSelfCare as any)[q.id]}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {student.assessment.parentSelfCare.comments && (
                                        <div className="bg-gray-50 p-6 border-l-8 border-gray-300 shadow-inner">
                                            <p className="text-[9px] font-black uppercase text-gray-500 tracking-widest mb-3">Contextual Parent Feedback</p>
                                            <p className="italic text-black text-lg font-medium leading-relaxed">"{student.assessment.parentSelfCare.comments}"</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="bg-white border-2 border-coha-900 shadow-xl overflow-hidden mb-8">
                                <div className="p-5 sm:p-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6">
                                    <div className="flex items-center gap-6">
                                        <div className="bg-coha-900 text-white w-16 h-16 sm:w-20 sm:h-20 flex flex-col items-center justify-center rounded-none shadow-lg shrink-0">
                                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Day</span>
                                            <span className="text-3xl sm:text-4xl font-black leading-none">{selectedDay}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-xl sm:text-2xl font-black text-coha-900 uppercase tracking-tighter leading-none mb-1">Teacher Log</h3>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Observation Window</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-8">
                                        <div className="bg-gray-50 p-4 border-2 border-gray-100 flex-1 sm:flex-none flex flex-col justify-center">
                                            <span className="block text-[8px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">Daily Log Mean</span>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl font-black text-coha-900">{student.assessment?.teacherAssessments?.[selectedDay]?.dailyTotalScore || '0.0'}</span>
                                                <span className="text-xs font-black text-gray-300">/ 5.0</span>
                                            </div>
                                        </div>
                                        
                                        {student.assessment?.teacherAssessments?.[selectedDay]?.completed ? (
                                            <div className="bg-green-600 text-white px-6 py-4 flex items-center justify-center gap-3 shadow-lg">
                                                <CheckCircle size={20} />
                                                <span className="font-black uppercase text-[10px] tracking-[0.2em]">Verified Entry</span>
                                            </div>
                                        ) : (
                                            <div className="bg-yellow-500 text-white px-6 py-4 flex items-center justify-center gap-3 shadow-lg">
                                                <Clock size={20} />
                                                <span className="font-black uppercase text-[10px] tracking-[0.2em]">Observation Active</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 sm:p-8 shadow-sm border border-gray-200 rounded-none text-black font-sans">
                                <h4 className="font-black text-gray-900 mb-8 flex items-center gap-3 uppercase tracking-[0.2em] text-[10px]">
                                    <Activity className="text-coha-500" size={18}/> 1. CORE DOMAIN SCORING (0.0 to 5.0)
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-5 gap-6">
                                    {['Numbers', 'Reading', 'SelfCare', 'Behaviour', 'Senses'].map((field) => (
                                        <div key={field}>
                                            <label className="block text-[9px] font-black text-gray-400 tracking-widest mb-2 uppercase">{field}</label>
                                            <CustomSelect 
                                                value={String((formState as any)[field.charAt(0).toLowerCase() + field.slice(1)])}
                                                onChange={(val) => !isReadOnly && handleMainScoreChange(field.charAt(0).toLowerCase() + field.slice(1), val)}
                                                options={SCORE_OPTIONS}
                                                placeholder="Score"
                                                className="mb-0"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                             <div className="bg-white p-6 sm:p-8 shadow-sm border border-gray-200 rounded-none text-black">
                                <h4 className="font-black text-gray-900 mb-6 flex items-center gap-3 uppercase tracking-[0.2em] text-[10px]">
                                    <Brain className="text-purple-600" size={18}/> 2. COGNITIVE: LEARN TO THINK
                                </h4>
                                <div className="p-6 sm:p-8 bg-purple-50 border-l-8 border-purple-600 mb-8 shadow-inner">
                                    <p className="text-lg sm:text-xl font-black text-purple-900 leading-[1.2] uppercase tracking-tighter">{THINKING_TASKS[selectedDay - 1].desc}</p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    {['Yes', 'Yes with help', 'No'].map(opt => (
                                        <button 
                                            key={opt} 
                                            onClick={() => !isReadOnly && setFormState(prev => ({...prev, thinkingResponse: opt}))} 
                                            className={`flex-1 py-4 sm:py-6 border-4 font-black uppercase tracking-[0.1em] text-[10px] transition-all ${formState.thinkingResponse === opt ? 'bg-purple-600 border-purple-600 text-white shadow-2xl translate-y-[-4px]' : 'bg-white border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-900'}`} 
                                            disabled={isReadOnly}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="bg-white p-6 sm:p-8 shadow-sm border border-gray-200 rounded-none text-black">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 border-b-2 border-gray-100 pb-5 gap-4">
                                    <h4 className="font-black text-gray-900 flex items-center gap-3 uppercase tracking-[0.2em] text-[10px]">
                                        <ClipboardList className="text-orange-600" size={18}/> 3. BEHAVIOURAL EVENTS (ABC)
                                    </h4>
                                    {!isReadOnly && !isCompleted && (
                                        <Button onClick={() => setIsAbcModalOpen(true)} className="w-full sm:w-auto py-3 px-8 text-[10px] font-black uppercase tracking-[0.2em] border-4 border-coha-900 hover:bg-coha-900 shadow-md">
                                            <Plus size={16}/> New Entry
                                        </Button>
                                    )}
                                </div>
                                <div className="space-y-8">
                                    {formState.abcLogs.map(log => (
                                        <div key={log.id} className={`p-1 border-4 transition-all shadow-lg ${log.isPositive ? 'border-green-600' : 'border-red-600'}`}>
                                            <div className={`p-4 sm:p-6 ${log.isPositive ? 'bg-green-50' : 'bg-red-50'}`}>
                                                <div className="flex justify-between font-black text-[9px] tracking-[0.3em] uppercase mb-6 border-b border-black/5 pb-2">
                                                    <span className="text-gray-500">{log.time}</span>
                                                    <span className={log.isPositive ? 'text-green-700' : 'text-red-700'}>{log.isPositive ? 'Positive Construct' : 'Negative Reaction'}</span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 text-black">
                                                    <div>
                                                        <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2 opacity-60">Antecedent (A)</span>
                                                        <p className="font-bold text-sm leading-relaxed">{log.antecedent}</p>
                                                    </div>
                                                    <div className="bg-white/40 p-3 shadow-inner">
                                                        <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2 opacity-60">Behaviour (B)</span>
                                                        <p className="font-black text-sm leading-relaxed">{log.behaviour}</p>
                                                    </div>
                                                    <div>
                                                        <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2 opacity-60">Consequence (C)</span>
                                                        <p className="font-bold text-sm leading-relaxed">{log.consequence}</p>
                                                    </div>
                                                </div>
                                                {!isReadOnly && (
                                                    <button onClick={() => removeAbcLog(log.id)} className="mt-6 text-red-600 font-black uppercase text-[8px] tracking-widest hover:underline flex items-center gap-2 border-2 border-red-100 px-3 py-1 hover:bg-white transition-all">
                                                        <Trash2 size={12}/> Clear Log
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {formState.abcLogs.length === 0 && (
                                        <div className="py-20 text-center bg-gray-50 border-4 border-dashed border-gray-200">
                                            <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-[10px]">No active logs recorded</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {!isReadOnly && !isCompleted && (
                                <div className="flex justify-end pt-10">
                                    <Button onClick={handleSaveDay} disabled={saving} className="w-full md:w-auto px-16 py-6 text-sm font-black uppercase tracking-[0.2em] bg-coha-900 text-white flex items-center gap-5 shadow-2xl transition-all hover:translate-y-[-4px] active:scale-95">
                                        {saving ? (
                                            <>
                                                <Loader2 className="animate-spin" size={24} />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle size={24} />
                                                Save Day {selectedDay} Entry
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};