import React, { createContext, useContext, useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL;

export interface SessionContextType {
  prepSeconds: number;
  prepActive: boolean;
  activeSession: boolean;
  sessionId: number | null;
  startedBy: string | null;
  participants: string[];
  winners: string[];
  winningNumber: number | null;
  sessionEnded: boolean;
  countdown: number;
}

const defaultSessionContext: SessionContextType = {
  prepSeconds: 0,
  prepActive: false,
  activeSession: false,
  sessionId: null,
  startedBy: null,
  participants: [],
  winners: [],
  winningNumber: null,
  sessionEnded: false,
  countdown: 0,
};

const SessionContext = createContext<SessionContextType>(defaultSessionContext);

export const useSession = () => useContext(SessionContext);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [prepSeconds, setPrepSeconds] = useState(0);
  const [prepActive, setPrepActive] = useState(false);
  const [activeSession, setActiveSession] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [startedBy, setStartedBy] = useState<string | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [winners, setWinners] = useState<string[]>([]);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE}/api/session/stream`);
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case "session_started":
          setActiveSession(true);
          setSessionId(data.session?.id ?? null);
          setStartedBy(data.started_by || null);
          setParticipants(data.participants || []);
          setWinners([]);
          setWinningNumber(null);
          setSessionEnded(false);
          setPrepSeconds(0);
          setPrepActive(false);
          setCountdown(data.duration || 0);
          break;
        case "timer_update":
          setCountdown(data.seconds_remaining);
          break;
        case "user_joined":
        case "user_left":
          setParticipants(data.participants || []);
          break;
        case "number_picked":
          // Optionally update participants with picks
          setParticipants((prev) => {
            if (Array.isArray(data.participants)) {
              return data.participants.map((p: any) => p.username || p);
            }
            return prev;
          });
          break;
        case "session_ended":
          setSessionEnded(true);
          setWinners(data.winners || []);
          setWinningNumber(data.winning_number || null);
          setActiveSession(false);
          break;
        case "prep_timer_update":
          setPrepSeconds(data.seconds_remaining);
          setPrepActive(true);
          break;
        case "prep_timer_done":
          setPrepSeconds(0);
          setPrepActive(false);
          break;
        case "gameover":
          // Reset all session state to default
          setPrepSeconds(0);
          setPrepActive(false);
          setActiveSession(false);
          setSessionId(null);
          setStartedBy(null);
          setParticipants([]);
          setWinners([]);
          setWinningNumber(null);
          setSessionEnded(false);
          setCountdown(0);
          break;
        default:
          break;
      }
    };
    eventSource.onerror = () => {
      eventSource.close();
    };
    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <SessionContext.Provider
      value={{
        prepSeconds,
        prepActive,
        activeSession,
        sessionId,
        startedBy,
        participants,
        winners,
        winningNumber,
        sessionEnded,
        countdown,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};
