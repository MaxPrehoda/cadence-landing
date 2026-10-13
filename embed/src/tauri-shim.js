// Runs first in every app window (toolbar, panel, Talk). Each window is an
// <iframe> on the stage (../index.html); this gives it a __TAURI_INTERNALS__
// that forwards invokes and event subscriptions to the stage's fake backend
// (window.parent.__bridge), the way the real windows share the Rust side.
(() => {
  const host = window.parent;
  if (!host || host === window || !host.__bridge) return;
  const B = host.__bridge;
  const label = window.name;
  B.attach(label, window);
  const callbacks = new Map();
  let next = 1;
  const local = (v) => (v === undefined || v === null ? null : JSON.parse(JSON.stringify(v)));
  window.__TAURI_INTERNALS__ = {
    async invoke(cmd, args = {}) {
      if (cmd === "plugin:event|listen") {
        B.listen(label, args.event, args.handler, callbacks.get(args.handler));
        return args.handler;
      }
      if (cmd === "plugin:event|unlisten") {
        B.unlisten(label, args.event, args.eventId);
        return null;
      }
      const r = await B.invoke(label, cmd, local(args));
      return local(r);
    },
    transformCallback(cb) {
      const id = next++;
      callbacks.set(id, cb);
      return id;
    },
    unregisterCallback(id) { callbacks.delete(id); },
    metadata: { currentWindow: { label }, currentWebview: { label, windowLabel: label } },
    plugins: {},
    convertFileSrc: (p) => p,
  };
  window.__TAURI_EVENT_PLUGIN_INTERNALS__ = {
    unregisterListener(event, id) { B.unlisten(label, event, id); },
  };

  // In a browser every frame tracks the pointer, so the WebKit focus
  // workaround (hover only counts while the window is key) is not needed:
  // tell the app its window always has focus for hover purposes.
  const realHasFocus = Document.prototype.hasFocus;
  Document.prototype.hasFocus = function () { return true; };

  // Never take the keyboard from the page around the embed: an app window
  // may focus a field only while the visitor is actually using the embed.
  const realFocus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function (...a) {
    let engaged = false;
    try { engaged = realHasFocus.call(host.document) && B.engaged; } catch {}
    if (engaged) return realFocus.apply(this, a);
  };

  // A hidden window reports itself hidden, as a closed Tauri window does.
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (B.isShown(label) ? "visible" : "hidden") });
  Object.defineProperty(document, "hidden", { configurable: true, get: () => !B.isShown(label) });

  // Any touch of the window counts as using the embed.
  const touch = () => B.touched(label);
  window.addEventListener("pointerdown", touch, true);
  window.addEventListener("keydown", touch, true);
})();
