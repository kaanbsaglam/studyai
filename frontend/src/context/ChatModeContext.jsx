import { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { CHAT_MODES, CHAT_MODE_STORAGE_KEY } from './chatModeConstants';

const ChatModeContext = createContext(null);

export function ChatModeProvider({ children }) {
  const { user } = useAuth();
  const [mode, setModeState] = useState(() => {
    const stored = localStorage.getItem(CHAT_MODE_STORAGE_KEY);
    return stored === CHAT_MODES.ORCHESTRATOR ? CHAT_MODES.ORCHESTRATOR : CHAT_MODES.STANDARD;
  });

  const setMode = useCallback((next) => {
    if (next !== CHAT_MODES.STANDARD && next !== CHAT_MODES.ORCHESTRATOR) return;
    setModeState(next);
    localStorage.setItem(CHAT_MODE_STORAGE_KEY, next);
  }, []);

  // Tier gate is enforced at read time: FREE users always see STANDARD
  // regardless of what's stored, so an upgrade later restores their pick.
  const canUseOrchestrator = user?.tier === 'PREMIUM';
  const effectiveMode = canUseOrchestrator ? mode : CHAT_MODES.STANDARD;

  return (
    <ChatModeContext.Provider
      value={{ mode: effectiveMode, rawMode: mode, setMode, canUseOrchestrator }}
    >
      {children}
    </ChatModeContext.Provider>
  );
}

export function useChatMode() {
  const ctx = useContext(ChatModeContext);
  if (!ctx) throw new Error('useChatMode must be used within a ChatModeProvider');
  return ctx;
}
