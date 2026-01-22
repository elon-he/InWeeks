
import React, { useMemo } from 'react';
import { Mood, MoodEmojis, JournalEntry } from '../types';

interface YearlyMapProps {
  selectedYear: number;
  currentYear: number;
  currentWeek: number;
  entries: JournalEntry[];
  onWeekClick: (week: number, year: number) => void;
  highlightedWeek?: { week: number; year: number } | null;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const YearlyMap: React.FC<YearlyMapProps> = ({ selectedYear, currentYear, currentWeek, entries, onWeekClick, highlightedWeek }) => {
  
  const monthWeeksMapping = useMemo(() => {
    const mapping: Record<number, number[]> = {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 
      6: [], 7: [], 8: [], 9: [], 10: [], 11: []
    };
    let firstThursday = new Date(selectedYear, 0, 1);
    while (firstThursday.getDay() !== 4) firstThursday.setDate(firstThursday.getDate() + 1);
    for (let w = 1; w <= 53; w++) {
      const currentThursday = new Date(firstThursday);
      currentThursday.setDate(firstThursday.getDate() + (w - 1) * 7);
      if (currentThursday.getFullYear() > selectedYear) break;
      const monthIdx = currentThursday.getMonth();
      mapping[monthIdx].push(w);
    }
    return mapping;
  }, [selectedYear]);

  const entriesMap = entries.reduce((acc, entry) => {
    if (entry.year === selectedYear) {
      acc[entry.weekNumber] = entry;
    }
    return acc;
  }, {} as Record<number, JournalEntry>);

  return (
    <div className="w-full px-2">
      <div className="space-y-4">
        {MONTHS.map((month, mIdx) => {
          const weeksInMonth = monthWeeksMapping[mIdx] || [];

          return (
            <div key={month} className="flex items-center group/row">
              <div className="w-12 text-[11px] font-black text-slate-300 dark:text-slate-600 tracking-widest uppercase transition-colors group-hover/row:text-primary">
                {month}
              </div>
              <div className="flex-1 flex items-center gap-2.5 ml-4">
                {weeksInMonth.map((weekNum) => {
                  const entry = entriesMap[weekNum];
                  const isHighlighted = highlightedWeek?.week === weekNum && highlightedWeek?.year === selectedYear;

                  let status: 'past' | 'current' | 'future' = 'future';
                  if (selectedYear < currentYear) status = 'past';
                  else if (selectedYear > currentYear) status = 'future';
                  else {
                    if (weekNum < currentWeek) status = 'past';
                    else if (weekNum === currentWeek) status = 'current';
                    else status = 'future';
                  }

                  const tooltipText = entry 
                    ? 'Reflect Memory' 
                    : (status === 'past' ? 'Add Memory' : (status === 'current' ? 'Log This Week' : 'Upcoming Week'));

                  return (
                    <button 
                      key={weekNum} 
                      onClick={() => onWeekClick(weekNum, selectedYear)}
                      className="relative focus:outline-none group"
                    >
                      {entry ? (
                        <div className={`w-6 h-6 flex items-center justify-center text-lg transform transition-all cursor-pointer ${isHighlighted ? 'animate-awakening' : 'group-hover:scale-150'}`}>
                          {MoodEmojis[entry.mood]}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center w-6 h-6 cursor-pointer">
                          {status === 'current' ? (
                            <div className="w-4 h-4 rounded-full bg-primary ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-900 animate-pulse" />
                          ) : status === 'past' ? (
                            <div className={`w-2.5 h-2.5 rounded-full bg-primary/40 dark:bg-primary/20 group-hover:bg-primary/70 transition-colors ${isHighlighted ? 'animate-awakening' : ''}`} />
                          ) : (
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" />
                          )}
                        </div>
                      )}
                      
                      {/* Tooltip */}
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 transform translate-y-1 group-hover:translate-y-0 duration-200">
                        <div className="bg-slate-900 dark:bg-slate-800 text-[10px] font-bold px-3 py-1.5 rounded-xl shadow-2xl whitespace-nowrap border border-white/10 text-white flex flex-col items-center">
                          <span className="opacity-50 text-[8px] uppercase tracking-tighter">Week {weekNum}</span>
                          <span className="mt-0.5">{tooltipText}</span>
                        </div>
                        <div className="w-1.5 h-1.5 bg-slate-900 dark:bg-slate-800 rotate-45 mx-auto -mt-1 border-r border-b border-white/10"></div>
                      </div>
                    </button>
                  );
                })}
                {/* Ensure alignment with empty slots */}
                {Array.from({ length: 6 - weeksInMonth.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="w-6 h-6" />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default YearlyMap;
