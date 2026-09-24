import { MoonStars, Sun } from "@phosphor-icons/react/ssr";

/**
 * The Essentials template ships no framework JavaScript on the hotel's home page (see
 * src/lib/server/lite.ts). What little it needs runs from this one inline script, well under a
 * kilobyte: the light/dark switch (same storage and rules as the React toggle) and attaching the
 * hotel's font stylesheets after first paint so they can never hold the page.
 */
export const LITE_SCRIPT = `(function(){var d=document,r=d.documentElement;function sys(){return matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}d.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-lite-theme]');if(!b)return;var n=r.dataset.theme==='dark'?'light':'dark';r.dataset.theme=n;try{n===sys()?localStorage.removeItem('theme'):localStorage.setItem('theme',n)}catch(x){}});function f(){d.querySelectorAll('[data-lite-fonts]').forEach(function(el){(el.getAttribute('data-lite-fonts')||'').split('\\n').forEach(function(h){if(!h||d.querySelector('link[href="'+h+'"]'))return;var l=d.createElement('link');l.rel='stylesheet';l.href=h;d.head.appendChild(l)})})}d.readyState==='loading'?d.addEventListener('DOMContentLoaded',f):f()})();`;

export function LiteScript() {
  return <script data-lite-keep="" dangerouslySetInnerHTML={{ __html: LITE_SCRIPT }} />;
}

/** A light/dark switch that works without React: the inline script above handles the click. */
export function LiteThemeToggle() {
  return (
    <button type="button" data-lite-theme="" className="lite-icon-btn" aria-label="Switch between light and dark" title="Light or dark">
      <MoonStars size={18} weight="light" className="lite-moon" aria-hidden />
      <Sun size={18} weight="light" className="lite-sun" aria-hidden />
    </button>
  );
}
