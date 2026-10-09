import { lazy } from "react";
import type { ComponentType, LazyExoticComponent } from "react";

interface GameModule {
  default: ComponentType;
}

const gameModules = import.meta.glob<GameModule>("../../games/*/src/App.tsx");

export const gameComponents = Object.entries(gameModules).reduce<
  Record<string, LazyExoticComponent<ComponentType>>
>((acc, [moduleKey, loader]) => {
  const match = moduleKey.match(/\.\.\/\.\.\/games\/([^/]+)\/src\/App\.tsx$/);
  if (!match?.[1]) return acc;

  const gameId = match[1];
  acc[gameId] = lazy(loader);
  return acc;
}, {});

export function hasGameComponent(gameId: string): boolean {
  return gameId in gameComponents;
}
