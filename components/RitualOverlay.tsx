
import React, { useEffect, useState } from 'react';
import { Mood, MoodEmojis } from '../types';
import { MOOD_ECHOES } from '../constants/echoes';

interface RitualOverlayProps {
  mood: Mood;
  onComplete: () => void;
}

const RitualOverlay: React.FC<RitualOverlayProps> = ({ mood, onComplete }) => {
  // Use state initializer function to pick the random message exactly ONCE on mount.
  // This prevents the text from changing if the parent component re-renders.
  const [echo] = useState(() => {
    const messages = MOOD_ECHOES[mood];
    return messages[Math.floor(Math.random() * messages.length)];
  });

  const isCelebrationMood = mood === Mood.Amazing || mood === Mood.VeryHappy || mood === Mood.Happy;
  
  // Design Logic:
  // 1. Sad & Neutral use the warm amber theme (formerly 'Amazing' theme).
  // 2. Happy, VeryHappy, & Amazing use the primary green theme (formerly 'VeryHappy' theme).
  const isWarmTheme = mood === Mood.Sad || mood === Mood.Neutral;

  const moodColorClass = isWarmTheme ? 'text-amber-500' : 'text-primary';
  
  const auraGlowClass = isWarmTheme ? 'bg-amber-400' : 'bg-primary';
  
  const gradientGlowClass = isWarmTheme 
    ? 'bg-gradient-to-br from-amber-300 to-pink-400' 
    : 'bg-gradient-to-br from-primary to-blue-400';

  const buttonClass = isWarmTheme 
    ? 'bg-gradient-to-r from-amber-400 to-amber-500 shadow-amber-500/20' 
    : 'bg-primary shadow-primary/20';

  // Scheme A Headlines
  const moodHeadline = {
    [Mood.Amazing]: { prefix: 'Your week was', highlight: 'spectacular!' },
    [Mood.VeryHappy]: { prefix: 'You are', highlight: 'glowing right now!' },
    [Mood.Happy]: { prefix: 'Such a', highlight: 'lovely week.' },
    [Mood.Neutral]: { prefix: 'A', highlight: 'peaceful rhythm.' },
    [Mood.Sad]: { prefix: 'You are', highlight: 'resilient.' },
  }[mood];

  useEffect(() => {
    // Auto-dismiss after 6.5 seconds
    const timer = setTimeout(() => {
      onComplete();
    }, 6500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center overflow-hidden">
      {/* Deep Backdrop Blur & Darkener */}
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/80 backdrop-blur-2xl animate-in fade-in duration-1000" />
      
      {/* Immersive Lottie Celebration - Updated Asset as requested */}
      {isCelebrationMood && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[1001] scale-150 sm:scale-125">
          {/* @ts-ignore */}
          <dotlottie-wc 
            src="https://lottie.host/4df640e1-66ab-4e9c-ade1-f723c51f5c79/oFZIb5bAKK.lottie" 
            style={{ width: '800px', height: '800px' }} 
            autoplay 
            loop 
          />
        </div>
      )}

      {/* Background Soft Aura Glow */}
      <div className={`absolute w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 animate-pulse duration-[4000ms] ${auraGlowClass}`} />

      {/* The Premium Reflection Card */}
      <div className="relative z-[1010] w-full max-w-md px-6 animate-in zoom-in-95 slide-in-from-bottom-12 fade-in duration-700 ease-out">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl rounded-[3rem] p-10 pt-16 text-center shadow-[0_80px_160px_-30px_rgba(0,0,0,0.5)] border border-white/40 dark:border-white/5 flex flex-col items-center">
          
          {/* Central Visual Area */}
          <div className="relative mb-10">
            {/* The Gradient Glow Circle */}
            <div className={`absolute inset-0 rounded-full blur-2xl opacity-40 animate-pulse ${gradientGlowClass}`} />
            
            {/* The Emoji Container */}
            <div className="relative w-32 h-32 rounded-full bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-6xl shadow-inner border border-white/50 dark:border-white/10">
              <span className="animate-bounce-slow filter drop-shadow-xl">{MoodEmojis[mood]}</span>
            </div>
          </div>

          {/* Card Content */}
          <div className="space-y-3 mb-12 w-full">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white font-display leading-tight tracking-tight">
              {moodHeadline.prefix} <span className={moodColorClass}>{moodHeadline.highlight}</span>
            </h2>
            
            <p className="text-[15px] font-medium text-slate-500 dark:text-slate-400 px-6 leading-relaxed italic opacity-90">
              "{echo}"
            </p>
          </div>

          {/* "Got it" Button */}
          <button 
            onClick={onComplete}
            className={`w-full py-5 rounded-2xl font-black text-white shadow-2xl transition-all active:scale-95 hover:brightness-110 ${buttonClass}`}
          >
            Got it
          </button>

          {/* Auto-Dismiss Progress Bar */}
          <div className="absolute bottom-0 inset-x-12 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden opacity-30">
            <div className="h-full bg-primary w-full animate-progress origin-left" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RitualOverlay;
