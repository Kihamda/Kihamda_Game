import { Suspense, useEffect, useMemo, useState } from "react";
import PortalApp from "./portal/App";
import { isPortalPath, portalPages, canonicalPath } from "./portal/routes";
import "./app/AppShell.css";
import { getGameById } from "./games/metadata";
import { gameComponents, hasGameComponent } from "./games/registry";
import { catalogSearch, readCatalogState, type CatalogState } from "./portal/navigation";

type Route =
  | { type: "home" }
  | { type: "portal"; pathname: string }
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
  if (isPortalPath(normalized)) return { type: "portal", pathname: normalized };

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
  const [location, setLocation] = useState(() => ({ pathname: window.location.pathname, search: window.location.search, hash: window.location.hash }));
  const { pathname, search, hash } = location;
  const catalogState = readCatalogState(search);
  const onCatalogChange = (state: CatalogState) => {
    const next = { ...location, search: catalogSearch(state) };
    // Editing search/filter changes the current entry, not one history entry per keystroke.
    window.history.replaceState(window.history.state, "", `${next.pathname}${next.search}${next.hash}`);
    setLocation(next);
  };

  useEffect(() => {
    const onPopState = () => {
      setLocation({ pathname: window.location.pathname, search: window.location.search, hash: window.location.hash });
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
      if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return;

      const nextRoute = parseRoute(url.pathname);
      if (nextRoute.type === "notFound") return;

      event.preventDefault();
      window.history.pushState(
        {},
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
      setLocation({ pathname: url.pathname, search: url.search, hash: url.hash });
    };

    window.addEventListener("popstate", onPopState);
    window.addEventListener("hashchange", onPopState);
    document.addEventListener("click", onDocumentClick);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("hashchange", onPopState);
      document.removeEventListener("click", onDocumentClick);
    };
  }, []);

  const route = useMemo(() => parseRoute(pathname), [pathname]);

  useEffect(() => {
    const page = portalPages[canonicalPath(pathname)];
    if (page) {
      document.title = `${page.title} | Kihamda.NET`;
      for (const selector of ['meta[name="description"]', 'meta[property="og:description"]']) {
        document.querySelector(selector)?.setAttribute("content", page.description);
      }
      document.querySelector('meta[property="og:title"]')?.setAttribute("content", document.title);
      const url = `https://game.kihamda.net${canonicalPath(pathname)}`;
      document.querySelector('link[rel="canonical"]')?.setAttribute("href", url);
      document.querySelector('meta[property="og:url"]')?.setAttribute("content", url);
    }
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
      if (page) document.getElementById("main")?.focus({ preventScroll: true });
    }
    if (hash) document.getElementById(hash.slice(1))?.focus({ preventScroll: true });
  }, [pathname, hash]);

  useEffect(() => {
    const isGameRoute = route.type === "game";
    document.body.classList.toggle("is-game-route", isGameRoute);

    return () => {
      document.body.classList.remove("is-game-route");
    };
  }, [route.type]);

  if (route.type === "home") {
    return <PortalApp catalogState={catalogState} onCatalogChange={onCatalogChange} />;
  }
  if (route.type === "portal") {
    return <PortalApp pathname={route.pathname} catalogState={catalogState} onCatalogChange={onCatalogChange} />;
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
