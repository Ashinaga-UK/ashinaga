'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getMyProfile, type ScholarProfile } from './api/profile';

export type ProgramStage = 'prep_year' | 'scholar';

export type ScholarSessionValue = {
  profile: ScholarProfile | null;
  programStage: ProgramStage | null;
  profileStatus: 'loading' | 'ready' | 'error';
  refreshProfile: () => Promise<ScholarProfile | null>;
  applyProfile: (profile: ScholarProfile) => void;
};

const ScholarSessionContext = createContext<ScholarSessionValue | null>(null);

export function ScholarSessionProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<ScholarProfile | null>(null);
  const [profileStatus, setProfileStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const refreshProfile = useCallback(async () => {
    try {
      const next = await getMyProfile();
      setProfile(next);
      setProfileStatus('ready');
      return next;
    } catch {
      setProfile(null);
      setProfileStatus('error');
      return null;
    }
  }, []);

  const applyProfile = useCallback((next: ScholarProfile) => {
    setProfile(next);
    setProfileStatus('ready');
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const programStage: ProgramStage | null =
    profileStatus !== 'ready'
      ? null
      : profile?.programStage === 'prep_year'
        ? 'prep_year'
        : 'scholar';

  const value = useMemo(
    () => ({ profile, programStage, profileStatus, refreshProfile, applyProfile }),
    [profile, programStage, profileStatus, refreshProfile, applyProfile]
  );

  return <ScholarSessionContext.Provider value={value}>{children}</ScholarSessionContext.Provider>;
}

export function useScholarSession(): ScholarSessionValue {
  const context = useContext(ScholarSessionContext);
  if (!context) {
    throw new Error('useScholarSession must be used within ScholarSessionProvider');
  }
  return context;
}
