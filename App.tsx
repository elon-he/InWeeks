
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
  
  // Use ref to track processed session ID to prevent redundant loading and flickering
  const lastProcessedUserId = useRef<string | null>(null);

  const loadUserData = useCallback(async (userId: string) => {
    // Avoid redundant loading if already on dashboard for this user
    if (view === 'dashboard' && user?.id === userId && !isSyncing) return;
    
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
    }
  }, [view, user, isSyncing]);

  useEffect(() => {
    // 1. Initial check for existing session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (initialSession?.user?.id) {
        lastProcessedUserId.current = initialSession.user.id;
        setSession(initialSession);
        loadUserData(initialSession.user.id);
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
        }
      }
    });

    // 3. Handle global events
    const handleSyncUpdate = async (e: any) => {
      if (lastProcessedUserId.current === e.detail.userId) {
        const updated = await DBService.getLocalEntries(lastProcessedUserId.current);
        setEntries(updated);
      }
    };

    const handleProfileUpdate = () => {
      if (lastProcessedUserId.current) {
        loadUserData(lastProcessedUserId.current);
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
    if (!lastProcessedUserId.current) return;
    setIsSyncing(true);
    try {
      await DBService.saveEntry(lastProcessedUserId.current, entryData);
      const updated = await DBService.getLocalEntries(lastProcessedUserId.current);
      setEntries(updated);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!lastProcessedUserId.current) return;
    await DBService.softDeleteEntry(lastProcessedUserId.current, id);
    const updated = await DBService.getLocalEntries(lastProcessedUserId.current);
    setEntries(updated);
  };

  return (
    <div className="min-h-screen">
      {view === 'welcome' && <WelcomeScreen onContinue={(email, uid) => loadUserData(uid)} />}
      {view === 'onboarding' && (
        <Onboarding 
          onComplete={async (d) => { 
            const uid = lastProcessedUserId.current;
            if(!uid) return; 
            await DBService.updateProfile({...d, id: uid}); 
            loadUserData(uid); 
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
