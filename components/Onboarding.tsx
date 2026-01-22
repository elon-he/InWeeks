import React, { useState, useRef, useMemo, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { DBService } from '../services/dbService';

interface OnboardingData {
  nickname: string;
  birthday: string;
  targetAge: number;
  avatar: string;
}

interface OnboardingProps {
  onComplete: (profile: OnboardingData) => Promise<void>;
  onCancel?: () => void;
  initialData?: OnboardingData;
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, onCancel, initialData }) => {
  const [nickname, setNickname] = useState(initialData?.nickname || '');
  const [avatar, setAvatar] = useState<string>(initialData?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [month, setMonth] = useState('January');
  const [day, setDay] = useState('1');
  const [year, setYear] = useState('1995');
  
  const [targetAge, setTargetAge] = useState(initialData?.targetAge || 85);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData?.birthday) {
      const parts = initialData.birthday.split('-');
      if (parts.length === 3) {
        setYear(parts[0]);
        const mIdx = parseInt(parts[1]) - 1;
        setMonth(months[mIdx]);
        setDay(parseInt(parts[2]).toString());
      }
    }
  }, [initialData]);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const arr = [];
    for (let i = currentYear; i >= 1920; i--) arr.push(i.toString());
    return arr;
  }, []);

  const daysArr = useMemo(() => {
    const arr = [];
    for (let i = 1; i <= 31; i++) arr.push(i.toString());
    return arr;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname || isSubmitting) return;
    
    setIsSubmitting(true);
    setError('');

    try {
      const monthIndex = months.indexOf(month);
      const birthday = `${year}-${(monthIndex + 1).toString().padStart(2, '0')}-${day.padStart(2, '0')}`;
      
      await onComplete({ nickname, birthday, targetAge, avatar });
    } catch (err: any) {
      setError(err.message || "Failed to save profile.");
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error("Sign out error", err);
      }
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm('CRITICAL: This will permanently erase your entire life map and all journal entries. This action cannot be undone. Are you absolutely sure?');
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      // Supabase v2: getSession() is async
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await DBService.deleteAccountData(session.user.id);
        await supabase.auth.signOut();
      }
    } catch (err: any) {
      setError(`Failed to delete account: ${err.message}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xl p-4 overflow-y-auto">
      <div className="relative w-full max-w-[500px] max-h-[92vh] rounded-[3rem] bg-white dark:bg-slate-900 border border-gray-100 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
        
        <header className="px-10 pt-10 pb-2 text-center relative shrink-0">
          {onCancel && (
            <button onClick={onCancel} className="absolute top-8 right-8 text-gray-400 hover:text-gray-900 transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-2 shadow-inner">
            <span className="material-symbols-outlined text-3xl text-primary font-bold">
              {initialData ? 'account_circle' : 'auto_awesome'}
            </span>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="px-10 pb-10 space-y-8 overflow-y-auto hide-scrollbar">
          {/* Avatar & Nickname */}
          <div className="flex items-center gap-6">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="h-20 w-20 rounded-full bg-cover bg-center ring-4 ring-gray-50 dark:ring-slate-800 shadow-lg cursor-pointer hover:opacity-80 transition-all flex-shrink-0" 
              style={{backgroundImage: `url('${avatar}')`}}
            />
            <input type="file" id="avatarUpload" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => setAvatar(reader.result as string);
                reader.readAsDataURL(file);
              }
            }} />
            <div className="flex-1">
              <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Nickname</label>
              <input 
                className="w-full rounded-2xl border-none bg-gray-100 dark:bg-slate-800 px-5 py-3.5 text-sm font-bold text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-primary/10 transition-all outline-none" 
                maxLength={20}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Birthday */}
          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">Birthday</label>
            <div className="grid grid-cols-3 gap-2">
              <select value={month} onChange={(e) => setMonth(e.target.value)} className="bg-gray-100 dark:bg-slate-800 border-none rounded-xl px-3 py-3 text-[11px] font-bold text-gray-700 dark:text-gray-300">
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={day} onChange={(e) => setDay(e.target.value)} className="bg-gray-100 dark:bg-slate-800 border-none rounded-xl px-3 py-3 text-[11px] font-bold text-gray-700 dark:text-gray-300">
                {daysArr.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={year} onChange={(e) => setYear(e.target.value)} className="bg-gray-100 dark:bg-slate-800 border-none rounded-xl px-3 py-3 text-[11px] font-bold text-gray-700 dark:text-gray-300">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Target Longevity */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-[2rem] px-8 py-6 border border-slate-100 dark:border-white/5 transition-all hover:bg-white dark:hover:bg-slate-800/60 hover:shadow-xl hover:shadow-slate-100/50 dark:hover:shadow-none">
            <div className="flex justify-between items-end mb-6">
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Target Longevity</label>
              <div className="flex items-baseline">
                <span className="text-5xl font-black text-primary font-display leading-none tracking-tighter">{targetAge}</span>
                <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 ml-2 uppercase tracking-widest">Years</span>
              </div>
            </div>
            <input 
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary" 
              max="120" min="70" step="1" type="range" 
              value={targetAge}
              onChange={(e) => setTargetAge(Number(e.target.value))}
            />
            <p className="text-[9px] text-slate-400 font-medium text-center mt-5 leading-relaxed italic">
              "Memento Mori." Every square is a gift.
            </p>
          </div>

          {error && <div className="text-red-500 text-[11px] text-center font-bold animate-shake">{error}</div>}

          <div className="space-y-3 pt-2 shrink-0">
            <button 
              type="submit"
              disabled={isSubmitting || !nickname}
              className="w-full h-14 flex items-center justify-center gap-3 rounded-2xl bg-primary font-black text-white shadow-xl shadow-primary/20 transition-all hover:brightness-105 active:scale-95 disabled:opacity-50 text-sm"
            >
              {isSubmitting ? 'Syncing Map...' : 'Update Reflection Map'}
            </button>

            {initialData && (
              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button"
                  onClick={handleSignOut}
                  className="h-14 flex items-center justify-center gap-2 rounded-2xl border border-slate-100 dark:border-white/10 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 text-xs"
                >
                  <span className="material-symbols-outlined text-lg">logout</span>
                  Sign Out
                </button>
                <button 
                  type="button"
                  onClick={handleDeleteAccount}
                  className="h-14 flex items-center justify-center gap-2 rounded-2xl border border-red-50 dark:border-red-900/20 text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-all active:scale-95 text-xs"
                >
                  <span className="material-symbols-outlined text-lg">delete_forever</span>
                  Purge Identity
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;