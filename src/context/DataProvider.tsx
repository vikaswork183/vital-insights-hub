import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;
type ModelVersion = Tables<'model_versions'>;
type UpdateRequest = Tables<'update_requests'>;
type UserRole = Tables<'user_roles'>;

interface DataContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: UserRole[];
  isAdmin: boolean;
  isLoading: boolean;
  modelVersions: ModelVersion[];
  updateRequests: UpdateRequest[];
  selectedModelVersion: string;
  setSelectedModelVersion: (v: string) => void;
  refreshModelVersions: () => Promise<void>;
  refreshUpdateRequests: () => Promise<void>;
  signOut: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modelVersions, setModelVersions] = useState<ModelVersion[]>([]);
  const [updateRequests, setUpdateRequests] = useState<UpdateRequest[]>([]);
  const [selectedModelVersion, setSelectedModelVersionState] = useState('1');

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
    setProfile(data);
  }, []);

  const fetchRoles = useCallback(async (userId: string) => {
    const { data } = await supabase.from('user_roles').select('*').eq('user_id', userId);
    setRoles(data || []);
  }, []);

  const refreshModelVersions = useCallback(async () => {
    const { data } = await supabase.from('model_versions').select('*').order('version_number', { ascending: false });
    setModelVersions(data || []);
  }, []);

  const refreshUpdateRequests = useCallback(async () => {
    const { data } = await supabase.from('update_requests').select('*').order('created_at', { ascending: false });
    setUpdateRequests(data || []);
  }, []);

  const fetchConfig = useCallback(async () => {
    const { data } = await supabase.from('system_config').select('*').eq('key', 'selected_model_version').single();
    if (data) {
      const val = typeof data.value === 'string' ? data.value : JSON.stringify(data.value);
      setSelectedModelVersionState(val.replace(/"/g, ''));
    }
  }, []);

  const setSelectedModelVersion = useCallback(async (v: string) => {
    setSelectedModelVersionState(v);
    await supabase.from('system_config').update({ value: JSON.stringify(v) as any }).eq('key', 'selected_model_version');
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  }, []);

  useEffect(() => {
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);

      if (sess?.user) {
        // Use setTimeout to avoid potential deadlock with Supabase
        setTimeout(() => {
          fetchProfile(sess.user.id);
          fetchRoles(sess.user.id);
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
      setIsLoading(false);
    });

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        fetchProfile(sess.user.id);
        fetchRoles(sess.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, fetchRoles]);

  // Fetch data when user is available
  useEffect(() => {
    if (user) {
      refreshModelVersions();
      refreshUpdateRequests();
      fetchConfig();
    }
  }, [user, refreshModelVersions, refreshUpdateRequests, fetchConfig]);

  // Realtime subscriptions
  useEffect(() => {
    const mvChannel = supabase
      .channel('model_versions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'model_versions' }, () => {
        refreshModelVersions();
      })
      .subscribe();

    const urChannel = supabase
      .channel('update_requests_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'update_requests' }, () => {
        refreshUpdateRequests();
      })
      .subscribe();

    const scChannel = supabase
      .channel('system_config_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_config' }, () => {
        fetchConfig();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(mvChannel);
      supabase.removeChannel(urChannel);
      supabase.removeChannel(scChannel);
    };
  }, [refreshModelVersions, refreshUpdateRequests, fetchConfig]);

  const isAdmin = roles.some(r => r.role === 'admin');

  return (
    <DataContext.Provider value={{
      user, session, profile, roles, isAdmin, isLoading,
      modelVersions, updateRequests, selectedModelVersion,
      setSelectedModelVersion, refreshModelVersions, refreshUpdateRequests, signOut,
    }}>
      {children}
    </DataContext.Provider>
  );
}
