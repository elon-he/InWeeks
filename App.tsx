
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppView, UserProfile, JournalEntry } from './types';
import WelcomeScreen from './components/WelcomeScreen';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import { DBService } from './services/dbService';
import { supabase } from './services/supabase';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('welcome');
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [prefillData, setPrefillData] = useState<any>(null);
  
  // Ref for execution locking and tracking
  const isLoadingRef = useRef(false);
  const lastProcessedUserId = useRef<string | null>(null);

  const loadUserData = useCallback(async (userId: string, currentSession?: any) => {
    // Prevent concurrent loading
    if (isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    setIsSyncing(true);
    
    try {
      const profile = await DBService.getProfile(userId);
      
      if (profile && profile.nickname) {
        setUser(profile);
        // Load from local storage first for speed
        const local = await DBService.getLocalEntries(userId);
        setEntries(local);
        setView('dashboard');
        
        // Background sync
        const cloud = await DBService.fetchCloudEntries(userId);
        if (cloud && cloud.length > 0) {
          setEntries(cloud);
        }
      } else {
        // Extract Google metadata for pre-filling
        const meta = currentSession?.user?.user_metadata;
        setPrefillData({
          nickname: profile?.nickname || meta?.full_name || meta?.name || '',
          avatar: profile?.avatar_url || meta?.avatar_url || meta?.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
          targetAge: profile?.target_age || 85,
          birthday: profile?.birthday || ''
        });
        setView('onboarding');
      }
    } catch (err) {
      console.error("Data load error:", err);
      // Only transition to onboarding if we are sure there's no profile
      if (view !== 'dashboard') setView('onboarding');
    } finally {
      isLoadingRef.current = false;
      setIsSyncing(false);
      setIsInitializing(false);
    }
  }, [view]); // Minimal dependencies

  useEffect(() => {
    // Handle the "Refresh Token Not Found" case explicitly on mount
    const handleInitialAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn("Auth check encountered an error:", error.message);
          // If the token is invalid or missing, clear everything to allow a clean sign-in
          if (error.message.toLowerCase().includes('refresh token') || error.status === 400) {
            await supabase.auth.signOut();
            setView('welcome');
            setIsInitializing(false);
            return;
          }
        }
        
        // If there's no session at all, just stop initializing
        if (!initialSession) {
          setIsInitializing(false);
        }
      } catch (err) {
        console.error("Critical auth failure:", err);
        setIsInitializing(false);
      }
    };

    handleInitialAuth();

    // Unified Auth Listener: Supabase v2 fires an event for the initial session automatically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      const currentId = currentSession?.user?.id || null;
      
      // Safety check: Only trigger if the user ID changed or we are initializing
      if (currentId !== lastProcessedUserId.current || isInitializing) {
        lastProcessedUserId.current = currentId;
        setSession(currentSession);
        
        if (currentSession) {
          loadUserData(currentSession.user.id, currentSession);
        } else {
          setView('welcome');
          setUser(null);
          setEntries([]);
          setIsInitializing(false);
        }
      }
    });

    // Global event handlers
    const handleSyncUpdate = async (e: any) => {
      const uid = lastProcessedUserId.current;
      if (uid && uid === e.detail.userId) {
        const updated = await DBService.getLocalEntries(uid);
        setEntries(updated);
      }
    };

    const handleProfileUpdate = () => {
      const uid = lastProcessedUserId.current;
      if (uid) {
        loadUserData(uid, session);
      }
    };

    window.addEventListener('sync-complete', handleSyncUpdate);
    window.addEventListener('profile-updated', handleProfileUpdate);
    
    return () => {
      if (subscription) subscription.unsubscribe();
      window.removeEventListener('sync-complete', handleSyncUpdate);
      window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, [loadUserData, session, isInitializing]);

  const handleAddEntry = async (entryData: Partial<JournalEntry>) => {
    const uid = lastProcessedUserId.current;
    if (!uid) return;
    setIsSyncing(true);
    try {
      await DBService.saveEntry(uid, entryData);
      const updated = await DBService.getLocalEntries(uid);
      setEntries(updated);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    const uid = lastProcessedUserId.current;
    if (!uid) return;
    await DBService.softDeleteEntry(uid, id);
    const updated = await DBService.getLocalEntries(uid);
    setEntries(updated);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-bg-light dark:bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Journey...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {view === 'welcome' && <WelcomeScreen onContinue={(email, uid) => loadUserData(uid, session)} />}
      {view === 'onboarding' && (
        <Onboarding 
          initialData={prefillData}
          onComplete={async (d) => { 
            const uid = lastProcessedUserId.current;
            if(!uid) return; 
            
            const profileUpdate: Partial<UserProfile> = {
              id: uid,
              nickname: d.nickname,
              birthday: d.birthday,
              target_age: d.targetAge,
              avatar_url: d.avatar,
              email: session?.user?.email || ''
            };

            await DBService.updateProfile(profileUpdate); 
            await loadUserData(uid, session); 
          }} 
        />
      )}
      {view === 'dashboard' && user && (
        <Dashboard 
          user={user} 
          entries={entries} 
          onAddEntry={handleAddEntry}
          onDeleteEntry={handleDeleteEntry}
          isSyncing={isSyncing}
        />
      )}
    </div>
  );
};

export default App;
