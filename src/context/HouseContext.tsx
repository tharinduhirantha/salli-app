import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { currentMonth, prevMonth, nextMonth } from '../utils/date';
import { getUserPendingRequest, cancelJoinRequest } from '../db/queries';

export interface House {
  id: string;
  name: string;
  joinCode: string;
  role: 'owner' | 'member';
}

export interface PendingRequest {
  id: string;
  houseName: string;
  status: string;
}

interface HouseContextValue {
  currentHouse: House | null;
  userHouses: House[];
  isLoading: boolean;
  pendingRequest: PendingRequest | null;
  switchHouse: (houseId: string) => Promise<void>;
  refresh: () => Promise<void>;
  cancelPending: () => Promise<void>;
  month: string;
  setMonth: (m: string) => void;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
}

const HouseContext = createContext<HouseContextValue>({
  currentHouse: null,
  userHouses: [],
  isLoading: true,
  pendingRequest: null,
  switchHouse: async () => {},
  refresh: async () => {},
  cancelPending: async () => {},
  month: currentMonth(),
  setMonth: () => {},
  goToPrevMonth: () => {},
  goToNextMonth: () => {},
});

const STORAGE_KEY = 'current_house_id';

export function HouseProvider({ children }: { children: React.ReactNode }) {
  const [userHouses, setUserHouses]         = useState<House[]>([]);
  const [currentHouse, setCurrentHouse]     = useState<House | null>(null);
  const [isLoading, setIsLoading]           = useState(true);
  const [pendingRequest, setPendingRequest] = useState<PendingRequest | null>(null);
  const [month, setMonth]                   = useState(currentMonth());

  const goToPrevMonth = useCallback(() => setMonth(m => prevMonth(m)), []);
  const goToNextMonth = useCallback(() => setMonth(m => nextMonth(m)), []);

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUserHouses([]); setCurrentHouse(null); setPendingRequest(null); setIsLoading(false); return; }

    const { data } = await supabase
      .from('house_members')
      .select('role, houses(id, name, join_code)')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: true });

    const houses: House[] = (data ?? []).map((r: any) => ({
      id:       r.houses.id,
      name:     r.houses.name,
      joinCode: r.houses.join_code,
      role:     r.role as 'owner' | 'member',
    }));

    setUserHouses(houses);

    if (houses.length === 0) {
      const pending = await getUserPendingRequest();
      setPendingRequest(pending);
      setCurrentHouse(null);
    } else {
      setPendingRequest(null);
      const storedId = await AsyncStorage.getItem(STORAGE_KEY);
      const stored   = houses.find(h => h.id === storedId);
      setCurrentHouse(stored ?? houses[0] ?? null);
    }
    setIsLoading(false);
  }, []);

  const switchHouse = useCallback(async (houseId: string) => {
    await AsyncStorage.setItem(STORAGE_KEY, houseId);
    setCurrentHouse(userHouses.find(h => h.id === houseId) ?? null);
  }, [userHouses]);

  const cancelPending = useCallback(async () => {
    if (!pendingRequest) return;
    await cancelJoinRequest(pendingRequest.id);
    setPendingRequest(null);
  }, [pendingRequest]);

  useEffect(() => {
    refresh();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  // Poll request status while pending — realtime requires table replication setup
  useEffect(() => {
    if (!pendingRequest || pendingRequest.status !== 'pending') return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('house_join_requests')
        .select('status')
        .eq('id', pendingRequest.id)
        .single();

      if (!data || data.status === 'approved') {
        await refresh();
      } else if (data.status === 'rejected') {
        setPendingRequest(prev => prev ? { ...prev, status: 'rejected' } : null);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [pendingRequest?.id, pendingRequest?.status, refresh]);

  return (
    <HouseContext.Provider value={{ currentHouse, userHouses, isLoading, pendingRequest, switchHouse, refresh, cancelPending, month, setMonth, goToPrevMonth, goToNextMonth }}>
      {children}
    </HouseContext.Provider>
  );
}

export function useHouse() {
  return useContext(HouseContext);
}
