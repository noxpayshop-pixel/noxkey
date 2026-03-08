import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DiscordAuthState {
  isLoggedIn: boolean;
  discordUsername: string | null;
  sessionToken: string | null;
  login: (username: string, token: string) => void;
  logout: () => void;
  loading: boolean;
}

const DiscordAuthContext = createContext<DiscordAuthState | null>(null);

export function DiscordAuthProvider({ children }: { children: ReactNode }) {
  const [discordUsername, setDiscordUsername] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage
    const stored = localStorage.getItem('nox_session');
    if (stored) {
      try {
        const { username, token } = JSON.parse(stored);
        // Validate session against DB
        supabase
          .from('discord_users')
          .select('id')
          .eq('discord_username', username)
          .eq('session_token', token)
          .single()
          .then(({ data }) => {
            if (data) {
              setDiscordUsername(username);
              setSessionToken(token);
            } else {
              localStorage.removeItem('nox_session');
            }
            setLoading(false);
          });
      } catch {
        localStorage.removeItem('nox_session');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = (username: string, token: string) => {
    setDiscordUsername(username);
    setSessionToken(token);
    localStorage.setItem('nox_session', JSON.stringify({ username, token }));
  };

  const logout = () => {
    setDiscordUsername(null);
    setSessionToken(null);
    localStorage.removeItem('nox_session');
  };

  return (
    <DiscordAuthContext.Provider
      value={{
        isLoggedIn: !!discordUsername && !!sessionToken,
        discordUsername,
        sessionToken,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </DiscordAuthContext.Provider>
  );
}

export function useDiscordAuth() {
  const ctx = useContext(DiscordAuthContext);
  if (!ctx) throw new Error('useDiscordAuth must be used within DiscordAuthProvider');
  return ctx;
}
