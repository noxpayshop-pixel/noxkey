import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Redirect discord.thenox.top to Discord invite
if (window.location.hostname === "discord.thenox.top") {
  window.location.replace("https://discord.gg/TpRf9UpnGW");
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}
