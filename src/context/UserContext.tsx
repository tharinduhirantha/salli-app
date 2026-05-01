import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

interface UserContextValue {
  currentUser: Profile | null;
  allProfiles: Profile[];
  refresh: () => Promise<void>;
  userEmail: string | null;
}

const UserContext = createContext<UserContextValue>({
  currentUser: null,
  allProfiles: [],
  refresh: async () => {},
  userEmail: null,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCurrentUser(null); setAllProfiles([]); setUserEmail(null); return; }

    setUserEmail(user.email ?? null);

    const { data } = await supabase
      .from('profiles')
      .select('id, nickname, full_name')
      .eq('id', user.id)
      .single();

    if (data) {
      const profile: Profile = {
        id: data.id, nickname: data.nickname, fullName: data.full_name,
        email: user.email,
      };
      setCurrentUser(profile);
      setAllProfiles([profile]);
    }
  }, []);

  useEffect(() => {
    refresh();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  return (
    <UserContext.Provider value={{ currentUser, allProfiles, refresh, userEmail }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
