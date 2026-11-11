# Belgo AI

A chat companion who lives on the chat bar. His brain runs on your own device with wllama (llama.cpp in WebAssembly), so it needs no key and no graphics card. He can paint pictures, and he has his own v86 computer that boots a disc image.

## Built-in disc

Add a disc image to the repository root named `disc.iso` (or `disc.img`). It appears as "Start built-in disc" in Belgo's computer panel.

## Speed

The `_headers` file turns on cross-origin isolation on Cloudflare Pages, which lets the brain use several processor cores in Chrome, Edge and Firefox. Without it Belgo still works, on one core.

## Credits

Inspired by Capri. On-device answers by [wllama](https://github.com/ngxson/wllama). Emulator by [v86](https://github.com/copy/v86). Pictures by [Pollinations](https://pollinations.ai).
