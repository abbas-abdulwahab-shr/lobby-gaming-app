import React, { createContext, useContext, useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL;

interface PrepTimerContextType {
  prepSeconds: number;
  prepActive: boolean;
  activeSession: boolean;
}

const PrepTimerContext = createContext<PrepTimerContextType>({
  prepSeconds: 0,
  prepActive: false,
  activeSession: false,
});

export const usePrepTimer = () => useContext(PrepTimerContext);

export const PrepTimerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [prepSeconds, setPrepSeconds] = useState(0);
  const [prepActive, setPrepActive] = useState(false);
  const [activeSession, setActiveSession] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE}/api/session/stream`);
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "session_started") {
        setActiveSession(true);
        setPrepSeconds(0);
        setPrepActive(false);
      } else if (data.type === "session_ended") {
        setActiveSession(false);
      } else if (data.type === "prep_timer_update") {
        setPrepSeconds(data.seconds_remaining);
        setPrepActive(true);
      } else if (data.type === "prep_timer_done") {
        setPrepSeconds(0);
        setPrepActive(false);
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
    <PrepTimerContext.Provider
      value={{ prepSeconds, prepActive, activeSession }}
    >
      {children}
    </PrepTimerContext.Provider>
  );
};
