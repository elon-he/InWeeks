
import React, { useState, useRef, useMemo } from 'react';
import { JournalEntry, Mood, MoodEmojis } from '../types';
import { compressImage } from '../services/imageUtils';

interface EditModalProps {
  entry: JournalEntry;
  onClose: () => void;
  onSave: (entry: JournalEntry) => void;
  mode?: 'edit' | 'supplement';
}

const EditModal: React.FC<EditModalProps> = ({ entry, onClose, onSave, mode = 'edit' }) => {
  const [mood, setMood] = useState<Mood>(entry.mood);
  const [content, setContent] = useState(entry.content);
  const [images, setImages] = useState<string[]>(entry.photos || []);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const weekDateRange = useMemo(() => {
    const getMonday = (w: number, y: number) => {
      const simple = new Date(y, 0, 1 + (w - 1) * 7);
      const dow = simple.getDay();
      const ISOweekStart = simple;
      if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
      else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
      return ISOweekStart;
    };
    const monday = getMonday(entry.weekNumber, entry.year);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const format = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase();
    return `${format(monday)} — ${format(sunday)}`;
  }, [entry.weekNumber, entry.year]);

  const handleSave = () => {
    if (isCompressing) return;
    onSave({ ...entry, mood, content, photos: images });
  };

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
    const filesArray = Array.from(files) as File[];
    
    setIsCompressing(true);
    const compressedImages: string[] = [];

    for (const file of filesArray) {
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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative z-20 w-full max-w-[750px] bg-white dark:bg-card-dark rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="px-10 pt-10 pb-6 flex items-center justify-between">
          <div>
            <span className="text-slate-900 dark:text-white text-lg font-black tracking-tight font-display block">
              {mode === 'supplement' ? 'Add' : 'Edit Log'}: Week {entry.weekNumber}, {entry.year}
            </span>
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-0.5">{weekDateRange}</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded-2xl">
              {(Object.keys(MoodEmojis) as Mood[]).map((m) => (
                <button key={m} onClick={() => setMood(m)} className={`flex w-9 h-9 items-center justify-center rounded-xl transition-all text-xl ${mood === m ? 'bg-white dark:bg-slate-700 shadow-md' : 'grayscale opacity-40 hover:opacity-100'}`}>
                  {MoodEmojis[m]}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400"><span className="material-symbols-outlined text-lg">close</span></button>
          </div>
        </div>
        <div className="px-10 py-4 overflow-y-auto max-h-[60vh] hide-scrollbar">
          <textarea ref={textareaRef} className="w-full bg-transparent border-none text-slate-700 dark:text-slate-200 text-base leading-relaxed focus:ring-0 resize-none min-h-[180px]" value={content} onChange={(e) => setContent(e.target.value)} placeholder="What happened during this week?" />
          {(images.length > 0 || isCompressing) && (
            <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-50 dark:border-slate-800/50">
              {images.map((img, i) => (
                <div key={i} className="relative w-20 h-20 group">
                  <img src={img} className="w-full h-full object-cover rounded-xl shadow-sm" />
                  <button onClick={() => setImages(imgs => imgs.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"><span className="material-symbols-outlined text-[10px]">close</span></button>
                </div>
              ))}
              {isCompressing && (
                <div className="w-20 h-20 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          )}
        </div>
        <div className="px-10 py-8 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center space-x-1">
            <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleImageUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-slate-400 hover:text-primary transition-all rounded-xl" title="Upload Photo">
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
          <div className="flex items-center gap-6">
            <button onClick={onClose} className="text-slate-400 font-bold text-sm">Cancel</button>
            <button 
              onClick={handleSave} 
              disabled={isCompressing}
              className="bg-primary text-white font-black px-10 py-3.5 rounded-2xl shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50"
            >
              {isCompressing ? 'Processing...' : (mode === 'supplement' ? 'Add Record' : 'Update Record')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditModal;
