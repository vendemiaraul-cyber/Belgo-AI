'use strict';
/* Loader for the wasm32 port of linuxdoom-1.10 by Cornelius Diekmann
   (https://github.com/diekmann/wasm-fizzbuzz, DOOM source GPL, shareware doom1.wad inside doom.wasm).
   Adapted for Belgo: fitted canvas, pointer-based on-screen keys, no debug output. */
const memory = new WebAssembly.Memory({ initial: 108 });
const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
const msg = document.getElementById('msg');
const W = 640, H = 400;
const text = (off, len) => new TextDecoder('utf8').decode(new Uint8Array(memory.buffer, off, len));
const log = (off, len) => console.log(text(off, len));

const imports = {
  js: {
    js_console_log: log, js_stdout: log, js_stderr: log,
    js_milliseconds_since_start: () => performance.now(),
    js_draw_screen: ptr => ctx.putImageData(new ImageData(new Uint8ClampedArray(memory.buffer, ptr, W * H * 4), W, H), 0, 0),
  },
  env: { memory },
};

function doomKey(code) {
  switch (code) {
    case 8: return 127;
    case 17: return 0x80 + 0x1d;
    case 18: return 0x80 + 0x38;
    case 37: return 0xac;
    case 38: return 0xad;
    case 39: return 0xae;
    case 40: return 0xaf;
    default:
      if (code >= 65 && code <= 90) return code + 32;
      if (code >= 112 && code <= 123) return code + 75;
      return code;
  }
}

async function start() {
  const res = await fetch('doom.wasm');
  if (!res.ok) throw new Error('doom.wasm answered ' + res.status);
  const { instance } = await WebAssembly.instantiate(await res.arrayBuffer(), imports);
  const ex = instance.exports;
  ex.main();
  const down = k => ex.add_browser_event(0, k), up = k => ex.add_browser_event(1, k);

  addEventListener('keydown', e => { down(doomKey(e.keyCode)); e.preventDefault(); });
  addEventListener('keyup', e => { up(doomKey(e.keyCode)); e.preventDefault(); });
  document.querySelectorAll('button[data-k]').forEach(b => {
    const k = +b.dataset.k;
    const off = () => { if (b.classList.contains('on')) { b.classList.remove('on'); up(k); } };
    b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture?.(e.pointerId); b.classList.add('on'); down(k); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => b.addEventListener(ev, off));
    b.addEventListener('contextmenu', e => e.preventDefault());
  });
  canvas.addEventListener('pointerdown', () => canvas.focus());

  msg.hidden = true; msg.style.display = 'none';
  canvas.focus();
  const step = () => { ex.doom_loop_step(); requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
start().catch(e => { msg.textContent = 'DOOM could not start: ' + (e && e.message || e); });
