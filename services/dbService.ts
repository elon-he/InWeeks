
import { JournalEntry, UserProfile } from '../types';
import { supabase } from './supabase';
import { dataURLtoFile } from './imageUtils';

export class DBService {
  private static DB_NAME = 'InWeeksDB';
  private static STORE_NAME = 'journal_entries';
  private static DB_VERSION = 1;

  private static async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  static async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) return null;
    return data;
  }

  static async updateProfile(profile: Partial<UserProfile>): Promise<void> {
    if (!profile.id) throw new Error("Session expired.");
    const profileToSave = {
      ...profile,
      updated_at: new Date().toISOString()
    };
    await supabase.from('profiles').upsert(profileToSave, { onConflict: 'id' });
  }

  static async getLocalEntries(userId: string): Promise<JournalEntry[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const entries = (request.result as JournalEntry[]).filter(e => e.user_id === userId && !e.deleted_at);
        resolve(entries);
      };
      request.onerror = () => reject(request.error);
    });
  }

  static async getTrashEntries(userId: string): Promise<JournalEntry[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const entries = (request.result as JournalEntry[]).filter(e => e.user_id === userId && !!e.deleted_at);
        resolve(entries);
      };
      request.onerror = () => reject(request.error);
    });
  }

  static async saveLocalEntries(userId: string, entries: JournalEntry[]) {
    const db = await this.getDB();
    const transaction = db.transaction(this.STORE_NAME, 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);
    entries.forEach(entry => store.put(entry));
  }

  static async uploadPhotos(userId: string, photos: string[]): Promise<string[]> {
    const uploadPromises = photos.map(async (photoBase64, index) => {
      if (photoBase64.startsWith('http')) return photoBase64;

      const fileName = `${userId}/${Date.now()}_${index}.jpg`;
      const file = dataURLtoFile(photoBase64, fileName);
      
      const { data, error } = await supabase.storage
        .from('photos')
        .upload(fileName, file, { upsert: true });

      if (error) {
        console.error('Photo upload failed:', error);
        return photoBase64;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(data.path);
        
      return publicUrl;
    });

    return Promise.all(uploadPromises);
  }

  static async saveEntry(userId: string, entryData: Partial<JournalEntry>): Promise<JournalEntry> {
    const now = new Date().toISOString();
    
    let finalPhotos = entryData.photos || [];
    if (finalPhotos.some(p => !p.startsWith('http'))) {
      finalPhotos = await this.uploadPhotos(userId, finalPhotos);
    }

    const newEntry: JournalEntry = {
      id: entryData.id || `${userId}_${entryData.year}_${entryData.weekNumber}`,
      user_id: userId,
      weekNumber: entryData.weekNumber || 1,
      year: entryData.year || new Date().getFullYear(),
      date: entryData.date || new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
      mood: entryData.mood || ('neutral' as any),
      title: '',
      content: entryData.content || '',
      photos: finalPhotos,
      updated_at: now,
      syncStatus: 'pending'
    };

    const db = await this.getDB();
    const transaction = db.transaction(this.STORE_NAME, 'readwrite');
    transaction.objectStore(this.STORE_NAME).put(newEntry);

    if (navigator.onLine) await this.syncEntryToCloud(newEntry);
    return newEntry;
  }

  static async softDeleteEntry(userId: string, id: string) {
    const db = await this.getDB();
    const transaction = db.transaction(this.STORE_NAME, 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);
    const request = store.get(id);
    
    request.onsuccess = async () => {
      const entry = request.result;
      if (entry) {
        entry.deleted_at = new Date().toISOString();
        entry.syncStatus = 'pending';
        store.put(entry);
        if (navigator.onLine) {
           await supabase.from('journals').update({ deleted_at: entry.deleted_at }).eq('id', id);
        }
      }
    };
  }

  static async restoreEntry(userId: string, id: string) {
    const db = await this.getDB();
    const transaction = db.transaction(this.STORE_NAME, 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);
    const request = store.get(id);
    
    request.onsuccess = async () => {
      const entry = request.result;
      if (entry) {
        entry.deleted_at = undefined;
        entry.syncStatus = 'pending';
        store.put(entry);
        if (navigator.onLine) {
          await supabase.from('journals').update({ deleted_at: null }).eq('id', id);
        }
      }
    };
  }

  static async purgeEntry(userId: string, id: string) {
    const db = await this.getDB();
    const transaction = db.transaction(this.STORE_NAME, 'readwrite');
    transaction.objectStore(this.STORE_NAME).delete(id);
    if (navigator.onLine) {
      await supabase.from('journals').delete().eq('id', id);
    }
  }

  static async deleteAccountData(userId: string) {
    // 1. Purge Cloud Database
    await supabase.from('journals').delete().eq('user_id', userId);
    await supabase.from('profiles').delete().eq('id', userId);
    
    // 2. Purge Storage
    const { data: files } = await supabase.storage.from('photos').list(userId);
    if (files && files.length > 0) {
      await supabase.storage.from('photos').remove(files.map(f => `${userId}/${f.name}`));
    }

    // 3. Purge Local IndexedDB
    const db = await this.getDB();
    const transaction = db.transaction(this.STORE_NAME, 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const all = request.result as JournalEntry[];
      all.filter(e => e.user_id === userId).forEach(e => store.delete(e.id));
    };
  }

  static async syncEntryToCloud(entry: JournalEntry) {
    const { error } = await supabase.from('journals').upsert({
      id: entry.id,
      user_id: entry.user_id,
      year: entry.year,
      week: entry.weekNumber,
      content: entry.content,
      mood: entry.mood,
      photos: entry.photos,
      updated_at: entry.updated_at,
      deleted_at: entry.deleted_at || null
    });
    if (!error) {
       const db = await this.getDB();
       const transaction = db.transaction(this.STORE_NAME, 'readwrite');
       const store = transaction.objectStore(this.STORE_NAME);
       entry.syncStatus = 'synced';
       store.put(entry);
    }
  }

  static async fetchCloudEntries(userId: string): Promise<JournalEntry[]> {
    const { data, error } = await supabase
      .from('journals')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const mapped = data.map(d => ({
      ...d,
      weekNumber: d.week,
      syncStatus: 'synced',
      date: new Date(d.updated_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
      title: ''
    }));

    await this.saveLocalEntries(userId, mapped);
    return mapped;
  }
}
