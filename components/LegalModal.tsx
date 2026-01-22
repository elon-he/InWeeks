
import React from 'react';

export type LegalType = 'tos' | 'privacy';

interface LegalModalProps {
  type: LegalType;
  onClose: () => void;
}

const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
  const content = {
    tos: {
      title: 'Terms of Service',
      sections: [
        {
          h: '1. Acceptance of Terms',
          p: 'By accessing or using InWeeks, you agree to be bound by these Terms of Service. If you do not agree, please do not use the service.'
        },
        {
          h: '2. Description of Service',
          p: 'InWeeks is a personal reflection tool designed to help users visualize their life in weeks. It is provided "as is" and is intended for personal, non-commercial use.'
        },
        {
          h: '3. User Accounts',
          p: 'You are responsible for maintaining the confidentiality of your account and password. You agree to notify us immediately of any unauthorized use.'
        },
        {
          h: '4. No Professional Advice',
          p: 'InWeeks is not a substitute for professional mental health care, medical advice, or therapy. Use it only for personal reflection.'
        },
        {
          h: '5. Limitation of Liability',
          p: 'InWeeks shall not be liable for any indirect, incidental, or consequential damages resulting from your use of the service.'
        }
      ]
    },
    privacy: {
      title: 'Privacy Policy',
      sections: [
        {
          h: '1. Data Collection',
          p: 'We collect your email, nickname, birthday, and the journal entries you create. We also store photos you upload to our secure cloud storage.'
        },
        {
          h: '2. AI Processing',
          p: 'We use the Google Gemini API to provide sentiment analysis and summaries. Your data is processed in real-time and is not used to train global AI models.'
        },
        {
          h: '3. Data Security',
          p: 'Your data is encrypted in transit and at rest. We use industry-standard security measures provided by Supabase (PostgreSQL) and Google Cloud.'
        },
        {
          h: '4. Your Rights',
          p: 'You have the right to access, export, or delete your data at any time. Deleting your account will permanently erase all associated records from our servers.'
        },
        {
          h: '5. Updates',
          p: 'We may update this policy from time to time. Your continued use of InWeeks after changes constitutes acceptance of the new policy.'
        }
      ]
    }
  }[type];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300 border border-white/10">
        <header className="px-10 pt-10 pb-6 flex justify-between items-center shrink-0 border-b border-slate-50 dark:border-slate-800">
          <h2 className="text-2xl font-black font-display text-slate-900 dark:text-white uppercase tracking-tight">{content.title}</h2>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-primary transition-all">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>
        
        <div className="px-10 py-8 overflow-y-auto hide-scrollbar space-y-8 flex-1">
          {content.sections.map((s, i) => (
            <section key={i} className="space-y-3">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">{s.h}</h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[15px]">{s.p}</p>
            </section>
          ))}
          <p className="text-[11px] text-slate-300 dark:text-slate-600 italic pt-6">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <footer className="px-10 py-8 bg-slate-50/50 dark:bg-slate-800/20 text-center shrink-0">
          <button onClick={onClose} className="px-12 py-3.5 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:brightness-105 active:scale-95 transition-all text-sm">
            I Understand
          </button>
        </footer>
      </div>
    </div>
  );
};

export default LegalModal;
