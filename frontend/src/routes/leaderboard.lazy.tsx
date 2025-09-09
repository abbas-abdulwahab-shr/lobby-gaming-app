import { createLazyFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useUser } from "../context/userContext";

const API_BASE = import.meta.env.VITE_API_URL;

const fetchLeaderboard = async (token: string) => {
  const res = await fetch(`${API_BASE}/api/players/top`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  const data = await res.json();
  return data.players;
};

const fetchGroupedWinners = async (token: string, period: string) => {
  const res = await fetch(`${API_BASE}/api/winners/grouped?period=${period}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch grouped winners");
  const data = await res.json();
  return data.grouped;
};

export const Route = createLazyFileRoute("/leaderboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = useUser();
  const [tab, setTab] = useState("all");
  const [period, setPeriod] = useState("month");

  const { data: leaderboard, isLoading: loadingLeaderboard } = useQuery({
    queryKey: ["leaderboard", user?.token],
    queryFn: () => fetchLeaderboard(user?.token ?? ""),
    enabled: !!user?.token,
  });

  const { data: groupedWinners, isLoading: loadingGrouped } = useQuery({
    queryKey: ["groupedWinners", user?.token, period],
    queryFn: () => fetchGroupedWinners(user?.token ?? "", period),
    enabled: !!user?.token && tab !== "all",
  });

  return (
    <main className="flex min-h-[93vh] items-center justify-center bg-gray-50 p-4">
      <section className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-8 flex flex-col gap-8 items-center border border-gray-200">
        <h1 className="text-3xl font-bold text-center text-blue-700 mb-2">
          Leaderboard
        </h1>
        <div className="flex gap-4 mb-4">
          <button
            className={`px-4 py-2 rounded-lg font-bold transition-colors duration-200 ${tab === "all" ? "bg-blue-600 text-white" : "bg-gray-200 text-blue-700"}`}
            onClick={() => setTab("all")}
          >
            All Time
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-bold transition-colors duration-200 ${tab === "grouped" ? "bg-blue-600 text-white" : "bg-gray-200 text-blue-700"}`}
            onClick={() => setTab("grouped")}
          >
            Winners by Period
          </button>
        </div>
        {tab === "all" ? (
          loadingLeaderboard ? (
            <div className="text-center text-lg text-gray-500">Loading...</div>
          ) : !leaderboard || leaderboard.length === 0 ? (
            <div className="text-center text-lg text-gray-400">
              No leaderboard data available.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-blue-100">
                  <th className="py-2 px-4 rounded-tl-lg">Rank</th>
                  <th className="py-2 px-4">Username</th>
                  <th className="py-2 px-4 rounded-tr-lg">Wins</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map(
                  (player: { username: string; wins: number }, idx: number) => (
                    <tr
                      key={player.username}
                      className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}
                    >
                      <td className="py-2 px-4 font-bold text-blue-600">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-4">{player.username}</td>
                      <td className="py-2 px-4 font-semibold text-green-600">
                        {player.wins}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          )
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <button
                className={`px-3 py-1 rounded-md font-semibold transition-colors duration-200 ${period === "month" ? "bg-purple-600 text-white" : "bg-gray-200 text-purple-700"}`}
                onClick={() => setPeriod("month")}
              >
                Month
              </button>
              <button
                className={`px-3 py-1 rounded-md font-semibold transition-colors duration-200 ${period === "week" ? "bg-purple-600 text-white" : "bg-gray-200 text-purple-700"}`}
                onClick={() => setPeriod("week")}
              >
                Week
              </button>
              <button
                className={`px-3 py-1 rounded-md font-semibold transition-colors duration-200 ${period === "day" ? "bg-purple-600 text-white" : "bg-gray-200 text-purple-700"}`}
                onClick={() => setPeriod("day")}
              >
                Day
              </button>
            </div>
            {loadingGrouped ? (
              <div className="text-center text-lg text-gray-500">
                Loading...
              </div>
            ) : !groupedWinners || Object.keys(groupedWinners).length === 0 ? (
              <div className="text-center text-lg text-gray-400">
                No winner data available for this period.
              </div>
            ) : (
              <div className="w-full">
                {Object.entries(groupedWinners).map(
                  ([periodLabel, winners]) => (
                    <div key={periodLabel} className="mb-6">
                      <div className="text-lg font-bold text-purple-700 mb-2 border-b pb-1">
                        {period === "month"
                          ? `Month: ${periodLabel}`
                          : period === "week"
                            ? `Week: ${periodLabel}`
                            : `Day: ${periodLabel}`}
                      </div>
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-purple-100">
                            <th className="py-2 px-4 rounded-tl-lg">
                              Username
                            </th>
                            <th className="py-2 px-4 rounded-tr-lg">Wins</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(
                            winners as Array<{ username: string; wins: number }>
                          ).map((winner, idx) => (
                            <tr
                              key={winner.username}
                              className={
                                idx % 2 === 0 ? "bg-gray-50" : "bg-white"
                              }
                            >
                              <td className="py-2 px-4 font-semibold text-purple-700">
                                {winner.username}
                              </td>
                              <td className="py-2 px-4 font-bold text-green-600">
                                {winner.wins}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ),
                )}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
