# Belgo AI

A chat companion who lives on the chat bar.

- **Brain:** Belgo's own server code (`functions/api/chat.js`) runs gpt-oss on Cloudflare Workers AI, with the free Pollinations text service as a backup. GitHub Models and an on-device model (wllama) are optional in settings.
- **Text:** if the secret `CEREBRAS_API_KEY` is set on the Pages project, answers come from Cerebras (gpt-oss-120b for chat, Qwen 3.8 27B for building apps) before Cloudflare Workers AI.
- **Games:** write "run DOOM" or "play Quake II". DOOM (shareware) is in `games/doom`; Quake II opens the Qwasm2 site in its own tab, because it stays black inside a frame. DOOM runs inside the chat bar.
- **Photos:** the camera button attaches a photo and Belgo describes it with a vision model on Workers AI (Qwen 3.8 27B, then Gemma 4).
- **Find images:** "find images of …" searches Wikimedia Commons, then Openverse, and shows the results with their sources.
- **Coding languages:** "open Python" (or the code button) puts Belgo in one of 32 languages; requests then go to the coding model and code blocks get a copy button.
- **Apps:** ask Belgo to build a game, tool or web page and it runs in a live preview inside the chat, in a locked-down frame. Building requests go to a coding model: Kimi K2.7 Code on a Workers Paid plan, otherwise gpt-oss-120b, then GLM-4.7 Flash, then Qwen 3.8 27B. Settings has a picker to force one.
- **More free coding models:** add any of the secrets `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY` or `NVIDIA_API_KEY` and building requests use that provider first, choosing a coding model from its live model list.
- **Pictures:** Belgo's own server code (`functions/api/image.js`) paints with FLUX on Cloudflare Workers AI, with Z-Image-Turbo and FLUX.2 klein on public Hugging Face Spaces as backups.

## Website

`index.html` is the front page ("Presenting Belgo"), with what he does and YouTube videos by other people showing the models he uses. `chat.html` is the chat itself, at `/chat`; the home screen shortcut opens it.

## Icons

`icons/face.svg` is the browser tab icon. `icons/app-*.png` are the home screen shortcut icons, used through `manifest.webmanifest` and the apple-touch-icon link.

## Cloudflare

This is a Cloudflare Pages project. `wrangler.toml` connects Workers AI to the site as the binding `AI`. If the header never shows "Own AI", add it by hand: Pages project, Settings, Bindings, Add, Workers AI, variable name `AI`, then redeploy.

## Credits

DOOM: id Software (GPL source, shareware data), wasm port by [Cornelius Diekmann](https://github.com/diekmann/wasm-fizzbuzz). Quake II: [Qwasm2](https://github.com/GMH-Code/Quake2-WASM) by GMH-Code. Text by [Cerebras](https://cloud.cerebras.ai).

Inspired by Capri. Own AI on [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/) with gpt-oss (OpenAI) and FLUX (Black Forest Labs). Backups by [Pollinations](https://pollinations.ai), [Z-Image-Turbo](https://huggingface.co/spaces/Tongyi-MAI/Z-Image-Turbo) and [FLUX.2 klein](https://huggingface.co/spaces/black-forest-labs/FLUX.2-klein-4B). Optional brains by [GitHub Models](https://github.com/marketplace/models) and [wllama](https://github.com/ngxson/wllama).
