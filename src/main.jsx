import React from "react";
import { createRoot } from "react-dom/client";
import "./styles/lhb-tokens.css";
import "./styles/app.css";
import App from "./App.jsx";
import { CONFIG } from "./config.js";

if (CONFIG.captcha) {
  const s = document.createElement("script");
  s.src = "https://web3forms.com/client/script.js";
  s.async = true; s.defer = true;
  document.head.appendChild(s);
}

createRoot(document.getElementById("root")).render(<App />);
