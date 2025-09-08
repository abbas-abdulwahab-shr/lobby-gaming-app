import React, { useState } from "react";
import { createLazyFileRoute } from "@tanstack/react-router";
import { useUser } from "../context/userContext";
import { useRouter } from "@tanstack/react-router";

const Auth: React.FC = () => {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login, user } = useUser();

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("Submitting login for:", username);

    e.preventDefault();
    if (!username.trim()) {
      setError("Username is required");
      return;
    }
    setLoading(true);
    try {
      await login(username);
      setUsername("");
      router.navigate({ to: "/" });
      //done here
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <form
        className="w-full max-w-sm bg-white rounded-lg shadow-md p-6 flex flex-col gap-4"
        onSubmit={handleSubmit}
        aria-label="Login form"
      >
        <h1 className="text-2xl font-bold text-center">Login</h1>
        <label htmlFor="username" className="text-sm font-medium text-gray-700">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setError("");
          }}
          className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error && (
          <span className="text-red-600 text-sm" role="alert">
            {error}
          </span>
        )}
        <button
          type="submit"
          className="bg-blue-600 text-white py-2 rounded-md font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          Log In
          {loading ? (
            <svg
              className="animate-spin h-5 w-5 inline-block mr-2 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-label="Loading"
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
          ) : null}
        </button>
      </form>
    </main>
  );
};

export const Route = createLazyFileRoute("/auth")({
  component: Auth,
});
