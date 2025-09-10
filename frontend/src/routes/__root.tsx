import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import Header from "../components/Header";
import { useUser } from "../context/userContext";
import { SessionProvider } from "../context/sessionContext";
import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createRootRoute({
  component: () => {
    const { user } = useUser();
    const router = useRouter();

    // Protect all routes except /auth
    useEffect(() => {
      if (!user && router.state.location.pathname !== "/auth") {
        router.navigate({ to: "/auth" });
      }
    }, [user, router.state.location.pathname]);

    return (
      <>
        <SessionProvider>
          <Header />
          <Outlet />
        </SessionProvider>

        <TanStackRouterDevtools position="bottom-left" />
        <ReactQueryDevtools />
      </>
    );
  },
});
