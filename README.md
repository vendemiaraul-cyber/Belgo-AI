# Belgo AI

A chat companion who lives on the chat bar.

- **Brain:** Belgo's own server code (`functions/api/chat.js`) runs gpt-oss on Cloudflare Workers AI, with the free Pollinations text service as a backup. GitHub Models and an on-device model (wllama) are optional in settings.
- **Text:** if the secret `CEREBRAS_API_KEY` is set on the Pages project, answers come from Cerebras (Qwen 3.8 27B, then gpt-oss-120b) before Cloudflare Workers AI.
- **Games:** write "run DOOM" or "play Quake II". DOOM (shareware) is in `games/doom`; Quake II opens the Qwasm2 site inside the chat.
- **Apps:** ask Belgo to build a game, tool or web page and it runs in a live preview inside the chat, in a locked-down frame. Building requests go to a coding model: Kimi K2.7 Code on a Workers Paid plan, otherwise Qwen 3.8 27B, then GLM-4.7 Flash, then gpt-oss.
- **Pictures:** Belgo's own server code (`functions/api/image.js`) paints with FLUX on Cloudflare Workers AI, with Z-Image-Turbo and FLUX.2 klein on public Hugging Face Spaces as backups.

## Cloudflare

This is a Cloudflare Pages project. `wrangler.toml` connects Workers AI to the site as the binding `AI`. If the header never shows "Own AI", add it by hand: Pages project, Settings, Bindings, Add, Workers AI, variable name `AI`, then redeploy.

## Credits

DOOM: id Software (GPL source, shareware data), wasm port by [Cornelius Diekmann](https://github.com/diekmann/wasm-fizzbuzz). Quake II: [Qwasm2](https://github.com/GMH-Code/Quake2-WASM) by GMH-Code. Text by [Cerebras](https://cloud.cerebras.ai).

Inspired by Capri. Own AI on [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/) with gpt-oss (OpenAI) and FLUX (Black Forest Labs). Backups by [Pollinations](https://pollinations.ai), [Z-Image-Turbo](https://huggingface.co/spaces/Tongyi-MAI/Z-Image-Turbo) and [FLUX.2 klein](https://huggingface.co/spaces/black-forest-labs/FLUX.2-klein-4B). Optional brains by [GitHub Models](https://github.com/marketplace/models) and [wllama](https://github.com/ngxson/wllama).
