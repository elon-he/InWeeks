
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
  
  // Use ref to track processed session ID to prevent redundant loading and flickering
  const lastProcessedUserId = useRef<string | null>(null);

  const loadUserData = useCallback(async (userId: string) => {
    // Avoid redundant loading if already on dashboard for this user
    if (view === 'dashboard' && user?.id === userId && !isSyncing) {
      setIsInitializing(false);
      return;
    }
    
    setIsSyncing(true);
    try {
      const profile = await DBService.getProfile(userId);
      if (profile && profile.nickname) {
        setUser(profile);
        // Load from local storage first for speed
        const local = await DBService.getLocalEntries(userId);
        setEntries(local);
        setView('dashboard');
        
        // Background sync to ensure data is fresh
        const cloud = await DBService.fetchCloudEntries(userId);
        if (cloud && cloud.length > 0) {
          setEntries(cloud);
        }
      } else {
        setView('onboarding');
      }
    } catch (err) {
      console.error("Data load error:", err);
      setView('onboarding');
    } finally {
      setIsSyncing(false);
      setIsInitializing(false);
    }
  }, [view, user, isSyncing]);

  useEffect(() => {
    // 1. Initial check for existing session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (initialSession?.user?.id) {
        lastProcessedUserId.current = initialSession.user.id;
        setSession(initialSession);
        loadUserData(initialSession.user.id);
      } else {
        setIsInitializing(false);
      }
    });

    // 2. Setup auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      const currentId = currentSession?.user?.id || null;
      
      // Crucial: Only trigger if the user ID has actually changed
      if (currentId !== lastProcessedUserId.current) {
        lastProcessedUserId.current = currentId;
        setSession(currentSession);
        
        if (currentSession) {
          loadUserData(currentSession.user.id);
        } else {
          setView('welcome');
          setUser(null);
          setEntries([]);
          setIsInitializing(false);
        }
      }
    });

    // 3. Handle global events
    const handleSyncUpdate = async (e: any) => {
      const uid = lastProcessedUserId.current;
      // Type safe check to ensure uid exists and matches the event's user
      if (uid && uid === e.detail.userId) {
        const updated = await DBService.getLocalEntries(uid);
        setEntries(updated);
      }
    };

    const handleProfileUpdate = () => {
      const uid = lastProcessedUserId.current;
      if (uid) {
        loadUserData(uid);
      }
    };

    window.addEventListener('sync-complete', handleSyncUpdate);
    window.addEventListener('profile-updated', handleProfileUpdate);
    
    return () => {
      if (subscription) subscription.unsubscribe();
      window.removeEventListener('sync-complete', handleSyncUpdate);
      window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, [loadUserData]); // Stability: Do NOT add session as dependency here

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
    return <div className="min-h-screen bg-bg-light dark:bg-gray-950" />;
  }

  return (
    <div className="min-h-screen">
      {view === 'welcome' && <WelcomeScreen onContinue={(email, uid) => loadUserData(uid)} />}
      {view === 'onboarding' && (
        <Onboarding 
          onComplete={async (d) => { 
            const uid = lastProcessedUserId.current;
            if(!uid) return; 
            
            // Map Onboarding data to UserProfile DB schema
            const profileUpdate: Partial<UserProfile> = {
              id: uid,
              nickname: d.nickname,
              birthday: d.birthday,
              target_age: d.targetAge,
              avatar_url: d.avatar,
              email: session?.user?.email || ''
            };

            await DBService.updateProfile(profileUpdate); 
            await loadUserData(uid); 
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
