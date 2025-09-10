import { createLazyFileRoute } from "@tanstack/react-router";
import { useUser } from "../context/userContext";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useSession } from "../context/sessionContext";

const API_BASE = import.meta.env.VITE_API_URL;

const Index: React.FC = () => {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const {
    prepSeconds,
    prepActive,
    participants,
    startedBy,
    countdown,
    activeSession,
  } = useSession();
  // Defensive: user.username may be undefined, so check user and username
  const isParticipant = Boolean(
    user && user.username && participants.includes(user.username),
  );
  const maxUsers = 10; // Can be dynamic if needed

  const disableStartButton =
    prepActive ||
    prepSeconds > 0 ||
    isParticipant ||
    participants.length >= maxUsers;

  // Determine if user is in session

  const canShowTimer = countdown > 0 && activeSession;

  const handleJoinSession = async () => {
    if (!user) {
      alert("You must be logged in to join a session");
      router.navigate({ to: "/auth" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/session/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ user_id: user?.user_id }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to join session");
        return;
      }
      router.navigate({ to: "/game" });
    } catch (err) {
      alert("Error joining session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[93vh] flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 p-4">
      {user && (
        <div className="absolute top-[90px] right-[20px] transform -translate-x-1/2 px-6 py-4 bg-white rounded-xl shadow-lg border border-gray-300 text-gray-900 font-bold text-lg flex flex-col items-center z-10">
          <div className="mb-1 text-xl font-extrabold">Hi, {user.username}</div>
          <div className="flex gap-6 text-base font-semibold mt-1">
            <span className="text-green-700">Wins: {user.wins ?? 0}</span>
            <span className="text-red-600">Losses: {user.losses ?? 0}</span>
          </div>
        </div>
      )}
      <section className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 flex flex-col gap-8 items-center border border-gray-200">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 text-center tracking-tight">
            Game Lobby
          </h1>
          <p className="text-base md:text-lg text-gray-600 text-center mt-3">
            Join, play, and compete to win.
            <br />
            Pick a number and see if you are the lucky winner.
          </p>
        </div>
        {startedBy && (
          <div className="text-center text-base text-gray-600 mb-2">
            <span className="font-semibold text-blue-700">
              Session started by:
            </span>{" "}
            {startedBy}
          </div>
        )}
        <button
          className={`relative inline-flex items-center justify-center px-6 py-3 font-bold text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-lg shadow-lg transition-transform transform hover:scale-105 hover:from-indigo-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${disableStartButton ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={disableStartButton ? undefined : handleJoinSession}
          disabled={disableStartButton}
        >
          <span className="mr-2">🎮</span>
          {maxUsers <= participants.length ? "Session Full" : "Join"}
          {loading && (
            <span className="ml-4 flex items-center">
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            </span>
          )}
        </button>
        {canShowTimer && (
          <div className="flex flex-col items-center gap-2 mt-2">
            <span className="text-gray-700">Session closes in:</span>
            <span className="text-3xl font-mono" aria-live="polite">
              {countdown.toString().padStart(2, "0")}
            </span>
          </div>
        )}
        {prepActive && (
          <div className="text-center text-lg font-semibold text-red-600 mt-2">
            New session can be started in:{" "}
            <span className="font-mono">{prepSeconds}s</span>
          </div>
        )}
      </section>
    </main>
  );
};

export const Route = createLazyFileRoute("/")({
  component: Index,
});
