
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { UserProfile, JournalEntry, Mood, MoodEmojis } from '../types';
import YearlyMap from './YearlyMap';
import WeeklyEditor from './WeeklyEditor';
import JournalTimeline from './JournalTimeline';
import EditModal from './EditModal';
import Onboarding from './Onboarding';
import RitualOverlay from './RitualOverlay';
import { DBService } from '../services/dbService';

interface DashboardProps {
  user: UserProfile;
  entries: JournalEntry[];
  onAddEntry: (entry: Partial<JournalEntry>) => Promise<void>;
  onDeleteEntry: (id: string) => void;
  isSyncing?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ user, entries, onAddEntry, onDeleteEntry, isSyncing }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showTrash, setShowTrash] = useState(false);
  const [undoItem, setUndoItem] = useState<{ id: string, timer: any, timeout: number } | null>(null);
  const [backfillData, setBackfillData] = useState<{ week: number, year: number } | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{ images: string[], index: number } | null>(null);
  
  // Ritual States
  const [activeRitual, setActiveRitual] = useState<Mood | null>(null);
  const [highlightedWeek, setHighlightedWeek] = useState<{ week: number; year: number } | null>(null);

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!previewData) return;
      if (e.key === 'Escape') setPreviewData(null);
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewData]);

  const handleNext = useCallback(() => {
    if (!previewData) return;
    setPreviewData(prev => prev ? ({
      ...prev,
      index: (prev.index + 1) % prev.images.length
    }) : null);
  }, [previewData]);

  const handlePrev = useCallback(() => {
    if (!previewData) return;
    setPreviewData(prev => prev ? ({
      ...prev,
      index: (prev.index - 1 + prev.images.length) % prev.images.length
    }) : null);
  }, [previewData]);

  const downloadImage = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.download = `inweeks-memory-${new Date().getTime()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = useMemo(() => {
    const birth = new Date(user.birthday);
    const now = new Date();
    const getMonday = (date: Date) => {
      const d = new Date(date);
      d.setHours(0,0,0,0);
      const day = d.getDay();
      const diff = d.getDate() - (day === 0 ? 6 : day - 1);
      d.setDate(diff);
      return d;
    };
    const mondayBirth = getMonday(birth);
    const mondayNow = getMonday(now);
    const weeksLived = Math.round((mondayNow.getTime() - mondayBirth.getTime()) / (1000 * 60 * 60 * 24 * 7));
    const targetWeeks = (user.target_age || 80) * 52;
    return {
      weeksLived: weeksLived.toLocaleString(),
      progress: ((weeksLived / targetWeeks) * 100).toFixed(2),
      journalsCount: entries.length
    };
  }, [user, entries]);

  const realTime = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    let firstThursday = new Date(year, 0, 1);
    while (firstThursday.getDay() !== 4) firstThursday.setDate(firstThursday.getDate() + 1);
    const w1Monday = new Date(firstThursday);
    w1Monday.setDate(firstThursday.getDate() - 3);
    const week = Math.floor((now.getTime() - w1Monday.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1;
    return { year, week };
  }, []);

  const handleMapClick = (week: number, year: number) => {
    const existing = entries.find(e => e.weekNumber === week && e.year === year);
    if (existing) {
      const element = document.getElementById(`entry-${year}-${week}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-4', 'ring-primary/20');
        setTimeout(() => element.classList.remove('ring-4', 'ring-primary/20'), 2000);
      }
    } else {
      const isPast = year < realTime.year || (year === realTime.year && week < realTime.week);
      if (isPast) {
        setBackfillData({ week, year });
      }
    }
  };

  const handleSaveWithRitual = async (entry: Partial<JournalEntry>) => {
    await onAddEntry(entry);
    
    // Trigger Map Awakening first
    setHighlightedWeek({ week: entry.weekNumber!, year: entry.year! });
    setSelectedYear(entry.year!);
    
    // Trigger Full-Screen Ritual after a tiny delay
    setTimeout(() => {
      setActiveRitual(entry.mood!);
    }, 300);

    // Clear awakening highlight after some time
    setTimeout(() => {
      setHighlightedWeek(null);
    }, 4000);
  };

  const initiateDelete = (id: string) => {
    setEntryToDelete(id);
  };

  const confirmDelete = () => {
    if (!entryToDelete) return;
    const id = entryToDelete;
    setEntryToDelete(null);

    if (undoItem) clearTimeout(undoItem.timer);
    
    const timer = setTimeout(() => {
      onDeleteEntry(id);
      setUndoItem(null);
    }, 5000);

    setUndoItem({ id, timer, timeout: 5 });
  };

  const handleUndo = () => {
    if (undoItem) {
      clearTimeout(undoItem.timer);
      setUndoItem(null);
    }
  };

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.weekNumber - a.weekNumber;
    });
  }, [entries]);

  const visibleEntries = sortedEntries.filter(e => e.id !== undoItem?.id);
  const filteredEntries = visibleEntries.filter(e => 
    e.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden bg-bg-light dark:bg-gray-950 font-sans">
      <aside className="w-[360px] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-card-dark flex flex-col h-full shadow-2xl z-30">
        <div className="px-8 py-6 flex-1 overflow-y-auto hide-scrollbar space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 rounded-full bg-cover bg-center shadow-md ring-2 ring-primary/5" style={{backgroundImage: `url('${user.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=user"}')`}} />
              <div className="flex flex-col">
                <h2 className="font-bold text-lg dark:text-white font-display leading-tight">{user.nickname}</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {isSyncing ? (
                    <>
                      <span className="material-symbols-outlined text-[14px] text-primary animate-spin">sync</span>
                      <span className="text-primary text-[9px] font-black uppercase tracking-widest animate-pulse">Syncing Map...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[14px] text-primary">cloud_done</span>
                      <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Journey Synced</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button onClick={() => setIsEditingProfile(true)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-300 hover:text-primary"><span className="material-symbols-outlined text-xl">settings</span></button>
          </div>

          <div className="grid grid-cols-3 gap-2 py-4 border-y border-slate-50 dark:border-slate-800/30 text-center">
            <div><div className="text-xl font-black dark:text-white font-display">{stats.weeksLived}</div><div className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Weeks</div></div>
            <div className="border-x border-slate-100 dark:border-slate-800"><div className="text-xl font-black dark:text-white font-display">{stats.progress}%</div><div className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Life</div></div>
            <div><div className="text-xl font-black dark:text-white font-display">{stats.journalsCount}</div><div className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Logs</div></div>
          </div>

          <div className="space-y-6">
             <div className="flex justify-center items-center">
                <div className="flex items-center bg-slate-50 dark:bg-slate-800/80 rounded-2xl px-3 py-1.5 space-x-4 border border-slate-100 dark:border-slate-700/50 shadow-sm">
                  <button onClick={() => setSelectedYear(y => y-1)} className="p-1 hover:text-primary text-slate-400"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
                  <span className="text-sm font-black dark:text-slate-200 w-12 text-center font-display">{selectedYear}</span>
                  <button onClick={() => setSelectedYear(y => y+1)} className="p-1 hover:text-primary text-slate-400"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
                </div>
             </div>
             <YearlyMap selectedYear={selectedYear} currentYear={realTime.year} currentWeek={realTime.week} entries={entries} onWeekClick={handleMapClick} highlightedWeek={highlightedWeek} />
          </div>
        </div>

        <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 flex justify-center items-center gap-4">
          <button title="Switch Theme" className="w-12 h-12 flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-full text-slate-400 hover:text-primary transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700" onClick={() => document.documentElement.classList.toggle('dark')}>
            <span className="material-symbols-outlined text-xl">dark_mode</span>
          </button>
          <button title="Recycle Bin" className="w-12 h-12 flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-full text-slate-400 hover:text-red-400 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700" onClick={() => setShowTrash(true)}>
            <span className="material-symbols-outlined text-xl">delete_sweep</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full bg-slate-50/30 dark:bg-gray-900/50 relative">
        <header className="h-20 flex items-center px-12 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-card-dark/80 backdrop-blur-md z-20">
          <div className="w-full max-w-4xl mx-auto flex items-center bg-slate-100/50 dark:bg-slate-800/50 rounded-[1.25rem] px-6 py-3.5 border border-slate-100 dark:border-slate-800/50">
            <span className="material-symbols-outlined text-slate-400 text-2xl mr-4">search</span>
            <input className="flex-1 bg-transparent border-none p-0 text-base focus:ring-0 text-slate-700 dark:text-slate-200 placeholder-slate-400" placeholder="Search your journey..." type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 space-y-16 hide-scrollbar">
          <div className="max-w-4xl mx-auto">
            <WeeklyEditor weekNumber={realTime.week} year={realTime.year} onSave={handleSaveWithRitual} />
          </div>
          <div className="max-w-4xl mx-auto space-y-12 pb-20">
            <JournalTimeline 
              entries={filteredEntries} 
              onEdit={setEditingEntry} 
              onDelete={initiateDelete} 
              onPreviewImage={(images, index) => setPreviewData({ images, index })}
              searchQuery={searchQuery}
            />
          </div>
        </div>

        {undoItem && (
          <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 duration-300">
            <div className="bg-slate-900 text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-6 border border-white/10">
               <span className="text-sm font-medium">Log deleted from timeline.</span>
               <button onClick={handleUndo} className="text-primary font-black uppercase text-xs tracking-widest hover:brightness-125 transition-all">Undo</button>
            </div>
          </div>
        )}
      </main>

      {editingEntry && <EditModal entry={editingEntry} onClose={() => setEditingEntry(null)} onSave={(updated) => { handleSaveWithRitual(updated); setEditingEntry(null); }} />}
      
      {backfillData && (
        <EditModal 
          entry={{
            id: '', user_id: user.id, weekNumber: backfillData.week, year: backfillData.year, 
            date: '', mood: Mood.Happy, title: '', content: '', photos: [], updated_at: '', syncStatus: 'pending'
          }} 
          onClose={() => setBackfillData(null)} 
          onSave={(entry) => { handleSaveWithRitual(entry); setBackfillData(null); }}
          mode="supplement"
        />
      )}

      {entryToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEntryToDelete(null)}></div>
          <div className="relative bg-white dark:bg-card-dark rounded-[3rem] p-10 max-w-[400px] w-full text-center shadow-2xl animate-shake">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl">delete_forever</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3">Erase this memory? 🥺</h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">This moment is part of your life map. Are you sure you want to let it go?</p>
            <div className="flex gap-4">
              <button onClick={() => setEntryToDelete(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all">Keep it</button>
              <button onClick={confirmDelete} className="flex-1 py-4 bg-red-500 text-white font-bold rounded-2xl hover:brightness-110 shadow-lg shadow-red-500/20 transition-all">Erase</button>
            </div>
          </div>
        </div>
      )}

      {/* Ritual Overlay */}
      {activeRitual && <RitualOverlay mood={activeRitual} onComplete={() => setActiveRitual(null)} />}

      {/* Full-Screen Lightbox - Global Level */}
      {previewData && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-12 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-md cursor-zoom-out" onClick={() => setPreviewData(null)} />
          
          <div className="relative z-[510] w-full h-full flex flex-col items-center justify-center group/modal pointer-events-none">
            {/* Buttons - Always Top Layer */}
            <div className="absolute top-8 right-8 flex gap-3 pointer-events-auto z-[550]">
              <button onClick={() => downloadImage(previewData.images[previewData.index])} className="w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-2xl border border-white/20 shadow-xl" title="Save this memory">
                <span className="material-symbols-outlined text-2xl">download</span>
              </button>
              <button onClick={() => setPreviewData(null)} className="w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-2xl border border-white/20 shadow-xl" title="Close (Esc)">
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            <div className="relative max-w-full max-h-[85vh] flex items-center justify-center pointer-events-auto z-[520]" onClick={(e) => e.stopPropagation()}>
              <img src={previewData.images[previewData.index]} className="max-w-full max-h-[80vh] object-contain rounded-3xl shadow-[0_40px_80px_-15px_rgba(0,0,0,0.6)] animate-in zoom-in-95 duration-300 border border-white/10" />
              {previewData.images.length > 1 && (
                <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 px-5 py-2 bg-black/40 backdrop-blur-xl rounded-2xl text-white text-[10px] font-black uppercase tracking-widest border border-white/10 shadow-2xl flex items-center gap-2">
                  <span className="text-primary">{previewData.index + 1}</span><span className="opacity-30">/</span><span>{previewData.images.length}</span>
                </div>
              )}
            </div>

            {previewData.images.length > 1 && (
              <div className="absolute inset-x-12 flex justify-between pointer-events-none z-[540]">
                <button onClick={(e) => { e.stopPropagation(); handlePrev(); }} className="w-16 h-16 flex items-center justify-center bg-white/5 hover:bg-white/15 text-white rounded-full transition-all backdrop-blur-md border border-white/5 pointer-events-auto shadow-sm active:scale-90">
                  <span className="material-symbols-outlined text-4xl">chevron_left</span>
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleNext(); }} className="w-16 h-16 flex items-center justify-center bg-white/5 hover:bg-white/15 text-white rounded-full transition-all backdrop-blur-md border border-white/5 pointer-events-auto shadow-sm active:scale-90">
                  <span className="material-symbols-outlined text-4xl">chevron_right</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showTrash && <TrashModal userId={user.id} onClose={() => setShowTrash(false)} />}
      {isEditingProfile && <Onboarding initialData={{nickname: user.nickname, avatar: user.avatar_url || '', birthday: user.birthday, targetAge: user.target_age}} onComplete={async (d) => { await DBService.updateProfile({...d, id: user.id}); setIsEditingProfile(false); window.dispatchEvent(new CustomEvent('profile-updated')); }} onCancel={() => setIsEditingProfile(false)} />}
    </div>
  );
};

const TrashModal = ({ userId, onClose }: { userId: string, onClose: () => void }) => {
  const [items, setItems] = useState<JournalEntry[]>([]);
  useEffect(() => { 
    DBService.getTrashEntries(userId).then(setItems); 
  }, [userId]);

  const handleRestore = async (id: string) => {
    await DBService.restoreEntry(userId, id);
    setItems(prev => prev.filter(i => i.id !== id));
    window.dispatchEvent(new CustomEvent('sync-complete', { detail: { userId } }));
  };

  const handlePurge = async (id: string) => {
    if (window.confirm("This will be permanently deleted. Continue?")) {
      await DBService.purgeEntry(userId, id);
      setItems(prev => prev.filter(i => i.id !== id));
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-card-dark rounded-[3.5rem] w-full max-w-[600px] flex flex-col max-h-[80vh] overflow-hidden shadow-2xl">
        <div className="px-10 pt-10 pb-6 flex justify-between items-center shrink-0">
          <div><h3 className="text-2xl font-black font-display text-slate-900 dark:text-white">Recycle Bin</h3><p className="text-slate-400 text-xs">Deleted logs are kept for 30 days.</p></div>
          <button onClick={onClose} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400"><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="px-10 pb-10 flex-1 overflow-y-auto hide-scrollbar">
          {items.length === 0 ? (
            <div className="text-center py-20 text-slate-300">No items in bin.</div>
          ) : (
            <div className="space-y-4">
              {items.map(item => (
                <div key={item.id} className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800 flex justify-between items-center group">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{MoodEmojis[item.mood]}</span>
                    <div><div className="font-bold text-slate-800 dark:text-slate-200">Week {item.weekNumber}, {item.year}</div><div className="text-[10px] text-slate-400 uppercase font-black">{new Date(item.deleted_at!).toLocaleDateString()} Deleted</div></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleRestore(item.id)} className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-all"><span className="material-symbols-outlined">restore</span></button>
                    <button onClick={() => handlePurge(item.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-xl transition-all"><span className="material-symbols-outlined">delete_forever</span></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
