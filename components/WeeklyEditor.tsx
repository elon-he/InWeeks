
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Mood, MoodEmojis, JournalEntry } from '../types';
import { compressImage } from '../services/imageUtils';

interface WeeklyEditorProps {
  weekNumber: number;
  year: number;
  onSave: (entry: Partial<JournalEntry>) => void;
}

const WeeklyEditor: React.FC<WeeklyEditorProps> = ({ weekNumber, year, onSave }) => {
  const [mood, setMood] = useState<Mood>(Mood.Happy);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const weekDateRange = useMemo(() => {
    const getMonday = (w: number, y: number) => {
      const simple = new Date(y, 0, 1 + (w - 1) * 7);
      const dow = simple.getDay();
      const ISOweekStart = simple;
      if (dow <= 4)
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
      else
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
      return ISOweekStart;
    };

    const monday = getMonday(weekNumber, year);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const format = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase();
    return `${format(monday)} — ${format(sunday)}`;
  }, [weekNumber, year]);

  const handleSave = () => {
    if ((!content.trim() && images.length === 0) || isCompressing) return;
    onSave({ weekNumber, year, mood, content, photos: images });
    setContent('');
    setImages([]);
    setMood(Mood.Happy);
    setIsFocused(false);
  };

  const autoResize = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const minHeight = isFocused ? 120 : 72;
      const newHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, 400));
      textarea.style.height = `${newHeight}px`;
    }
  };

  useEffect(() => {
    autoResize();
  }, [content, isFocused]);

  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const newText = text.substring(0, start) + before + selected + after + text.substring(end);
    setContent(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const currentCount = images.length;
    const newFiles = Array.from(files) as File[];
    
    if (currentCount + newFiles.length > 9) {
      alert("You can only upload up to 9 images per entry.");
      e.target.value = '';
      return;
    }

    setIsCompressing(true);
    const compressedImages: string[] = [];

    for (const file of newFiles) {
      try {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        const compressed = await compressImage(base64);
        compressedImages.push(compressed);
      } catch (err) {
        console.error("Compression failed", err);
      }
    }

    setImages(prev => [...prev, ...compressedImages]);
    setIsCompressing(false);
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <section className="bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm transition-all hover:shadow-md">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-black dark:text-white font-display tracking-tight">Week {weekNumber}, {year}</h2>
          <div className="flex items-center gap-2 mt-0.5">
             <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{weekDateRange}</span>
             <span className="w-1 h-1 rounded-full bg-slate-200"></span>
             <span className="text-[10px] text-primary font-bold uppercase tracking-widest">Current Week</span>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800/40 p-1.5 rounded-2xl">
          {(Object.keys(MoodEmojis) as Mood[]).map((m) => (
            <button key={m} onClick={() => setMood(m)} className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all text-xl ${mood === m ? 'bg-white dark:bg-slate-700 shadow-md scale-110' : 'hover:bg-white/50 dark:hover:bg-slate-700/50 opacity-40 hover:opacity-100'}`}>
              {MoodEmojis[m]}
            </button>
          ))}
        </div>
      </div>

      <div className="transition-all duration-300">
        <textarea 
          ref={textareaRef}
          onFocus={() => setIsFocused(true)}
          className="w-full bg-transparent border-none focus:ring-0 text-slate-700 dark:text-slate-200 placeholder-slate-300 text-base leading-relaxed resize-none overflow-y-auto hide-scrollbar py-2" 
          placeholder="This week has been incredibly fulfilling..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      {(images.length > 0 || isCompressing) && (
        <div className="mt-4 flex flex-wrap gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {images.map((img, idx) => (
            <div key={idx} className="relative group w-24 h-24">
              <img src={img} className="w-full h-full object-cover rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm" />
              <button onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            </div>
          ))}
          {isCompressing && (
            <div className="w-24 h-24 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
              <span className="text-[8px] font-black uppercase text-slate-400">Processing</span>
            </div>
          )}
          {images.length < 9 && !isCompressing && (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 flex items-center justify-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl text-slate-300 hover:text-primary hover:border-primary transition-all"
            >
              <span className="material-symbols-outlined text-3xl">add</span>
            </button>
          )}
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800/50 flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
          
          <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-slate-400 hover:text-primary transition-all rounded-xl" title="Upload Photo (Max 9)">
            <span className="material-symbols-outlined text-xl">image</span>
          </button>
          <button onClick={() => insertText('**', '**')} className="p-2.5 text-slate-400 hover:text-primary transition-all rounded-xl" title="Bold">
            <span className="material-symbols-outlined text-xl font-bold">format_bold</span>
          </button>
          <button onClick={() => insertText('\n* ')} className="p-2.5 text-slate-400 hover:text-primary transition-all rounded-xl" title="Bullet List">
            <span className="material-symbols-outlined text-xl">format_list_bulleted</span>
          </button>
          <button onClick={() => insertText('\n1. ')} className="p-2.5 text-slate-400 hover:text-primary transition-all rounded-xl" title="Numbered List">
            <span className="material-symbols-outlined text-xl">format_list_numbered</span>
          </button>
        </div>
        
        <button 
          onClick={handleSave}
          disabled={(!content.trim() && images.length === 0) || isCompressing}
          className="flex items-center justify-center w-12 h-12 bg-primary text-white rounded-full hover:brightness-105 disabled:opacity-30 transition-all shadow-xl shadow-primary/20 active:scale-90"
        >
          {isCompressing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span className="material-symbols-outlined text-2xl">send</span>}
        </button>
      </div>
    </section>
  );
};

export default WeeklyEditor;
