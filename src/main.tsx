import React from "react";
import ReactDOM from "react-dom/client";

import "./ui/app.css";
import App from "./ui/app";

const rootEl = document.getElementById("app");
if (!rootEl) {
  throw new Error("Missing #app element");
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
