
# iGaming App Documentation / POC

## Overview
This project is a monorepo application containing both the backend and frontend for a real-time, multi-player game.

## Backend
- Built with **Express** and **SQLite** for simplicity and reliability.
- Heavily utilizes **Server-Sent Events (SSE)** to enable real-time updates and multi-player interactions.
- Session management, authentication, and game logic are handled server-side, with live broadcasts to all connected clients.

## Frontend
- Built with **React**, **TypeScript**, and **Vite** **TanStackRouter** for fast development and optimized performance.

- Uses **TailwindCSS** and custom CSS for a modern, responsive UI.
- Uses **TanStackQuery** for proper api management and caching.
- **ESLint** is used for code quality and consistency.
- The app is designed to be **lazy loaded** for great performance, loading only what is needed for each route. we optimize from scratch

## Approach
- The monorepo structure keeps backend and frontend code organized and easy to maintain.
- SSE ensures all users see live updates instantly, supporting the multi-player goal of the game.
- The frontend is optimized for speed and user experience, with lazy loading and modern tooling.

