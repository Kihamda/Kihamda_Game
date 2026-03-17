import { Suspense, useEffect, useMemo, useState } from "react";
import PortalApp from "./portal/App";
import "./app/AppShell.css";
import { getGameById } from "./games/metadata";
import { gameComponents, hasGameComponent } from "./games/registry";

type Route =
  | { type: "home" }
  | { type: "game"; gameId: string }
  | { type: "notFound" };

function normalizePathname(pathname: string): string {
  const withSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const normalizedIndex = withSlash.replace(/\/index\.html$/, "/");

  if (normalizedIndex !== "/" && normalizedIndex.endsWith("/")) {
    return normalizedIndex.slice(0, -1);
  }

  return normalizedIndex;
}

function parseRoute(pathname: string): Route {
  const normalized = normalizePathname(pathname);
  if (normalized === "/") return { type: "home" };

  const gameMatch = normalized.match(/^\/games\/([^/]+)$/);
  if (gameMatch?.[1]) {
    try {
      return { type: "game", gameId: decodeURIComponent(gameMatch[1]) };
    } catch {
      return { type: "notFound" };
    }
  }

  return { type: "notFound" };
}

function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => {
      setPathname(window.location.pathname);
    };

    const onDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target || anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.origin);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.hash) return;

      const nextRoute = parseRoute(url.pathname);
      if (nextRoute.type === "notFound") return;

      event.preventDefault();
      window.history.pushState(
        {},
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
      setPathname(url.pathname);
    };

    window.addEventListener("popstate", onPopState);
    document.addEventListener("click", onDocumentClick);
    return () => {
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("click", onDocumentClick);
    };
  }, []);

  const route = useMemo(() => parseRoute(pathname), [pathname]);

  useEffect(() => {
    const isGameRoute = route.type === "game";
    document.body.classList.toggle("is-game-route", isGameRoute);

    return () => {
      document.body.classList.remove("is-game-route");
    };
  }, [route.type]);

  if (route.type === "home") {
    return <PortalApp />;
  }

  if (route.type === "game") {
    const game = getGameById(route.gameId);
    if (!game || !hasGameComponent(route.gameId)) {
      return <NotFound />;
    }

    const GameComponent = gameComponents[route.gameId];
    if (!GameComponent) {
      return <NotFound />;
    }

    return (
      <Suspense fallback={<Loading gameTitle={game.title} />}>
        <GameComponent />
      </Suspense>
    );
  }

  return <NotFound />;
}

function Loading({ gameTitle }: { gameTitle: string }) {
  return (
    <main className="app-shell-center">
      <section className="app-shell-card">
        <p>{gameTitle} を読み込み中</p>
      </section>
    </main>
  );
}

function NotFound() {
  return (
    <main className="app-shell-center">
      <section className="app-shell-card">
        <h1>ページが見つからない</h1>
        <p>URLを確認して もう一度アクセスしてね</p>
        <p>
          <a href="/">ポータルへ戻る</a>
        </p>
      </section>
    </main>
  );
}

export default App;
