import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

type User = {
  username: string;
  token: string;
  user_id: number;
  wins?: number;
  losses?: number;
} | null;

interface UserContextType {
  user: User;
  login: (username: string) => Promise<void>;
  logout: () => void;
}

const getStoredUser = (): User => {
  const token = sessionStorage.getItem("iGamingToken");
  const username = sessionStorage.getItem("iGamingUser");
  const user_id = sessionStorage.getItem("iGamingUserId");
  const wins = sessionStorage.getItem("iGamingWins");
  const losses = sessionStorage.getItem("iGamingLosses");
  if (token && username && user_id) {
    return {
      username,
      token,
      user_id: Number(user_id),
      wins: wins ? Number(wins) : 0,
      losses: losses ? Number(losses) : 0,
    };
  }
  return null;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User>(getStoredUser());

  // Listen for SSE
  useEffect(() => {
    const eventSource = new window.EventSource("/api/session/stream");
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (
        data.type === "user_stats_update" &&
        user &&
        data.user_id === user.user_id
      ) {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                wins: data.wins,
                losses: data.losses,
                updatedAt: Date.now(),
              }
            : prev,
        );
        sessionStorage.setItem("iGamingWins", String(data.wins ?? 0));
        sessionStorage.setItem("iGamingLosses", String(data.losses ?? 0));
      }
    };
    eventSource.onerror = () => {
      eventSource.close();
    };
    return () => {
      eventSource.close();
    };
  }, [user]);

  const login = async (username: string) => {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    if (!res.ok) {
      throw new Error((await res.json()).error || "Login failed");
    }
    const data = await res.json();
    setUser({
      username: data.username,
      token: data.token,
      user_id: data.user_id,
      wins: data.wins,
      losses: data.losses,
    });
    sessionStorage.setItem("iGamingToken", data.token);
    sessionStorage.setItem("iGamingUser", data.username);
    sessionStorage.setItem("iGamingUserId", String(data.user_id));
    sessionStorage.setItem("iGamingWins", String(data.wins ?? 0));
    sessionStorage.setItem("iGamingLosses", String(data.losses ?? 0));
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem("iGamingToken");
    sessionStorage.removeItem("iGamingUser");
    sessionStorage.removeItem("iGamingUserId");
    sessionStorage.removeItem("iGamingWins");
    sessionStorage.removeItem("iGamingLosses");
  };

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
};
