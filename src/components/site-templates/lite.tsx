import { MoonStars, Sun } from "@phosphor-icons/react/ssr";

/**
 * The Essentials template ships no framework JavaScript on the hotel's home page (see
 * src/lib/server/lite.ts). What little it needs runs from this one inline script, well under a
 * kilobyte and a half: the light/dark switch (same storage and rules as the React toggle), attaching the
 * hotel's font stylesheets after first paint so they can never hold the page, and Escape and the arrow
 * keys for a room page's photographs (which open and move with plain `#photo-n` links).
 */
export const LITE_SCRIPT = `(function(){var d=document,r=d.documentElement;function sys(){return matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}d.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-lite-theme]');if(!b)return;var n=r.dataset.theme==='dark'?'light':'dark';r.dataset.theme=n;try{n===sys()?localStorage.removeItem('theme'):localStorage.setItem('theme',n)}catch(x){}});function f(){d.querySelectorAll('[data-lite-fonts]').forEach(function(el){(el.getAttribute('data-lite-fonts')||'').split('\\n').forEach(function(h){if(!h||d.querySelector('link[href="'+h+'"]'))return;var l=d.createElement('link');l.rel='stylesheet';l.href=h;d.head.appendChild(l)})})}d.readyState==='loading'?d.addEventListener('DOMContentLoaded',f):f();function lb(){var h=location.hash;return h.indexOf('#photo-')===0&&d.getElementById(h.slice(1))}d.addEventListener('keydown',function(e){var t=lb(),k=e.key==='Escape'?'close':e.key==='ArrowRight'?'next':e.key==='ArrowLeft'?'prev':'';if(!t||!k)return;var a=t.querySelector('[data-lb-'+k+']');if(a){e.preventDefault();a.click()}});addEventListener('hashchange',function(){var t=lb();if(t){var c=t.querySelector('[data-lb-close]');c&&c.focus({preventScroll:true})}})})();`;

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
