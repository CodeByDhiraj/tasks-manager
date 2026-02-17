"use client"
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import * as XLSX from 'xlsx';
import { 
  Download, CheckCircle, Moon, Sun, Target, Zap, Clock, Trash2, Edit3, Save, X, ChevronDown, ChevronUp, Plus 
} from 'lucide-react';

export default function Home() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [project, setProject] = useState('');
  const [taskText, setTaskText] = useState('');
  const [userName, setUserName] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  const [editingId, setEditingId] = useState<any>(null);
  const [editValue, setEditValue] = useState('');
  const [expandedProjects, setExpandedProjects] = useState<string[]>([]);

  // SYSTEM AUTOMATICALLY CHECKS EXISTING PROJECTS
  const dynamicProjectOptions = useMemo(() => {
    const names = tasks.map(t => t.project_name?.toUpperCase().trim());
    return Array.from(new Set(names)).filter(n => n); 
  }, [tasks]);

  useEffect(() => {
    setIsClient(true);
    fetchTasks();
    
    if (typeof window !== "undefined" && Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    const sub = supabase.channel('tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchTasks)
      .subscribe();

    const interval = setInterval(() => {
      sendTaskReminder();
    }, 3600000); 

    return () => { 
      supabase.removeChannel(sub);
      clearInterval(interval);
    };
  }, [tasks]);

  const fetchTasks = async () => {
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    setTasks(data || []);
  };

  const addTask = async () => {
    if (!project || !taskText || !userName) return; 
    
    // Cleaning name to ensure no duplicate groups
    const cleanProjectName = project.toUpperCase().trim();

    await supabase.from('tasks').insert([{ 
      project_name: cleanProjectName, 
      task_title: taskText, 
      created_by: userName, 
      status: 'Pending' 
    }]);

    // Clearing all input fields after success
    setTaskText('');
    setProject(''); 
  };

  const startEditing = (task: any) => {
    setEditingId(task.id);
    setEditValue(task.task_title);
  };

  const saveEdit = async (id: any) => {
    const confirmSave = confirm("Do you want to update this task?");
    if (confirmSave) {
      const { error } = await supabase.from('tasks').update({ 
        task_title: editValue 
      }).eq('id', id);
      
      if (!error) {
        setEditingId(null);
        fetchTasks();
      }
    }
  };

  const deleteTask = async (id: any) => {
    if (confirm("Do you want to delete this task?")) {
      await supabase.from('tasks').delete().eq('id', id);
    }
  };

 const exportToExcel = () => {
    if (tasks.length === 0) return;

    const sortedTasks = [...tasks].sort((a, b) => 
      (a.project_name || "").localeCompare(b.project_name || "")
    );

    // 2. Data Map karein
    const reportData = sortedTasks.map((t, index) => ({
      "SR. NO.": index + 1,
      "DATE": new Date(t.created_at).toLocaleDateString('en-GB'),
      "PROJECT MODULE": (t.project_name || "OTHERS").toUpperCase(), // Grouping visualization
      "TASK DESCRIPTION": t.task_title,
      "CREATED BY": t.created_by,
      "EDITED BY": t.last_edited_by || "Original",
      "STATUS": t.status === 'Done' ? "✅ DONE" : "⏳ PENDING"
    }));

    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Operational_Report");

    // Column widths setting
    worksheet['!cols'] = [
      {wch: 8},  // SR. NO.
      {wch: 12}, // DATE
      {wch: 25}, // PROJECT MODULE
      {wch: 50}, // TASK DESCRIPTION
      {wch: 20}, // CREATED BY
      {wch: 20}, // EDITED BY
      {wch: 15}  // STATUS
    ];

    XLSX.writeFile(workbook, `Maruti_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const sendTaskReminder = () => {
    const pendingCount = tasks.filter(t => t.status === 'Pending').length;
    if (pendingCount > 0 && Notification.permission === "granted") {
      new Notification("Maruti Workspace Alert", {
        body: `Attention! ${pendingCount} tasks pending hain.`,
        icon: "/favicon.ico"
      });
    }
  };

  const toggleProjectDropdown = (projName: string) => {
    setExpandedProjects(prev => 
      prev.includes(projName) ? prev.filter(p => p !== projName) : [...prev, projName]
    );
  };

  const groupedTasks = useMemo(() => {
    return tasks.reduce((acc: any, t) => {
      // Logic to group by clean name so duplicates don't appear as separate projects
      const pName = (t.project_name || "Unassigned").toUpperCase().trim();
      if (!acc[pName]) acc[pName] = [];
      acc[pName].push(t);
      return acc;
    }, {});
  }, [tasks]);

  const completionRate = tasks.length ? Math.round((tasks.filter(t => t.status === 'Done').length / tasks.length) * 100) : 0;

  if (!isClient) return null;

  return (
    <div className={`${darkMode ? 'dark bg-[#0a0a0a]' : 'bg-slate-50'} min-h-screen transition-colors duration-500 font-sans p-4 md:p-10 relative overflow-x-hidden`}>
      
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full -z-10 animate-pulse"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full -z-10"></div>

      <div className="max-w-6xl mx-auto">
        
        <nav className="flex justify-between items-center mb-10 backdrop-blur-md bg-white/30 dark:bg-white/5 p-5 rounded-3xl border border-white/20 dark:border-white/10 shadow-xl">
          <div className="flex items-center gap-3 text-slate-900 dark:text-white">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/50">
              <Zap className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-black tracking-tighter uppercase">Maruti Tasks</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setDarkMode(!darkMode)} className="p-3 rounded-2xl bg-white/50 dark:bg-slate-800 hover:scale-110 active:scale-90 transition-all border border-white/20">
              {darkMode ? <Sun className="text-yellow-400" /> : <Moon className="text-blue-600" />}
            </button>
            <button onClick={exportToExcel} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg active:scale-95 transition-all">
              <Download size={18} /> Export
            </button>
          </div>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="md:col-span-2 p-8 rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-2xl relative overflow-hidden group border border-white/10">
              <div className="relative z-10">
                <h2 className="text-4xl font-black mb-2 tracking-tight">Workspace Flow</h2>
                <p className="opacity-80 mb-6 font-medium">Efficiency Level: {completionRate}% targets met.</p>
                <div className="w-full bg-white/20 h-4 rounded-full overflow-hidden border border-white/10">
                  <div className="bg-white h-full transition-all duration-1000 shadow-[0_0_15px_rgba(255,255,255,0.5)]" style={{ width: `${completionRate}%` }}></div>
                </div>
              </div>
              <Target className="absolute -right-10 -bottom-10 text-white/10 group-hover:scale-110 transition-transform duration-700" size={250} />
          </div>
          <div className="p-8 rounded-[2.5rem] bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 shadow-xl flex flex-col justify-center items-center text-center group">
              <div className="text-6xl font-black text-blue-600 mb-2 group-hover:scale-110 transition-transform">{tasks.filter(t => t.status === 'Pending').length}</div>
              <p className="font-bold uppercase tracking-[0.2em] text-slate-400 text-[10px]">Pending Actions</p>
              <Clock className="mt-4 text-slate-300 animate-pulse" size={20} />
          </div>
        </div>

        {/* Input Area with Dynamic Datalist */}
        <div className="bg-white/80 dark:bg-[#111] backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-2xl mb-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input value={userName} onChange={(e)=>setUserName(e.target.value)} placeholder="Your Name / ID" 
                   className="bg-slate-100 dark:bg-slate-800 dark:text-white p-4 rounded-2xl outline-none focus:ring-2 ring-blue-500 border-none transition-all placeholder:opacity-50" />
            
            <div className="relative">
              <input list="proj-list" value={project} onChange={(e)=>setProject(e.target.value)} placeholder="Project Module"
                     className="bg-slate-100 dark:bg-slate-800 dark:text-white p-4 rounded-2xl outline-none focus:ring-2 ring-blue-500 border-none transition-all w-full" />
              <datalist id="proj-list">
                {dynamicProjectOptions.map(opt => <option key={opt} value={opt} />)}
              </datalist>
            </div>

            <input value={taskText} onChange={(e)=>setTaskText(e.target.value)} placeholder="Task Details..." 
                   className="bg-slate-100 dark:bg-slate-800 dark:text-white p-4 rounded-2xl outline-none focus:ring-2 ring-blue-500 border-none transition-all placeholder:opacity-50" />
            
            <button onClick={addTask} className="bg-blue-600 text-white font-black rounded-2xl py-4 hover:bg-blue-700 shadow-lg shadow-blue-500/30 active:scale-95 transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2">
              <Plus size={18} /> Execute Task
            </button>
          </div>
        </div>

        <div className="space-y-6 mb-20">
          {Object.keys(groupedTasks).map(projName => {
            const isExp = expandedProjects.includes(projName);
            const projTasks = groupedTasks[projName];
            const projDone = projTasks.filter((t:any) => t.status === 'Done').length;
            const projPerc = Math.round((projDone / projTasks.length) * 100);

            return (
              <div key={projName} className="bg-white dark:bg-[#111] rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden transition-all hover:shadow-md">
                <div onClick={() => toggleProjectDropdown(projName)} className="p-7 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-5">
                    <div className={`p-2 rounded-xl transition-all ${isExp ? 'bg-blue-600 text-white rotate-180 shadow-lg shadow-blue-500/30' : 'bg-blue-500/10 text-blue-600'}`}>
                      <ChevronDown size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black dark:text-white uppercase tracking-tight">{projName}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{projTasks.length} Active Tasks</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="hidden md:flex flex-col items-end gap-1">
                      <div className="w-32 h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full transition-all duration-700" style={{width: `${projPerc}%`}}></div>
                      </div>
                      <span className="text-[9px] font-black text-blue-500 uppercase">{projPerc}% Complete</span>
                    </div>
                    <div className="bg-blue-500/10 px-4 py-2 rounded-xl text-blue-600 font-black text-sm">{projDone}/{projTasks.length}</div>
                  </div>
                </div>

                {isExp && (
                  <div className="p-6 pt-0 space-y-4 bg-slate-50/30 dark:bg-black/10 border-t border-slate-100 dark:border-white/5">
                    {projTasks.map((task: any) => (
                      <div key={task.id} className="group flex flex-col md:flex-row items-start md:items-center justify-between p-5 bg-white dark:bg-[#161616] rounded-[1.5rem] border border-slate-200 dark:border-white/5 hover:border-blue-500/30 transition-all shadow-sm">
                        <div className="flex items-center gap-5 flex-1 w-full">
                          <button onClick={async () => await supabase.from('tasks').update({ status: task.status === 'Done' ? 'Pending' : 'Done' }).eq('id', task.id)} className="hover:scale-110 transition-all">
                            <CheckCircle size={28} className={task.status === 'Done' ? 'text-emerald-500 drop-shadow-sm' : 'text-slate-200 dark:text-slate-800 hover:text-blue-500'} />
                          </button>
                          
                          <div className="flex-1">
                            {editingId === task.id ? (
                              <div className="flex items-center gap-2">
                                <input value={editValue} onChange={(e)=>setEditValue(e.target.value)} autoFocus className="bg-slate-50 dark:bg-slate-800 dark:text-white p-2 rounded-lg outline-none border-2 border-blue-500 w-full font-bold" />
                                <button onClick={()=>saveEdit(task.id)} className="p-2 text-emerald-500"><Save size={20}/></button>
                                <button onClick={()=>setEditingId(null)} className="p-2 text-red-500"><X size={20}/></button>
                              </div>
                            ) : (
                              <>
                                <h3 className={`text-md font-bold ${task.status === 'Done' ? 'line-through opacity-30 text-slate-400' : 'text-slate-900 dark:text-white'}`}>{task.task_title}</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">By: {task.created_by}</p>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3 md:mt-0">
                          <button onClick={() => startEditing(task)} className="p-2 text-slate-400 hover:text-blue-500"><Edit3 size={18} /></button>
                          <button onClick={() => deleteTask(task.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <footer className="mt-10 mb-16 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent blur-3xl -z-10"></div>
          <div className="flex flex-col items-center gap-4 py-12 border-t border-slate-200 dark:border-white/5">
            <div className="flex items-center gap-3 bg-white dark:bg-white/5 px-5 py-2 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm transition-transform hover:scale-105">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
              </span>
              <p className="text-[10px] font-black tracking-[0.25em] text-slate-500 dark:text-blue-400 uppercase">System Status: Operational</p>
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-xs font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.4em]">Maruti Operational Terminal <span className="text-blue-600/50">v1.1.0</span></h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Engineered with precision by <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent font-black ml-1.5 hover:opacity-80 transition-opacity">EN-2C</span></p>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}
