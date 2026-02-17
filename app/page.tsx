"use client"
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import * as XLSX from 'xlsx';
import { 
  Download, CheckCircle, Moon, Sun, Target, Zap, Clock, Trash2, Edit3, Save, X 
} from 'lucide-react';

export default function Home() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [project, setProject] = useState('');
  const [taskText, setTaskText] = useState('');
  const [userName, setUserName] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // Edit States for Inline Editing
  const [editingId, setEditingId] = useState<any>(null);
  const [editValue, setEditValue] = useState('');

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
    await supabase.from('tasks').insert([{ 
      project_name: project, 
      task_title: taskText, 
      created_by: userName, 
      status: 'Pending' 
    }]);
    setTaskText('');
    setProject('');
  };

  // --- INLINE EDIT FUNCTIONS (AB NO USER ID BAKCHODI) ---
  const startEditing = (task: any) => {
    setEditingId(task.id);
    setEditValue(task.task_title);
  };

  const saveEdit = async (id: any) => {
    // Seedha confirmation maangega
    const confirmSave = confirm("Kya aap is task ko update karna chahte hain?");
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
    if (confirm("Kya aap is task ko hamesha ke liye delete karna chahte hain?")) {
      await supabase.from('tasks').delete().eq('id', id);
    }
  };

  const exportToExcel = () => {
    if (tasks.length === 0) return;
    const reportData = tasks.map((t, index) => ({
      "SR. NO.": index + 1,
      "DATE": new Date(t.created_at).toLocaleDateString('en-GB'),
      "PROJECT MODULE": t.project_name.toUpperCase(),
      "TASK DESCRIPTION": t.task_title,
      "CREATED BY": t.created_by,
      "EDITED BY": t.last_edited_by || "Original",
      "STATUS": t.status === 'Done' ? "✅ DONE" : "⏳ PENDING"
    }));
    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Operational_Report");
    worksheet['!cols'] = [{wch: 8}, {wch: 12}, {wch: 25}, {wch: 50}, {wch: 20}, {wch: 20}, {wch: 15}];
    XLSX.writeFile(workbook, `Nexus_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const sendTaskReminder = () => {
    const pendingCount = tasks.filter(t => t.status === 'Pending').length;
    if (pendingCount > 0 && Notification.permission === "granted") {
      new Notification("Nexus Workspace Alert", {
        body: `Attention! ${pendingCount} tasks pending hain.`,
        icon: "/favicon.ico"
      });
    }
  };

  const completionRate = tasks.length ? Math.round((tasks.filter(t => t.status === 'Done').length / tasks.length) * 100) : 0;

  if (!isClient) return null;

  return (
    <div className={`${darkMode ? 'dark bg-[#0a0a0a]' : 'bg-slate-50'} min-h-screen transition-colors duration-500 font-sans p-4 md:p-10`}>
      <div className="max-w-6xl mx-auto">
        
        {/* Navbar */}
        <nav className="flex justify-between items-center mb-10 backdrop-blur-md bg-white/30 dark:bg-white/5 p-5 rounded-3xl border border-white/20 dark:border-white/10 shadow-xl">
          <div className="flex items-center gap-3 text-slate-900 dark:text-white">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/50">
              <Zap className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-black tracking-tighter uppercase">Nexus Tasks</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setDarkMode(!darkMode)} className="p-3 rounded-2xl bg-white/50 dark:bg-slate-800 hover:scale-110 active:scale-90 transition-all">
              {darkMode ? <Sun className="text-yellow-400" /> : <Moon className="text-blue-600" />}
            </button>
            <button onClick={exportToExcel} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg active:scale-95 transition-all">
              <Download size={18} /> Export
            </button>
          </div>
        </nav>

        {/* Workspace Flow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="md:col-span-2 p-8 rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-2xl relative overflow-hidden group">
             <div className="relative z-10">
                <h2 className="text-4xl font-black mb-2">Workspace Flow</h2>
                <p className="opacity-80 mb-6">Efficiency Level: {completionRate}% targets met.</p>
                <div className="w-full bg-white/20 h-4 rounded-full overflow-hidden">
                  <div className="bg-white h-full transition-all duration-1000" style={{ width: `${completionRate}%` }}></div>
                </div>
             </div>
             <Target className="absolute -right-10 -bottom-10 text-white/10" size={250} />
          </div>
          <div className="p-8 rounded-[2.5rem] bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 shadow-xl flex flex-col justify-center items-center text-center">
             <div className="text-5xl font-black text-blue-600 mb-2">{tasks.filter(t => t.status === 'Pending').length}</div>
             <p className="font-bold uppercase tracking-widest text-slate-400 text-xs">Pending Actions</p>
             <Clock className="mt-4 text-slate-300 animate-pulse" />
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white/80 dark:bg-[#111] backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-2xl mb-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input value={userName} onChange={(e)=>setUserName(e.target.value)} placeholder="Your Name / ID" 
                   className="bg-slate-100 dark:bg-slate-800 dark:text-white p-4 rounded-2xl outline-none focus:ring-2 ring-blue-500 border-none transition-all" />
            <input value={project} onChange={(e)=>setProject(e.target.value)} placeholder="Project Module" 
                   className="bg-slate-100 dark:bg-slate-800 dark:text-white p-4 rounded-2xl outline-none focus:ring-2 ring-blue-500 border-none transition-all" />
            <input value={taskText} onChange={(e)=>setTaskText(e.target.value)} placeholder="Task Details..." 
                   className="bg-slate-100 dark:bg-slate-800 dark:text-white p-4 rounded-2xl outline-none focus:ring-2 ring-blue-500 border-none transition-all" />
            <button onClick={addTask} className="bg-blue-600 text-white font-black rounded-2xl py-4 hover:bg-blue-700 active:scale-95 transition-all">EXECUTE TASK +</button>
          </div>
        </div>

        {/* Task List Section */}
        <div className="grid grid-cols-1 gap-4">
          {tasks.map(task => (
            <div key={task.id} className="group flex items-center justify-between p-6 bg-white dark:bg-[#111] rounded-[2rem] border border-slate-200 dark:border-white/10 hover:border-blue-500 transition-all shadow-sm">
              <div className="flex items-center gap-6 flex-1">
                <div className={`w-3 h-12 rounded-full ${task.status === 'Done' ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'}`}></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest px-2 py-0.5 bg-blue-500/10 rounded-md">{task.project_name}</span>
                    <span className="text-[10px] text-slate-400 font-bold italic">By {task.created_by}</span>
                  </div>
                  
                  {/* INLINE EDIT UI (MODERN STYLE AS REQUESTED) */}
                  {editingId === task.id ? (
                    <div className="flex items-center gap-2 max-w-xl">
                      <input 
                        value={editValue} 
                        onChange={(e)=>setEditValue(e.target.value)} 
                        autoFocus
                        className="bg-slate-50 dark:bg-slate-800 dark:text-white p-2 rounded-xl outline-none border-2 border-blue-500 w-full font-bold" 
                      />
                      <button onClick={()=>saveEdit(task.id)} className="text-emerald-500 p-2 hover:bg-emerald-500/10 rounded-lg transition-all">
                        <Save size={20}/>
                      </button>
                      <button onClick={()=>setEditingId(null)} className="text-red-500 p-2 hover:bg-red-500/10 rounded-lg transition-all">
                        <X size={20}/>
                      </button>
                    </div>
                  ) : (
                    <h3 className={`text-xl font-bold transition-all ${task.status === 'Done' ? 'line-through opacity-30 text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                      {task.task_title}
                    </h3>
                  )}
                </div>
              </div>
              
              {/* Actions Icons */}
              <div className="flex items-center gap-4">
                <button onClick={async () => await supabase.from('tasks').update({ status: task.status === 'Done' ? 'Pending' : 'Done' }).eq('id', task.id)} className="hover:scale-110 active:scale-90 transition-all">
                  <CheckCircle size={35} className={task.status === 'Done' ? 'text-emerald-500' : 'text-slate-200 dark:text-slate-800 hover:text-blue-500'} />
                </button>
                <button onClick={() => startEditing(task)} className="text-slate-200 dark:text-slate-800 hover:text-blue-500 transition-all active:scale-90">
                  <Edit3 size={24} />
                </button>
                <button onClick={() => deleteTask(task.id)} className="text-slate-200 dark:text-slate-800 hover:text-red-500 transition-all active:scale-90">
                  <Trash2 size={24} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Footer / Space Filler for Length */}
      <div className="mt-20 text-center opacity-20 dark:text-white pb-10">
        <p className="text-xs font-bold tracking-[0.5em] uppercase">Nexus Operational Terminal v2.0</p>
      </div>
    </div>
  );
}