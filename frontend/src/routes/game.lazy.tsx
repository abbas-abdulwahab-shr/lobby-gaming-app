import { createLazyFileRoute } from "@tanstack/react-router";
import React, { useState, useEffect, use } from "react";
import { useMutation } from "@tanstack/react-query";
import { useUser } from "../context/userContext";
import { useSession } from "../context/sessionContext";
import { useRouter } from "@tanstack/react-router";

const API_BASE = import.meta.env.VITE_API_URL;

const Game: React.FC = () => {
  const { user } = useUser();
  const {
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
  } = useSession();
  const [selected, setSelected] = useState<number | null>(null);
  const [hasPicked, setHasPicked] = useState(false);

  const router = useRouter();

  // Play view mutation
  const mutation = useMutation({
    mutationFn: async (pick: number) => {
      if (!user) throw new Error("Not logged in");
      const res = await fetch(`${API_BASE}/api/game/pick`, {
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

  // Join session logic
  const handleJoinSession = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/api/session/join`, {
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
      // No need to update local state, context will sync via SSE
    } catch (err) {
      alert("Error joining session");
    }
  };

  const handlePick = (num: number) => {
    if (hasPicked || mutation.isPending) return;
    setSelected(num);
    mutation.mutate(num);
  };

  const handleLeaveSession = async () => {
    if (!selected && user) {
      const res = await fetch(`${API_BASE}/api/session/leave`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ user_id: user.user_id }),
      });
      if (res.ok) {
        router.navigate({ to: "/" });
      }
    }
  };

  // Determine if user is in session
  const inSession = user && participants.includes(user.username);
  const maxUsers = 10; // Can be dynamic if needed
  const canJoin = countdown > 0 && participants.length < maxUsers && !inSession;

  // Lobby view
  // if (!inSession && !sessionEnded) {
  //   return (
  //     <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
  //       <section className="w-full max-w-md bg-white rounded-lg shadow-md p-6 flex flex-col gap-6">
  //         <h1 className="text-2xl font-bold text-center">Game Lobby</h1>
  //         {startedBy && (
  //           <div className="text-center text-base text-gray-600 mb-2">
  //             <span className="font-semibold text-blue-700">
  //               Session started by:
  //             </span>{" "}
  //             {startedBy || "System"}
  //           </div>
  //         )}
  //         <button
  //           className={`bg-green-600 text-white py-2 rounded-md font-semibold hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:outline-none ${!canJoin ? "opacity-50 cursor-not-allowed" : ""}`}
  //           aria-label="Join session"
  //           disabled={!canJoin}
  //           onClick={canJoin ? handleJoinSession : undefined}
  //         >
  //           {canJoin
  //             ? "Join Session"
  //             : participants.length >= maxUsers
  //               ? "Session Full"
  //               : countdown === 0
  //                 ? "No Active Session"
  //                 : "Join Session"}
  //         </button>
  //         {canJoin && (
  //           <div className="flex flex-col items-center gap-2">
  //             <span className="text-gray-700">Session closes in:</span>
  //             <span className="text-3xl font-mono" aria-live="polite">
  //               {countdown.toString().padStart(2, "0")}
  //             </span>
  //           </div>
  //         )}
  //       </section>
  //     </main>
  //   );
  // }

  // Play view
  if (inSession && !sessionEnded) {
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
          <div className="text-center mt-2">
            <button
              className={`bg-red-600 text-white py-2 rounded-md font-semibold hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:outline-none transition ${selected ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={hasPicked || mutation.isPending}
              onClick={handleLeaveSession}
              aria-label="Leave session"
            >
              Leave Session
            </button>
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

  // Result view
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

            <div className="flex flex-col items-center gap-1 w-full">
              <span className="text-gray-500 text-base">Total Players</span>
              <span className="text-2xl font-bold text-gray-800">
                {participants.length}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 w-full">
              <span className="text-gray-500 text-base">Total Wins</span>
              <span className="text-2xl font-bold text-green-600">
                {winners.length}
              </span>
            </div>
            <div className="flex flex-col items-center gap-2 w-full mt-4">
              <span className="text-gray-500 text-base">
                New session will be available in
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
  return (
    <main className="flex min-h-[93vh] items-center justify-center bg-gray-50">
      <section className="bg-white rounded-xl shadow-lg py-20 px-32 flex flex-col items-center gap-6">
        <h1 className="text-5xl font-extrabold text-red-600 mb-2 animate-pulse">
          Game Over
        </h1>
        <p className="text-lg text-gray-700 text-center">
          The game session has ended.
          <br />
          return to the lobby.
        </p>
        <button
          onClick={() => router.navigate({ to: "/" })}
          className="bg-blue-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
        >
          Return to Lobby
        </button>
        <div className="mt-4 flex flex-col items-center">
          <span className="text-2xl font-bold text-gray-800">
            Thanks for playing!
          </span>
        </div>
      </section>
    </main>
  );
};

export const Route = createLazyFileRoute("/game")({
  component: Game,
});
