import React, { useState, useEffect, useCallback } from 'react';
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

  const loadUserData = useCallback(async (userId: string) => {
    setIsSyncing(true);
    try {
      const profile = await DBService.getProfile(userId);
      if (profile && profile.nickname) {
        setUser(profile);
        // Load from IndexedDB
        const local = await DBService.getLocalEntries(userId);
        setEntries(local);
        setView('dashboard');
        
        // Background sync
        const cloud = await DBService.fetchCloudEntries(userId);
        setEntries(cloud);
      } else {
        setView('onboarding');
      }
    } catch (err) {
      setView('onboarding');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    // Supabase v2: getSession() is async
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession) loadUserData(initialSession.user.id);
    });

    // Supabase v2: onAuthStateChange structure
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      if (currentSession) loadUserData(currentSession.user.id);
      else { 
        setView('welcome'); 
        setUser(null); 
        setEntries([]); 
      }
    });

    const handleSyncUpdate = async (e: any) => {
      const currentUserId = session?.user?.id;
      if (currentUserId && currentUserId === e.detail.userId) {
        const updated = await DBService.getLocalEntries(currentUserId);
        setEntries(updated);
      }
    };

    const handleProfileUpdate = () => {
      const currentUserId = session?.user?.id;
      if (currentUserId) {
        loadUserData(currentUserId);
      }
    };

    window.addEventListener('sync-complete', handleSyncUpdate);
    window.addEventListener('profile-updated', handleProfileUpdate);
    
    return () => {
      if (subscription) subscription.unsubscribe();
      window.removeEventListener('sync-complete', handleSyncUpdate);
      window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, [loadUserData, session]);

  const handleAddEntry = async (entryData: Partial<JournalEntry>) => {
    if (!session) return;
    setIsSyncing(true);
    try {
      await DBService.saveEntry(session.user.id, entryData);
      const updated = await DBService.getLocalEntries(session.user.id);
      setEntries(updated);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!session) return;
    await DBService.softDeleteEntry(session.user.id, id);
    const updated = await DBService.getLocalEntries(session.user.id);
    setEntries(updated);
  };

  return (
    <div className="min-h-screen">
      {view === 'welcome' && <WelcomeScreen onContinue={(email, uid) => loadUserData(uid)} />}
      {view === 'onboarding' && <Onboarding onComplete={async (d) => { if(!session) return; await DBService.updateProfile({...d, id: session.user.id}); loadUserData(session.user.id); }} />}
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