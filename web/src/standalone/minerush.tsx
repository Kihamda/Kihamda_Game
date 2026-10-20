import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import MineRush from "../../games/minerush/src/App";

createRoot(document.getElementById("root")!).render(
  <StrictMode><MineRush /></StrictMode>,
);
