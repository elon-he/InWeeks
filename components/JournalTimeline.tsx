
import React from 'react';
import { JournalEntry, MoodEmojis } from '../types';

interface JournalTimelineProps {
  entries: JournalEntry[];
  onEdit: (entry: JournalEntry) => void;
  onDelete: (id: string) => void;
  onPreviewImage: (images: string[], index: number) => void;
  searchQuery?: string;
}

const JournalTimeline: React.FC<JournalTimelineProps> = ({ entries, onEdit, onDelete, onPreviewImage, searchQuery = '' }) => {
  
  const highlightText = (text: string | React.ReactNode): React.ReactNode => {
    if (!searchQuery || typeof text !== 'string') return text;
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === searchQuery.toLowerCase() 
        ? <mark key={i} className="bg-primary/20 text-primary font-bold rounded-sm px-0.5 no-underline">{part}</mark> 
        : part
    );
  };

  const renderContent = (content: string) => {
    if (!content) return null;
    
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    
    let listItems: React.ReactNode[] = [];
    let listType: 'ul' | 'ol' | null = null;

    const flushList = () => {
      if (listType === 'ul') {
        elements.push(<ul key={`list-${elements.length}`} className="list-disc ml-6 my-2 space-y-1">{listItems}</ul>);
      } else if (listType === 'ol') {
        elements.push(<ol key={`list-${elements.length}`} className="list-decimal ml-6 my-2 space-y-1">{listItems}</ol>);
      }
      listItems = [];
      listType = null;
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      const parseBoldAndHighlight = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            const innerText = part.slice(2, -2);
            return <strong key={i} className="font-bold text-slate-900 dark:text-white">{highlightText(innerText)}</strong>;
          }
          return highlightText(part);
        });
      };

      if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
        if (listType !== 'ul') flushList();
        listType = 'ul';
        listItems.push(<li key={index} className="text-slate-600 dark:text-slate-300">{parseBoldAndHighlight(trimmedLine.slice(2))}</li>);
      } 
      else if (/^\d+\.\s/.test(trimmedLine)) {
        if (listType !== 'ol') flushList();
        listType = 'ol';
        const contentAfterNumber = trimmedLine.replace(/^\d+\.\s/, '');
        listItems.push(<li key={index} className="text-slate-600 dark:text-slate-300">{parseBoldAndHighlight(contentAfterNumber)}</li>);
      } 
      else {
        flushList();
        if (trimmedLine === '') {
          elements.push(<div key={index} className="h-2" />);
        } else {
          elements.push(<div key={index} className="text-slate-600 dark:text-slate-300">{parseBoldAndHighlight(line)}</div>);
        }
      }
    });

    flushList();
    return elements;
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-24 text-slate-400">
        <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-4xl">auto_stories</span>
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Your Story Awaits</h3>
        <p className="text-sm">Start your first weekly log to see it here.</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-8">
      <div className="absolute left-[1.75rem] top-8 bottom-0 w-px bg-slate-200 dark:bg-slate-800"></div>
      
      {entries.map((entry) => (
        <div 
          key={entry.id} 
          id={`entry-${entry.year}-${entry.weekNumber}`}
          className="relative flex items-start gap-6 group transition-all duration-1000 rounded-[2.5rem] scroll-mt-24"
        >
          <div className="relative z-10 flex flex-col items-center min-w-[3.5rem]">
            <div className="w-11 h-11 bg-white dark:bg-card-dark border-2 border-slate-200 dark:border-slate-800 rounded-full flex items-center justify-center text-2xl shadow-sm transition-transform hover:scale-110">
              {MoodEmojis[entry.mood]}
            </div>
            <div className="mt-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-tighter text-center leading-tight">
              {entry.year}<br/>
              <span className="text-primary opacity-60">W{entry.weekNumber}</span>
            </div>
          </div>
          
          <div className="flex-1 bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-sm p-8 relative hover:shadow-xl transition-all duration-300">
            <div className="absolute top-6 right-8 flex items-center space-x-3 z-10">
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-xl p-1 shadow-sm border border-slate-100 dark:border-slate-800">
                <button 
                  onClick={() => onEdit(entry)}
                  className="p-1.5 text-slate-400 hover:text-primary transition-colors"
                  title="Edit Log"
                >
                  <span className="material-symbols-outlined text-lg">edit</span>
                </button>
                <button 
                  onClick={() => onDelete(entry.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                  title="Delete Log"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
            </div>
            
            <div className="flex flex-col space-y-6">
              <div className="text-base leading-relaxed whitespace-pre-wrap">
                {renderContent(entry.content)}
              </div>
              
              {entry.photos && entry.photos.length > 0 && (
                <div className="flex flex-wrap gap-4 pt-2">
                  {entry.photos.map((photo, pIdx) => (
                    <div 
                      key={pIdx}
                      className="relative group/photo"
                      onClick={() => onPreviewImage(entry.photos, pIdx)}
                    >
                      <img 
                        src={photo} 
                        className="w-32 h-32 object-cover rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:scale-105 cursor-zoom-in group-hover/photo:brightness-90" 
                        alt="Weekly memory"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity pointer-events-none">
                        <span className="material-symbols-outlined text-white text-2xl">zoom_in</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default JournalTimeline;
