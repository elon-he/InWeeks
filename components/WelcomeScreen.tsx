import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import LegalModal, { LegalType } from './LegalModal';
import Logo from './Logo';

interface WelcomeScreenProps {
  onContinue: (email: string, userId: string) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onContinue }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [legalView, setLegalView] = useState<LegalType | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      setIsResetMode(true);
      setError('Recovery link recognized. Please enter your new password.');
    }
  }, []);

  const handleEmailAuth = async () => {
    if (isSignUpMode && !agreed) {
      setError('Please agree to the Terms and Privacy Policy to create an account.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      if (isResetMode) {
        // Supabase v2: updateUser
        const { error: resetError } = await supabase.auth.updateUser({
          password: newPassword
        });
        if (resetError) throw resetError;
        
        setError('Success! Your password has been updated. You can now sign in.');
        setIsResetMode(false);
        setNewPassword('');
      } else if (isSignUpMode) {
        // Supabase v2: signUp
        const { data: { user, session }, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        
        if (session) {
          onContinue(email, user!.id);
        } else {
          setError('Success! Verification email sent. Please activate your account before signing in.');
          setIsSignUpMode(false);
        }
      } else {
        // Supabase v2: signInWithPassword
        const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          if (signInError.message.toLowerCase().includes('email not confirmed')) {
            setError('Account exists but email is not verified. Check your inbox or spam.');
            return;
          }
          throw signInError;
        }
        
        if (user) {
          onContinue(email, user.id);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    if (error) setError(error.message);
    else setError('Password reset link sent to your email.');
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Supabase v2: signInWithOAuth
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account consent',
          }
        }
      });
      
      if (error) throw error;
    } catch (err: any) {
      setError(`Google login failed: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-light dark:bg-gray-950 px-4">
      <div className="w-full max-w-[400px] flex flex-col min-h-[640px] justify-between py-12">
        <div className="space-y-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <header className="flex flex-col items-center">
            <div className="mb-6 group">
              <Logo size={80} className="text-slate-200 dark:text-slate-800 transition-transform duration-700 group-hover:rotate-[360deg]" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white font-display tracking-tight">InWeeks</h1>
            <p className="mt-2 text-text-muted text-sm font-medium">Your life journey, week by week.</p>
          </header>

          <div className="space-y-4">
            {!isResetMode && (
              <>
                <button 
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white font-bold text-text-main hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm active:scale-[0.98]"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Continue with Google
                </button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100 dark:border-gray-800"></div></div>
                  <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest"><span className="bg-bg-light dark:bg-gray-950 px-3 text-text-muted">Or Email Identity</span></div>
                </div>
              </>
            )}

            <div className="space-y-3">
              {isResetMode ? (
                <div className="space-y-3">
                  <div className="bg-primary/5 p-4 rounded-2xl mb-4">
                    <p className="text-[11px] font-bold text-primary uppercase tracking-widest">Security Mode</p>
                    <p className="text-xs text-slate-500 mt-1">Create a strong new password for your account.</p>
                  </div>
                  <input 
                    className="h-12 w-full rounded-2xl border-none bg-gray-100 dark:bg-gray-900 px-5 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-primary/10 transition-all outline-none" 
                    placeholder="New Password" 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              ) : (
                <>
                  <input 
                    className="h-12 w-full rounded-2xl border-none bg-gray-100 dark:bg-gray-900 px-5 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-primary/10 transition-all outline-none" 
                    placeholder="Email address" 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <div className="relative">
                    <input 
                      className="h-12 w-full rounded-2xl border-none bg-gray-100 dark:bg-gray-900 px-5 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-primary/10 transition-all outline-none" 
                      placeholder="Password" 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    {!isSignUpMode && (
                      <button 
                        onClick={handleForgotPassword}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary uppercase tracking-widest hover:brightness-125"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                </>
              )}
              
              {isSignUpMode && !isResetMode && (
                <div className="flex items-start gap-3 px-1 pt-2 text-left">
                  <input 
                    id="consent" 
                    type="checkbox" 
                    checked={agreed} 
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer" 
                  />
                  <label htmlFor="consent" className="text-[11px] text-slate-500 leading-normal font-medium">
                    I agree to the <button onClick={() => setLegalView('tos')} className="text-primary font-bold hover:underline">Terms of Service</button> and <button onClick={() => setLegalView('privacy')} className="text-primary font-bold hover:underline">Privacy Policy</button>.
                  </label>
                </div>
              )}

              {error && (
                <div className={`p-4 rounded-2xl text-[11px] font-bold text-center animate-shake ${error.includes('Success') || error.includes('recognized') || error.includes('sent') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {error}
                </div>
              )}

              <button 
                onClick={handleEmailAuth}
                disabled={loading || (isResetMode ? !newPassword : (!email || !password)) || (isSignUpMode && !agreed)}
                className="h-14 w-full rounded-2xl bg-primary font-black text-white shadow-xl shadow-primary/20 hover:brightness-105 active:scale-95 disabled:opacity-30 transition-all text-sm"
              >
                {loading ? 'Processing...' : (isResetMode ? 'Update Password' : (isSignUpMode ? 'Create My Map' : 'Sign In'))}
              </button>
              
              {!isResetMode ? (
                <button 
                  onClick={() => { setIsSignUpMode(!isSignUpMode); setError(''); }}
                  className="text-[10px] font-black text-slate-400 hover:text-primary transition-colors uppercase tracking-widest pt-2"
                >
                  {isSignUpMode ? 'Already have a map? Sign In' : "No account? Build your map"}
                </button>
              ) : (
                <button 
                  onClick={() => setIsResetMode(false)}
                  className="text-[10px] font-black text-slate-400 hover:text-primary transition-colors uppercase tracking-widest pt-2"
                >
                  Cancel Reset
                </button>
              )}
            </div>
          </div>
        </div>

        <footer className="text-center px-6">
          <p className="text-[10px] text-slate-300 dark:text-slate-700 leading-relaxed font-medium">
            Your journey is private. Entries are encrypted end-to-end.<br/>
            Reflect often. Memento Mori.
          </p>
        </footer>
      </div>

      {legalView && <LegalModal type={legalView} onClose={() => setLegalView(null)} />}
    </div>
  );
};

export default WelcomeScreen;