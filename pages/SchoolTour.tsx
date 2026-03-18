import React, { useState, useEffect, useRef } from 'react';
import { getSystemSettings } from '../services/dataService';
import { SystemSettings } from '../types';
import {
  Calendar, ArrowLeft, Users, Home, BookOpen,
  MapPin, Trophy, Monitor, MessageSquare,
  UserPlus, Newspaper, ChevronRight, X, ChevronLeft,
  GraduationCap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

/* ─────────────────────────────────────────────
   DESIGN TOKENS — Light M3
   bg  = chip/container fill (tonal surface)
   fg  = icon + text on chip
   accent = bold colour for headers, borders
───────────────────────────────────────────── */
const SECTIONS = [
  { id: 'calendar',       title: 'Calendar',    icon: Calendar,      bg: '#E8EAF6', fg: '#283593', accent: '#3949AB' },
  { id: 'classrooms',     title: 'Classrooms',  icon: BookOpen,      bg: '#E8F5E9', fg: '#2E7D32', accent: '#388E3C' },
  { id: 'playgrounds',    title: 'Playgrounds', icon: MapPin,        bg: '#FBE9E7', fg: '#BF360C', accent: '#E64A19' },
  { id: 'administration', title: 'Admin',       icon: Users,         bg: '#F3E5F5', fg: '#6A1B9A', accent: '#7B1FA2' },
  { id: 'sports',         title: 'Sports',      icon: Trophy,        bg: '#FFEBEE', fg: '#B71C1C', accent: '#C62828' },
  { id: 'computers',      title: 'Computers',   icon: Monitor,       bg: '#E0F7FA', fg: '#006064', accent: '#00838F' },
  { id: 'meetings',       title: 'Meetings',    icon: MessageSquare, bg: '#F1F8E9', fg: '#33691E', accent: '#558B2F' },
  { id: 'enrolments',     title: 'Enrolments',  icon: UserPlus,      bg: '#E3F2FD', fg: '#0D47A1', accent: '#1565C0' },
  { id: 'hostel',         title: 'Hostel',      icon: Home,          bg: '#EFEBE9', fg: '#4E342E', accent: '#5D4037' },
  { id: 'news',           title: 'News',        icon: Newspaper,     bg: '#ECEFF1', fg: '#37474F', accent: '#455A64' },
];

const ADMIN_MEMBERS = [
  {
    name: 'Victoria Joel',
    role: 'Founder & Principal',
    img: 'https://i.ibb.co/My2rxxYJ/founder.png',
    bio: 'Victoria Joel is a 31-year-old social entrepreneur and an Olafika SMEs and Mentorship graduate, awarded the 2020 Most Diligent Entrepreneur of the Year. She is a devoted, trained special needs teacher with seven years of teaching experience in four different schools. Trained by SES Experts from Germany, she has passionately advocated for children with Autism Spectrum Disorder and other intellectual disabilities for the past ten years, serving as an expert and mentor.',
  },
  { name: 'Staff Member', role: 'Senior Teacher', img: 'https://i.ibb.co/BVZm6gpr/FB-IMG-1773821340566.jpg', bio: "A dedicated educator committed to nurturing every child's potential and fostering an inclusive learning environment." },
  { name: 'Staff Member', role: 'Teacher',        img: 'https://i.ibb.co/jPW3ygwd/FB-IMG-1773821327455.jpg', bio: 'Passionate about early childhood development and creating engaging, hands-on learning experiences.' },
  { name: 'Staff Member', role: 'Teacher',        img: 'https://i.ibb.co/ccbr1hwS/FB-IMG-1773821330242.jpg', bio: 'Brings creativity and enthusiasm to the classroom, inspiring students to discover their unique talents.' },
  { name: 'Staff Member', role: 'Teacher',        img: 'https://i.ibb.co/Zzqtr5PM/FB-IMG-1773821331313.jpg', bio: 'Specialises in special needs support with a warm, patient approach that helps every learner thrive.' },
  { name: 'Staff Member', role: 'Support Staff',  img: 'https://i.ibb.co/3mCQQdvm/FB-IMG-1773821333719.jpg', bio: 'Dedicated to providing a safe and supportive environment for all students and staff.' },
  { name: 'Staff Member', role: 'Support Staff',  img: 'https://i.ibb.co/p6ntPPXW/FB-IMG-1773821335935.jpg', bio: 'Works tirelessly to ensure the smooth day-to-day operations of our school community.' },
];

const CLASSROOM_IMGS = [
  'https://i.ibb.co/nqB1HtM1/FB-IMG-1773820791191.jpg','https://i.ibb.co/k60qsKdS/FB-IMG-1773820794700.jpg',
  'https://i.ibb.co/qLztb258/FB-IMG-1773820801712.jpg','https://i.ibb.co/b5dV3fnV/FB-IMG-1773820803765.jpg',
  'https://i.ibb.co/j7pVvJ8/FB-IMG-1773820806633.jpg','https://i.ibb.co/bVwhGTJ/FB-IMG-1773820808841.jpg',
  'https://i.ibb.co/k6P01cwQ/FB-IMG-1773821200205.jpg','https://i.ibb.co/BRSK7vd/FB-IMG-1773821203628.jpg',
  'https://i.ibb.co/qFc6C3FH/FB-IMG-1773821208074.jpg','https://i.ibb.co/Wvc0JvbJ/FB-IMG-1773821225289.jpg',
  'https://i.ibb.co/BHTLLWjZ/FB-IMG-1773821227125.jpg','https://i.ibb.co/6VKfCVq/FB-IMG-1773821229250.jpg',
];
const MEETING_IMGS = [
  'https://i.ibb.co/hx9NN0Cj/FB-IMG-1773820712096.jpg','https://i.ibb.co/8DS35ywP/FB-IMG-1773820714022.jpg',
  'https://i.ibb.co/xSpS4Z9S/FB-IMG-1773820716040.jpg','https://i.ibb.co/NgzMRxR8/FB-IMG-1773820718254.jpg',
  'https://i.ibb.co/Fk4hpkCw/FB-IMG-1773820720028.jpg','https://i.ibb.co/ksBrWKmX/FB-IMG-1773820722285.jpg',
  'https://i.ibb.co/XZzhgLXG/FB-IMG-1773820725136.jpg','https://i.ibb.co/MyK9RVzr/FB-IMG-1773820727394.jpg',
  'https://i.ibb.co/wrKR8PRJ/FB-IMG-1773820729084.jpg','https://i.ibb.co/LDygfVQZ/FB-IMG-1773820734160.jpg',
  'https://i.ibb.co/9m7SnBGm/FB-IMG-1773820735735.jpg','https://i.ibb.co/yFd6B769/FB-IMG-1773820738581.jpg',
];
const COMPUTER_IMGS = [
  'https://i.ibb.co/JFg9V91r/FB-IMG-1773820747693.jpg','https://i.ibb.co/NnGDY3Sk/FB-IMG-1773820749217.jpg',
  'https://i.ibb.co/zhvGWmmC/FB-IMG-1773820751654.jpg','https://i.ibb.co/fdss5n98/FB-IMG-1773821106848.jpg',
  'https://i.ibb.co/pvxRFqfd/FB-IMG-1773821108615.jpg','https://i.ibb.co/xqjNn1f5/FB-IMG-1773821110889.jpg',
];
const SPORTS_IMGS = [
  'https://i.ibb.co/tPq4xqw6/FB-IMG-1773821498241.jpg','https://i.ibb.co/4Zj9PKJ9/FB-IMG-1773821501109.jpg',
  'https://i.ibb.co/v4sgnJbd/FB-IMG-1773821503156.jpg','https://i.ibb.co/Y7TqkfFG/FB-IMG-1773821505329.jpg',
  'https://i.ibb.co/TMw5wPhQ/FB-IMG-1773821507161.jpg','https://i.ibb.co/HTnq9kQm/FB-IMG-1773821509593.jpg',
  'https://i.ibb.co/rL9H9c2/FB-IMG-1773821517053.jpg','https://i.ibb.co/1JZr22hv/FB-IMG-1773821521002.jpg',
  'https://i.ibb.co/nqVd4M8P/FB-IMG-1773821524944.jpg','https://i.ibb.co/PsFf45RX/FB-IMG-1773821530880.jpg',
  'https://i.ibb.co/cX3mSL53/FB-IMG-1773821533601.jpg','https://i.ibb.co/Q3kLzVJm/FB-IMG-1773821538373.jpg',
];

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

/* ─── utils ─── */
function parseDate(s: string): Date | null {
  if (!s) return null; const d = new Date(s); return isNaN(d.getTime()) ? null : d;
}
function fmtDate(s: string) {
  const d = parseDate(s); if (!d) return 'TBD';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
}
function dateRange(start: string, end: string): Date[] {
  const s=parseDate(start),e=parseDate(end); if(!s||!e) return [];
  const dates:Date[]=[]; const cur=new Date(s);
  while(cur<=e){dates.push(new Date(cur));cur.setDate(cur.getDate()+1);} return dates;
}
function getMonthsInRange(start: string, end: string) {
  const s=parseDate(start),e=parseDate(end); if(!s||!e) return [];
  const months:{year:number;month:number}[]=[];
  const cur=new Date(s.getFullYear(),s.getMonth(),1);
  const last=new Date(e.getFullYear(),e.getMonth(),1);
  while(cur<=last){months.push({year:cur.getFullYear(),month:cur.getMonth()});cur.setMonth(cur.getMonth()+1);}
  return months;
}

/* ─── Lightbox ─── */
const Lightbox: React.FC<{images:string[];index:number;onClose:()=>void;onNav:(i:number)=>void}> = ({images,index,onClose,onNav}) => (
  <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
    className="fixed inset-0 z-[200] flex items-center justify-center"
    style={{backdropFilter:'blur(20px)',backgroundColor:'rgba(0,0,0,0.82)'}}
    onClick={onClose}>
    <button onClick={e=>{e.stopPropagation();onNav((index-1+images.length)%images.length);}}
      className="absolute left-3 sm:left-6 z-10 w-11 h-11 rounded-full flex items-center justify-center text-white"
      style={{backgroundColor:'rgba(255,255,255,0.18)'}}>
      <ChevronLeft size={20}/>
    </button>
    <motion.img key={index} initial={{scale:0.85,opacity:0}} animate={{scale:1,opacity:1}}
      transition={{type:'spring',damping:22}} src={images[index]} alt=""
      className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl"
      onClick={e=>e.stopPropagation()} referrerPolicy="no-referrer"/>
    <button onClick={e=>{e.stopPropagation();onNav((index+1)%images.length);}}
      className="absolute right-3 sm:right-6 z-10 w-11 h-11 rounded-full flex items-center justify-center text-white"
      style={{backgroundColor:'rgba(255,255,255,0.18)'}}>
      <ChevronRight size={20}/>
    </button>
    <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-white"
      style={{backgroundColor:'rgba(255,255,255,0.18)'}}>
      <X size={16}/>
    </button>
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs font-bold">{index+1} / {images.length}</div>
  </motion.div>
);

/* ─── Photo grid ─── */
const PhotoGrid: React.FC<{images:string[]}> = ({images}) => {
  const [lb,setLb]=useState<number|null>(null);
  return (
    <>
      <div className="columns-2 sm:columns-3 gap-2 space-y-2">
        {images.map((src,i)=>(
          <div key={i} className="break-inside-avoid overflow-hidden rounded-2xl cursor-zoom-in group shadow-sm"
            onClick={()=>setLb(i)}>
            <img src={src} alt="" className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
              referrerPolicy="no-referrer"/>
          </div>
        ))}
      </div>
      <AnimatePresence>
        {lb!==null&&<Lightbox images={images} index={lb} onClose={()=>setLb(null)} onNav={setLb}/>}
      </AnimatePresence>
    </>
  );
};

/* ─── Calendar month ─── */
const CalMonth: React.FC<{
  year:number;month:number;termDates:Date[];
  holidays:{name:string;start:Date;end:Date}[];accent:string;
}> = ({year,month,termDates,holidays,accent}) => {
  const firstDay=new Date(year,month,1).getDay();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const cells:(number|null)[]=[...Array(firstDay).fill(null),...Array.from({length:daysInMonth},(_,i)=>i+1)];
  const getHoliday=(day:number)=>{
    const d=new Date(year,month,day);
    return holidays.find(h=>d>=h.start&&d<=h.end);
  };
  const isTermDay=(day:number)=>termDates.some(td=>sameDay(td,new Date(year,month,day)));
  const isWeekend=(day:number)=>{const dow=new Date(year,month,day).getDay();return dow===0||dow===6;};
  return (
    <div className="rounded-2xl overflow-hidden shadow-sm" style={{backgroundColor:'#FFFFFF',border:`1px solid ${accent}22`}}>
      <div className="px-4 py-2.5 font-black text-xs tracking-widest uppercase flex items-center gap-2 text-white"
        style={{backgroundColor:accent}}>
        <span>{MONTH_NAMES[month]}</span><span className="opacity-70">{year}</span>
      </div>
      <div className="p-2">
        <div className="grid grid-cols-7 text-center mb-1">
          {DAY_NAMES.map(d=>(
            <div key={d} className="py-1 text-[9px] font-black uppercase tracking-wider" style={{color:'#9E9E9E'}}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day,i)=>{
            if(!day) return <div key={i}/>;
            const holiday=getHoliday(day);
            const term=isTermDay(day);
            const weekend=isWeekend(day);
            let bg='transparent',color='#424242',dot='';
            if(holiday){bg='#E8F5E9';color='#2E7D32';dot='#43A047';}
            else if(term&&!weekend){bg=accent+'18';color='#212121';}
            if(weekend&&!holiday){color='#BDBDBD';}
            return (
              <div key={i} className="flex flex-col items-center justify-center rounded-lg py-1 text-[11px] font-bold transition-all"
                title={holiday?.name} style={{backgroundColor:bg,color}}>
                {day}
                {dot&&<div className="w-1 h-1 rounded-full" style={{backgroundColor:dot}}/>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ─── Reveal ─── */
const Reveal: React.FC<{children:React.ReactNode;visible:boolean}> = ({children,visible}) => (
  <AnimatePresence>
    {visible&&(
      <motion.div initial={{opacity:0,y:44}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-16}}
        transition={{duration:0.58,ease:[0.22,1,0.36,1]}}>
        {children}
      </motion.div>
    )}
  </AnimatePresence>
);

/* ─── Section header ─── */
const SectionHeader: React.FC<{id:string;title:string}> = ({id,title}) => {
  const s=SECTIONS.find(x=>x.id===id)!;
  return (
    <div className="flex items-center gap-3 mb-8">
      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{backgroundColor:s.accent}}>
        {React.createElement(s.icon,{size:18,color:'#fff'})}
      </div>
      <h2 className="text-3xl font-black tracking-tight leading-none" style={{color:'#1A1A2E',fontFamily:"'Outfit','Nunito',sans-serif"}}>{title}</h2>
    </div>
  );
};

/* ═════════════════════════════
   MAIN COMPONENT
═════════════════════════════ */
export const SchoolTour: React.FC = () => {
  const [settings,setSettings]             = useState<SystemSettings|null>(null);
  const [calMode,setCalMode]               = useState<'SCHOOL'|'HOSTEL'|'TEACHER'>('SCHOOL');
  const [selectedTerm,setSelectedTerm]     = useState('');
  const [activeSection,setActiveSection]   = useState('calendar');
  const [visibleSections,setVisibleSections] = useState<Set<string>>(new Set(['calendar']));
  const [activeAdmin,setActiveAdmin]       = useState(0);
  const sectionRefs = useRef<Record<string,HTMLDivElement|null>>({});
  const navRef      = useRef<HTMLDivElement>(null);
  const navigate    = useNavigate();

  useEffect(()=>{getSystemSettings().then(d=>d&&setSettings(d));},[]);

  useEffect(()=>{
    const obs:IntersectionObserver[]=[];
    SECTIONS.forEach(({id})=>{
      const el=sectionRefs.current[id]; if(!el) return;
      const o=new IntersectionObserver(([e])=>{
        if(e.isIntersecting){setVisibleSections(p=>new Set([...p,id]));setActiveSection(id);}
      },{threshold:0.1});
      o.observe(el); obs.push(o);
    });
    return()=>obs.forEach(o=>o.disconnect());
  },[]);

  const scrollTo=(id:string)=>{
    setVisibleSections(p=>new Set([...p,id]));
    setTimeout(()=>sectionRefs.current[id]?.scrollIntoView({behavior:'smooth',block:'start'}),50);
    const chip=navRef.current?.querySelector(`[data-id="${id}"]`) as HTMLElement|null;
    if(chip&&navRef.current) navRef.current.scrollTo({left:chip.offsetLeft-navRef.current.offsetWidth/2+chip.offsetWidth/2,behavior:'smooth'});
  };

  /* calendar */
  const schoolCals=settings?.schoolCalendars||[];
  const hostelCals=settings?.hostelCalendars||[];
  const calList=calMode==='HOSTEL'?hostelCals:schoolCals;
  const activeCal=calList.find(c=>c.id===selectedTerm)||calList[0];
  useEffect(()=>{if(calList.length&&!selectedTerm)setSelectedTerm(calList[0]?.id||'');},[calList,selectedTerm]);

  const buildHolidays=(term:{holidays?:{name:string;startDate:string;endDate?:string}[]})=>
    (term?.holidays||[]).map(h=>({name:h.name,start:new Date(h.startDate),end:new Date(h.endDate||h.startDate)}));

  const activeSchoolCal = calMode!=='HOSTEL' ? (activeCal as typeof schoolCals[0]|undefined) : undefined;
  const activeHostelCal = calMode==='HOSTEL'  ? (activeCal as typeof hostelCals[0]|undefined) : undefined;

  const openDate  = calMode==='HOSTEL' ? activeHostelCal?.hostelOpeningDate  : activeSchoolCal?.learnersOpeningDate;
  const closeDate = calMode==='HOSTEL' ? activeHostelCal?.hostelClosingDate  : activeSchoolCal?.learnersClosingDate;
  const calMonths = activeCal?getMonthsInRange(openDate||'',closeDate||''):[];
  const termDates = activeCal?dateRange(openDate||'',closeDate||''):[];
  const holidays  = activeCal?buildHolidays(activeCal):[];
  const totalDays = calMode==='HOSTEL' ? (activeHostelCal?.hostelDays||0) : (activeSchoolCal?.schoolDays||0);

  const activeMeta=SECTIONS.find(s=>s.id===activeSection)!;

  return (
    <div className="min-h-screen font-sans" style={{backgroundColor:'#F8F9FC',color:'#1A1A2E'}}>

      {/* ── TOP BAR ── */}
      <div className="sticky top-0 z-50 bg-white" style={{borderBottom:'1px solid #E5E7EB',boxShadow:'0 1px 8px rgba(0,0,0,0.06)'}}>
        <div className="h-14 flex items-center px-4 gap-3">
          <button onClick={()=>navigate('/')}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-gray-100">
            <ArrowLeft size={20} className="text-gray-500"/>
          </button>
          <span className="text-base font-black tracking-tight flex-1" style={{color:'#1A1A2E',fontFamily:"'Outfit','Nunito',sans-serif"}}>
            School Tour
          </span>
          <motion.div key={activeSection} initial={{opacity:0,x:8}} animate={{opacity:1,x:0}}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest"
            style={{backgroundColor:activeMeta.bg,color:activeMeta.fg}}>
            {React.createElement(activeMeta.icon,{size:12})}
            {activeMeta.title}
          </motion.div>
        </div>

        {/* NAV CHIPS */}
        <div ref={navRef} className="flex overflow-x-auto no-scrollbar px-3 pb-2.5 pt-1 gap-2 bg-white">
          {SECTIONS.map(s=>{
            const active=activeSection===s.id;
            return (
              <button key={s.id} data-id={s.id} onClick={()=>scrollTo(s.id)}
                className="flex-shrink-0 flex items-center gap-1.5 px-4 h-8 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-200 whitespace-nowrap"
                style={{
                  backgroundColor:active?s.accent:s.bg,
                  color:active?'#fff':s.fg,
                  boxShadow:active?`0 2px 10px ${s.accent}55`:'none',
                }}>
                <s.icon size={11}/>{s.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── HERO ── */}
      <div className="relative h-[52vh] min-h-[300px] overflow-hidden">
        <img src="https://i.ibb.co/tTYh85bZ/hero-1.jpg" alt="School"
          className="w-full h-full object-cover" referrerPolicy="no-referrer"/>
        <div className="absolute inset-0"
          style={{background:'linear-gradient(to top,rgba(248,249,252,1) 0%,rgba(248,249,252,0.2) 55%,transparent 100%)'}}/>
        <div className="absolute bottom-0 left-0 px-6 pb-10">
          <motion.h1 initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{delay:0.1,duration:0.7}}
            className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-none"
            style={{color:'#1A1A2E',fontFamily:"'Outfit','Nunito',sans-serif",textShadow:'0 2px 20px rgba(255,255,255,0.6)'}}>
            {settings?.schoolName||'Circle of Hope'}
          </motion.h1>
          <motion.p initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.25}}
            className="font-semibold mt-2 text-sm tracking-widest uppercase" style={{color:'#555'}}>
            Excellence · Inclusion · Growth
          </motion.p>
        </div>
      </div>

      {/* ═════════════════
          CALENDAR
      ═════════════════ */}
      <div ref={el=>sectionRefs.current['calendar']=el} className="scroll-mt-28">
        <Reveal visible={visibleSections.has('calendar')}>
          {/* section label */}
          <div className="px-6 pt-10 pb-5 flex items-center gap-3" style={{backgroundColor:'#EEF0FB'}}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{backgroundColor:'#3949AB'}}>
              <Calendar size={18} color="#fff"/>
            </div>
            <h2 className="text-3xl font-black tracking-tight leading-none" style={{color:'#1A1A2E',fontFamily:"'Outfit','Nunito',sans-serif"}}>Academic Calendar</h2>
          </div>

          <div className="flex flex-col lg:flex-row" style={{minHeight:'80vh'}}>
            {/* SIDEBAR */}
            <div className="lg:w-[28%] lg:sticky lg:top-[108px] lg:self-start flex-shrink-0"
              style={{backgroundColor:'#FFFFFF',borderRight:'1px solid #E5E7EB'}}>
              <div className="p-5" style={{borderBottom:'1px solid #F3F4F6'}}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{color:'#9CA3AF'}}>View type</p>
                <div className="flex flex-col gap-2">
                  {(['SCHOOL','HOSTEL','TEACHER'] as const).map(m=>(
                    <button key={m} onClick={()=>setCalMode(m)}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                      style={calMode===m
                        ?{backgroundColor:'#3949AB',color:'#fff',boxShadow:'0 2px 12px #3949AB44'}
                        :{backgroundColor:'#F9FAFB',color:'#6B7280'}}>
                      {m==='TEACHER'?<GraduationCap size={14}/>:<Calendar size={14}/>}
                      {m==='TEACHER'?'Teachers Calendar':m==='SCHOOL'?'School Terms':'Hostel Terms'}
                    </button>
                  ))}
                </div>
              </div>
              {calMode!=='TEACHER'&&(
                <div className="p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{color:'#9CA3AF'}}>Select term</p>
                  <div className="flex flex-col gap-1">
                    {calList.map(term=>(
                      <button key={term.id} onClick={()=>setSelectedTerm(term.id)}
                        className="text-left px-4 py-3 rounded-xl text-sm font-bold transition-all"
                        style={selectedTerm===term.id
                          ?{backgroundColor:'#EEF0FB',color:'#3949AB',borderLeft:'3px solid #3949AB'}
                          :{backgroundColor:'transparent',color:'#6B7280',borderLeft:'3px solid transparent'}}>
                        {term.termName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CALENDAR MAIN */}
            <div className="flex-1 p-5 lg:p-8" style={{backgroundColor:'#F8F9FC'}}>
              {calMode==='TEACHER'?(
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <GraduationCap size={48} className="mb-4" style={{color:'#D1D5DB'}}/>
                  <p className="font-bold text-sm" style={{color:'#9CA3AF'}}>Teacher calendar coming soon</p>
                </div>
              ):activeCal?(
                <>
                  {/* stat cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                    <div className="px-4 py-4 rounded-2xl bg-white shadow-sm" style={{border:'1px solid #E8EAF6'}}>
                      <p className="text-2xl font-black" style={{color:'#3949AB'}}>{totalDays}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest mt-0.5" style={{color:'#9CA3AF'}}>
                        {calMode==='HOSTEL'?'Hostel Days':'School Days'}
                      </p>
                    </div>
                    <div className="px-4 py-4 rounded-2xl bg-white shadow-sm" style={{border:'1px solid #E8F5E9'}}>
                      <p className="text-2xl font-black" style={{color:'#388E3C'}}>{holidays.length}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest mt-0.5" style={{color:'#9CA3AF'}}>
                        {calMode==='HOSTEL'?'Home Weekends':'Holidays'}
                      </p>
                    </div>
                    <div className="col-span-2 sm:col-span-1 px-4 py-4 rounded-2xl bg-white shadow-sm" style={{border:'1px solid #F3F4F6'}}>
                      <p className="text-xs font-black leading-tight" style={{color:'#374151'}}>{fmtDate(openDate||'')}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest mt-0.5" style={{color:'#9CA3AF'}}>Opening</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1 px-4 py-4 rounded-2xl bg-white shadow-sm" style={{border:'1px solid #F3F4F6'}}>
                      <p className="text-xs font-black leading-tight" style={{color:'#374151'}}>{fmtDate(closeDate||'')}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest mt-0.5" style={{color:'#9CA3AF'}}>Closing</p>
                    </div>
                  </div>

                  {/* holiday legend */}
                  {holidays.length>0&&(
                    <div className="mb-6 p-4 rounded-2xl" style={{backgroundColor:'#F0FDF4',border:'1px solid #BBF7D0'}}>
                      <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{color:'#15803D'}}>
                        {calMode==='HOSTEL'?'Home Weekends':'Holidays & Events'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {holidays.map((h,i)=>(
                          <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
                            style={{backgroundColor:'#DCFCE7',color:'#15803D',border:'1px solid #86EFAC'}}>
                            <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor:'#22C55E'}}/>
                            {h.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* month grids */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {calMonths.map(({year,month})=>(
                      <CalMonth key={`${year}-${month}`} year={year} month={month}
                        termDates={termDates} holidays={holidays} accent="#3949AB"/>
                    ))}
                  </div>
                </>
              ):(
                <p className="text-sm pt-8" style={{color:'#9CA3AF'}}>No calendar data configured yet.</p>
              )}
            </div>
          </div>
        </Reveal>
      </div>

      {/* ═════════════════
          CLASSROOMS
      ═════════════════ */}
      <div ref={el=>sectionRefs.current['classrooms']=el} className="scroll-mt-28 px-6 py-16 bg-white">
        <Reveal visible={visibleSections.has('classrooms')}>
          <SectionHeader id="classrooms" title="Classrooms"/>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <div className="space-y-5">
              <p className="text-base leading-relaxed" style={{color:'#4B5563'}}>
                Our classrooms are designed to inspire creativity and focus. With natural lighting, ergonomic furniture, and the latest educational tools, every student has the environment they need to succeed.
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {['Smart Interactive Boards','Ergonomic Seating','Small Class Sizes','Special Needs Support'].map(item=>(
                  <div key={item} className="flex items-center gap-2.5 px-4 py-3 rounded-2xl"
                    style={{backgroundColor:'#E8F5E9',border:'1px solid #C8E6C9'}}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:'#388E3C'}}/>
                    <span className="text-xs font-bold" style={{color:'#2E7D32'}}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <PhotoGrid images={CLASSROOM_IMGS}/>
          </div>
        </Reveal>
      </div>

      {/* ═════════════════
          PLAYGROUNDS
      ═════════════════ */}
      <div ref={el=>sectionRefs.current['playgrounds']=el} className="scroll-mt-28 px-6 py-16"
        style={{backgroundColor:'#FFF8F6'}}>
        <Reveal visible={visibleSections.has('playgrounds')}>
          <SectionHeader id="playgrounds" title="Playgrounds"/>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-5">
              <p className="text-base leading-relaxed" style={{color:'#4B5563'}}>
                Play is vital for development. Our safe, modern playgrounds encourage physical activity and social interaction for students of all ages.
              </p>
              <div className="flex gap-3 flex-wrap">
                {[{v:'100%',l:'Safety Rating'},{v:'3',l:'Active Zones'}].map(s=>(
                  <div key={s.l} className="px-6 py-4 rounded-2xl"
                    style={{backgroundColor:'#FBE9E7',border:'1px solid #FFCCBC'}}>
                    <p className="text-2xl font-black" style={{color:'#BF360C'}}>{s.v}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest mt-0.5" style={{color:'#E64A19'}}>{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl overflow-hidden shadow-md" style={{border:'1px solid #FFCCBC'}}>
              <img src="https://images.unsplash.com/photo-1576085898323-218337e3e43c?q=80&w=1400&auto=format&fit=crop"
                alt="Playground" className="w-full h-72 object-cover" referrerPolicy="no-referrer"/>
            </div>
          </div>
        </Reveal>
      </div>

      {/* ═════════════════
          ADMINISTRATION
      ═════════════════ */}
      <div ref={el=>sectionRefs.current['administration']=el} className="scroll-mt-28 px-6 py-16 bg-white">
        <Reveal visible={visibleSections.has('administration')}>
          <SectionHeader id="administration" title="Administration"/>

          {/* Avatar strip */}
          <div className="flex gap-5 overflow-x-auto no-scrollbar pb-5 mb-8">
            {ADMIN_MEMBERS.map((m,i)=>(
              <button key={i} onClick={()=>setActiveAdmin(i)}
                className="flex flex-col items-center gap-2 flex-shrink-0 transition-all"
                style={{opacity:activeAdmin===i?1:0.45}}>
                <div className="relative">
                  <img src={m.img} alt={m.name}
                    className="w-16 h-16 rounded-full object-cover object-top"
                    style={{
                      border:activeAdmin===i?'3px solid #7B1FA2':'3px solid #E9D8FD',
                      boxShadow:activeAdmin===i?'0 0 20px #7B1FA233':'none',
                    }}
                    referrerPolicy="no-referrer"/>
                  {activeAdmin===i&&(
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full block"
                      style={{backgroundColor:'#7B1FA2'}}/>
                  )}
                </div>
                <p className="text-[10px] font-black whitespace-nowrap" style={{color:'#374151'}}>{m.name.split(' ')[0]}</p>
                <p className="text-[9px] font-bold" style={{color:'#7B1FA2'}}>{m.role.split(' ')[0]}</p>
              </button>
            ))}
          </div>

          {/* Detail panel */}
          <AnimatePresence mode="wait">
            <motion.div key={activeAdmin}
              initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}}
              transition={{duration:0.45,ease:[0.22,1,0.36,1]}}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start rounded-3xl p-6 lg:p-8"
              style={{backgroundColor:'#FAF5FF',border:'1px solid #E9D8FD',boxShadow:'0 4px 24px rgba(123,31,162,0.08)'}}>
              <div className="flex justify-center lg:justify-start">
                <img src={ADMIN_MEMBERS[activeAdmin].img} alt={ADMIN_MEMBERS[activeAdmin].name}
                  className="w-full max-w-xs h-80 lg:h-96 object-cover object-top rounded-2xl shadow-lg"
                  style={{border:'2px solid #D8B4FE'}}
                  referrerPolicy="no-referrer"/>
              </div>
              <div className="flex flex-col justify-center">
                <h3 className="text-3xl lg:text-4xl font-black leading-tight mb-1"
                  style={{color:'#1A1A2E',fontFamily:"'Outfit','Nunito',sans-serif"}}>
                  {ADMIN_MEMBERS[activeAdmin].name}
                </h3>
                <p className="text-sm font-black uppercase tracking-widest mb-5" style={{color:'#7B1FA2'}}>
                  {ADMIN_MEMBERS[activeAdmin].role}
                </p>
                <p className="text-base leading-relaxed" style={{color:'#4B5563'}}>{ADMIN_MEMBERS[activeAdmin].bio}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </Reveal>
      </div>

      {/* ═════════════════
          SPORTS
      ═════════════════ */}
      <div ref={el=>sectionRefs.current['sports']=el} className="scroll-mt-28 px-6 py-16"
        style={{backgroundColor:'#FFF5F5'}}>
        <Reveal visible={visibleSections.has('sports')}>
          <SectionHeader id="sports" title="Sports"/>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <div className="space-y-5">
              <p className="text-base leading-relaxed" style={{color:'#4B5563'}}>
                We believe in building character through competition. Our sports programs cover over 15 codes — from soccer and netball to swimming and athletics.
              </p>
              <div className="flex gap-3 flex-wrap">
                {[{v:'15+',l:'Sport Codes'},{v:'2025',l:'Champions'}].map(s=>(
                  <div key={s.l} className="px-6 py-4 rounded-2xl"
                    style={{backgroundColor:'#FFEBEE',border:'1px solid #FFCDD2'}}>
                    <p className="text-2xl font-black" style={{color:'#B71C1C'}}>{s.v}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest mt-0.5" style={{color:'#C62828'}}>{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
            <PhotoGrid images={SPORTS_IMGS}/>
          </div>
        </Reveal>
      </div>

      {/* ═════════════════
          COMPUTERS
      ═════════════════ */}
      <div ref={el=>sectionRefs.current['computers']=el} className="scroll-mt-28 px-6 py-16 bg-white">
        <Reveal visible={visibleSections.has('computers')}>
          <SectionHeader id="computers" title="Computers"/>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <div className="space-y-5">
              <p className="text-base leading-relaxed" style={{color:'#4B5563'}}>
                State-of-the-art labs prepare students for a digital future. Every learner gains hands-on experience with coding, digital design, and research skills.
              </p>
              <div className="space-y-2">
                {['Coding for Kids — Python & Scratch','Digital Art — Design & Video Editing','Safe Internet — Cybersecurity & Citizenship'].map((item,i)=>(
                  <div key={i} className="flex items-center justify-between px-4 py-3 rounded-2xl"
                    style={{backgroundColor:'#E0F7FA',border:'1px solid #B2EBF2'}}>
                    <span className="text-xs font-bold" style={{color:'#006064'}}>{item}</span>
                    <ChevronRight size={14} style={{color:'#00838F'}}/>
                  </div>
                ))}
              </div>
            </div>
            <PhotoGrid images={COMPUTER_IMGS}/>
          </div>
        </Reveal>
      </div>

      {/* ═════════════════
          MEETINGS
      ═════════════════ */}
      <div ref={el=>sectionRefs.current['meetings']=el} className="scroll-mt-28 px-6 py-16"
        style={{backgroundColor:'#F6FBF0'}}>
        <Reveal visible={visibleSections.has('meetings')}>
          <SectionHeader id="meetings" title="Meetings"/>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <div className="space-y-5">
              <p className="text-base leading-relaxed" style={{color:'#4B5563'}}>
                Strong partnerships between parents, teachers, and the community keep everyone aligned on student progress.
              </p>
              <div className="space-y-2">
                {['Parent-Teacher Consultations — Held termly to discuss individual progress.','Community Workshops — Skills sharing and educational seminars.'].map((item,i)=>(
                  <div key={i} className="px-5 py-4 rounded-2xl"
                    style={{backgroundColor:'#F1F8E9',border:'1px solid #DCEDC8'}}>
                    <p className="text-xs font-bold" style={{color:'#33691E'}}>{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <PhotoGrid images={MEETING_IMGS}/>
          </div>
        </Reveal>
      </div>

      {/* ═════════════════
          ENROLMENTS
      ═════════════════ */}
      <div ref={el=>sectionRefs.current['enrolments']=el} className="scroll-mt-28 px-6 py-16 bg-white">
        <Reveal visible={visibleSections.has('enrolments')}>
          <SectionHeader id="enrolments" title="Enrolments"/>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-5">
              <p className="text-base leading-relaxed" style={{color:'#4B5563'}}>
                We welcome students from all backgrounds who are ready to learn and grow. The process is straightforward and supportive every step of the way.
              </p>
              <div className="space-y-2">
                {['Submit Application Online','Assessment Interview','Document Verification','Orientation Day'].map((step,i)=>(
                  <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-2xl"
                    style={{backgroundColor:'#EFF6FF',border:'1px solid #BFDBFE'}}>
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 text-white"
                      style={{backgroundColor:'#1565C0'}}>{i+1}</span>
                    <span className="text-xs font-bold uppercase tracking-widest" style={{color:'#1D4ED8'}}>{step}</span>
                  </div>
                ))}
              </div>
              <button onClick={()=>navigate('/apply')}
                className="w-full py-4 rounded-full font-black uppercase tracking-widest text-sm text-white transition-all hover:opacity-90 active:scale-95"
                style={{backgroundColor:'#1565C0',boxShadow:'0 4px 20px rgba(21,101,192,0.35)'}}>
                Apply Now
              </button>
            </div>
            <div className="rounded-3xl overflow-hidden shadow-md" style={{border:'1px solid #BFDBFE'}}>
              <img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1400&auto=format&fit=crop"
                alt="Enrolment" className="w-full h-80 object-cover" referrerPolicy="no-referrer"/>
            </div>
          </div>
        </Reveal>
      </div>

      {/* ═════════════════
          HOSTEL
      ═════════════════ */}
      <div ref={el=>sectionRefs.current['hostel']=el} className="scroll-mt-28 px-6 py-16"
        style={{backgroundColor:'#FAF7F5'}}>
        <Reveal visible={visibleSections.has('hostel')}>
          <SectionHeader id="hostel" title="Hostel"/>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-5">
              <p className="text-base leading-relaxed" style={{color:'#4B5563'}}>
                Our hostel provides a nurturing, safe environment for students who live far from campus, building community and a sense of responsibility.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[{v:'24/7',l:'Supervision'},{v:'3×/day',l:'Healthy Meals'},{v:'100%',l:'Safe Environment'},{v:'∞',l:'Community'}].map(s=>(
                  <div key={s.l} className="px-5 py-4 rounded-2xl text-center"
                    style={{backgroundColor:'#EFEBE9',border:'1px solid #D7CCC8'}}>
                    <p className="text-2xl font-black" style={{color:'#4E342E'}}>{s.v}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest mt-0.5" style={{color:'#795548'}}>{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl overflow-hidden shadow-md" style={{border:'1px solid #D7CCC8'}}>
              <img src="https://images.unsplash.com/photo-1555854816-802f1f26671f?q=80&w=1400&auto=format&fit=crop"
                alt="Hostel" className="w-full h-80 object-cover" referrerPolicy="no-referrer"/>
            </div>
          </div>
        </Reveal>
      </div>

      {/* ═════════════════
          NEWS
      ═════════════════ */}
      <div ref={el=>sectionRefs.current['news']=el} className="scroll-mt-28 px-6 py-16 bg-white">
        <Reveal visible={visibleSections.has('news')}>
          <div className="flex items-center justify-between mb-8">
            <SectionHeader id="news" title="News"/>
            <button className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full flex-shrink-0"
              style={{color:'#455A64',backgroundColor:'#ECEFF1',border:'1px solid #CFD8DC'}}>
              View All
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              {title:'Inter-School Sports Day 2026',date:'March 15',category:'Sports',img:'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=800'},
              {title:'New Computer Lab Opening',date:'March 10',category:'Facility',img:'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800'},
              {title:'Term 1 Assessment Results',date:'March 5',category:'Academic',img:'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=800'},
            ].map((n,i)=>(
              <div key={i} className="group cursor-pointer rounded-3xl overflow-hidden shadow-sm"
                style={{backgroundColor:'#FAFAFA',border:'1px solid #E5E7EB'}}>
                <div className="h-40 overflow-hidden">
                  <img src={n.img} alt={n.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer"/>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                      style={{backgroundColor:'#ECEFF1',color:'#455A64'}}>{n.category}</span>
                    <span className="text-[10px] font-bold" style={{color:'#9CA3AF'}}>{n.date}</span>
                  </div>
                  <h3 className="text-sm font-black tracking-tight leading-tight" style={{color:'#1A1A2E'}}>{n.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      {/* ── FOOTER CTA ── */}
      <section className="py-20 text-center px-6 pb-12 mx-4 mb-8 rounded-3xl shadow-xl overflow-hidden"
        style={{background:'linear-gradient(135deg,#3949AB 0%,#7B1FA2 50%,#388E3C 100%)'}}>
        <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-3"
          style={{fontFamily:"'Outfit','Nunito',sans-serif"}}>
          Ready to Start Your Journey?
        </h2>
        <p className="mb-10 text-sm" style={{color:'rgba(255,255,255,0.65)'}}>Join us and discover your potential.</p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button onClick={()=>navigate('/apply')}
            className="bg-white px-10 py-4 rounded-full font-black uppercase tracking-widest text-sm transition-all hover:opacity-90 active:scale-95 shadow-xl"
            style={{color:'#3949AB'}}>
            Apply Online
          </button>
          <button onClick={()=>navigate('/login')}
            className="border border-white/40 bg-white/15 text-white px-10 py-4 rounded-full font-black uppercase tracking-widest text-sm hover:bg-white/25 transition-all active:scale-95">
            Parent Portal
          </button>
        </div>
      </section>

      <style>{`
        .no-scrollbar::-webkit-scrollbar{display:none;}
        .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none;}
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&display=swap');
      `}</style>
    </div>
  );
};
