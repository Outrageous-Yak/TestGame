import { WindComposerApp } from "./app";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const root = document.getElementById("app");
if (!root) {
  document.body.textContent = "Wind Composer failed to load: missing #app element.";
} else {
  try {
    const app = new WindComposerApp();
    app.mount(root);
  } catch (err) {
    root.innerHTML = `<div style="padding:16px;color:#e07070;font-family:sans-serif">
      <h2>Wind Composer failed to start</h2>
      <pre>${escapeHtml(String(err))}</pre>
      <p>Try clearing site data or removing the app from Home Screen and reopening in Safari.</p>
    </div>`;
    console.error(err);
  }
}
