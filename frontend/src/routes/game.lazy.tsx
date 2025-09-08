import { createLazyFileRoute } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useUser } from "../context/userContext";
import { usePrepTimer } from "../context/prepTimerContext";

const Game: React.FC = () => {
  const { user } = useUser();
  const { prepSeconds, prepActive } = usePrepTimer();
  const [selected, setSelected] = useState<number | null>(null);
  const [hasPicked, setHasPicked] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [winners, setWinners] = useState<string[]>([]);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [inSession, setInSession] = useState(false);
  const [hasJoinedSession, setHasJoinedSession] = useState(false);

  // Add session state for countdown and max users
  const [maxUsers, setMaxUsers] = useState(10);
  const [countdown, setCountdown] = useState(0);

  // Real pick mutation
  const mutation = useMutation({
    mutationFn: async (pick: number) => {
      if (!user) throw new Error("Not logged in");
      const res = await fetch("/api/game/pick", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ user_id: user.user_id, picked_number: pick }),
      });
      if (!res.ok) {
        throw new Error("Failed to pick number");
      }
      return { success: true };
    },
    onSuccess: () => {
      setHasPicked(true);
    },
  });

  // SSE integration
  useEffect(() => {
    const eventSource = new EventSource("/api/session/stream");
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case "session_started":
          setSessionEnded(false);
          setHasPicked(false);
          setSelected(null);
          setParticipants(data.participants || []);
          setWinners([]);
          setWinningNumber(null);
          setInSession(data.participants?.includes(user?.username ?? ""));
          setMaxUsers(data.maxUsers);
          // Use backend duration for countdown
          setCountdown(data.duration);
          break;
        case "timer_update":
          // Sync countdown with backend
          setCountdown(data.seconds_remaining);
          break;
        case "user_joined":
        case "user_left":
          setParticipants(data.participants || []);
          setInSession(data.participants?.includes(user?.username ?? ""));
          break;
        case "number_picked":
          break;
        case "session_ended":
          setSessionEnded(true);
          setWinners(data.winners || []);
          setWinningNumber(data.winning_number || null);
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
  }, [user]);

  const handleJoinSession = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/session/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ user_id: user.user_id }),
      });
      if (!res.ok) {
        alert("Failed to join session");
        return;
      }
      // Set hasJoinedSession to true only on successful join
      setHasJoinedSession(true);
      setInSession(true);

      if (!participants.includes(user.username)) {
        setParticipants([...participants, user.username]);
      }
    } catch (err) {
      alert("Error joining session");
    }
  };

  // Play view
  const handlePick = (num: number) => {
    setSelected(num);
    mutation.mutate(num);
  };

  if (!hasJoinedSession && !sessionEnded) {
    // Lobby view
    const canJoin = countdown > 0 && participants.length < maxUsers;
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <section className="w-full max-w-md bg-white rounded-lg shadow-md p-6 flex flex-col gap-6">
          <h1 className="text-2xl font-bold text-center">Game Lobby</h1>
          <button
            className={`bg-green-600 text-white py-2 rounded-md font-semibold hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:outline-none ${!canJoin ? "opacity-50 cursor-not-allowed" : ""}`}
            aria-label="Join session"
            disabled={!canJoin}
            onClick={canJoin ? handleJoinSession : undefined}
          >
            {canJoin
              ? "Join Session"
              : participants.length >= maxUsers
                ? "Session Full"
                : countdown === 0
                  ? "No Active Session"
                  : "Join Session"}
          </button>
          {canJoin && (
            <div className="flex flex-col items-center gap-2">
              <span className="text-gray-700">Session closes in:</span>
              <span className="text-3xl font-mono" aria-live="polite">
                {countdown.toString().padStart(2, "0")}
              </span>
            </div>
          )}
        </section>
      </main>
    );
  } else if (hasJoinedSession && !sessionEnded) {
    // Play view
    return (
      <main className="relative flex min-h-[93vh] items-center justify-center bg-gray-50 p-4">
        <span
          className="absolute top-[90px] right-12 text-8xl font-mono"
          aria-live="polite"
        >
          {countdown.toString().padStart(2, "0")}
        </span>
        <section className="w-full max-w-md bg-white rounded-lg shadow-md p-6 flex flex-col gap-6">
          <h1 className="text-2xl font-bold text-center">Pick a Number</h1>
          <div
            className="grid grid-cols-3 gap-4"
            role="group"
            aria-label="Pick a number"
          >
            {[...Array(9)].map((_, i) => (
              <button
                key={i + 1}
                className={`py-4 rounded-md font-bold text-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  selected === i + 1
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-800"
                } ${hasPicked ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => !hasPicked && handlePick(i + 1)}
                aria-pressed={selected === i + 1}
                aria-label={`Pick number ${i + 1}`}
                disabled={hasPicked}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="text-center text-sm text-gray-600 mt-2">
            {participants.length} user{participants.length !== 1 ? "s" : ""}{" "}
            joined
          </div>
          {mutation.status === "pending" && (
            <div className="text-center text-lg font-semibold" role="status">
              Checking result...
            </div>
          )}
        </section>
      </main>
    );
  }
  if (sessionEnded) {
    return (
      <main className="flex min-h-[93vh] items-center justify-center bg-gray-50 p-0 md:p-4">
        <section className="w-full max-w-5xl bg-white rounded-lg shadow-md flex flex-col md:flex-row md:gap-6 gap-0 md:p-8 p-0">
          {/* Left Column: Active Users */}
          <div className="md:w-1/3 w-full md:border-r border-gray-200 md:pr-6 pr-0 flex flex-col items-start gap-4 md:gap-6 p-6 md:p-0">
            <h2 className="text-lg font-bold mb-4 text-left">Active Users</h2>
            <ul className="w-full text-sm text-gray-700">
              {participants.map((user) => (
                <li
                  key={user}
                  className="py-2 px-3 rounded hover:bg-gray-100 text-left"
                >
                  {user}
                </li>
              ))}
            </ul>
          </div>
          {/* Center Column: Result Info */}
          <div className="md:w-1/3 w-full flex flex-col items-center justify-center gap-6 md:px-8 px-0 py-8 md:py-0">
            <h2 className="text-2xl font-bold mb-2 text-center">Result</h2>
            <div className="flex flex-col items-center gap-2 w-full">
              <span
                className="text-6xl font-extrabold text-blue-700 mb-2"
                aria-live="polite"
              >
                {winningNumber ?? "--"}
              </span>
            </div>

            <div
              className="text-center text-lg font-semibold mt-4"
              role="status"
            >
              {selected === winningNumber ? (
                <span className="text-green-600 font-bold">
                  Congratulations! You won!
                </span>
              ) : (
                <span className="text-red-600 font-bold">
                  Sorry, you lost this round.
                </span>
              )}
            </div>

            <div className="flex flex-col items-center gap-2 w-full">
              <span className="text-gray-500 text-base">Total Players</span>
              <span className="text-3xl font-bold text-gray-800">
                {participants.length}
              </span>
            </div>
            <div className="flex flex-col items-center gap-2 w-full">
              <span className="text-gray-500 text-base">Total Wins</span>
              <span className="text-3xl font-bold text-green-600">
                {winners.length}
              </span>
            </div>
            <div className="flex flex-col items-center gap-2 w-full mt-4">
              <span className="text-gray-500 text-base">
                New session starts in
              </span>
              <span
                className="text-4xl font-mono font-bold text-red-600 animate-pulse"
                aria-live="polite"
              >
                {prepActive ? `${prepSeconds}s` : "Ready"}
              </span>
            </div>
          </div>
          {/* Right Column: Winners List */}
          <div className="md:w-1/3 w-full md:border-l border-gray-200 md:pl-6 pl-0 flex flex-col items-start gap-4 md:gap-6 p-6 md:p-0">
            <h2 className="text-lg font-bold mb-4 text-left">Winners</h2>
            {winners.length === 0 ? (
              <div className="text-sm text-gray-500">
                No winners this round.
              </div>
            ) : (
              <ul className="w-full text-sm text-green-700">
                {winners.map((winner) => (
                  <li
                    key={winner}
                    className="py-2 px-3 rounded hover:bg-green-50 text-left"
                  >
                    {winner}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    );
  }
  return null;
};

export const Route = createLazyFileRoute("/game")({
  component: Game,
});
