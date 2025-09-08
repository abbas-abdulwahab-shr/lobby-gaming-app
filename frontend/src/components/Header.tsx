import { Link } from "@tanstack/react-router";
import { useUser } from "../context/userContext";

export default function Header() {
  const { user, logout } = useUser();
  return (
    <header
      className="w-full bg-gradient-to-r from-blue-700 via-purple-700 to-pink-600 shadow-md py-4 px-6 flex items-center justify-between"
      style={{
        backgroundImage:
          "linear-gradient(90deg, #1e3a8a 0%, #6d28d9 50%, #db2777 100%)",
      }}
    >
      <Link to="/">
        <h2 className="text-white text-xl font-bold tracking-wide">
          iGaming Lobby
        </h2>
      </Link>
      <nav>
        <ul className="flex space-x-6 items-center">
          {user && (
            <>
              <li>
                <Link to="/game" className="text-white">
                  Game
                </Link>
              </li>
              <li>
                <Link to="/leaderboard" className="text-white">
                  Leaderboard
                </Link>
              </li>
            </>
          )}
          {!user && (
            <li>
              <Link to="/auth" className="text-white">
                Login
              </Link>
            </li>
          )}
          {user && (
            <li>
              <button
                className="bg-white text-blue-700 px-3 py-1 rounded shadow hover:bg-blue-100 font-bold"
                onClick={logout}
              >
                Logout
              </button>
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
}
