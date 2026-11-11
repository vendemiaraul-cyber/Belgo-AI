# Belgo AI

A chat companion who lives on the chat bar. His brain runs in the browser with WebLLM (or through an API key), and he has his own v86 computer that boots a disc image.

## Deploy on Cloudflare Pages

1. Cloudflare dashboard > Workers & Pages > Create > Pages > Connect to Git, and pick this repository.
2. Framework preset: None. Build command: leave empty. Build output directory: `/`.
3. Deploy, then open the `pages.dev` link.

## Built-in disc

Add a disc image to the repository root named `disc.iso` (or `disc.img`). It appears as "Start built-in disc" in Belgo's computer panel. Cloudflare Pages accepts files up to 25 MiB each.

## Credits

Inspired by Capri. On-device answers by [WebLLM](https://webllm.mlc.ai). Emulator by [v86](https://github.com/copy/v86).
