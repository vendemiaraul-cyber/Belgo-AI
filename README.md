# Belgo AI

A chat companion who lives on the chat bar.

- **Brain:** Belgo's own server code (`functions/api/chat.js`) runs gpt-oss on Cloudflare Workers AI, with the free Pollinations text service as a backup. GitHub Models and an on-device model (wllama) are optional in settings.
- **Pictures:** Belgo's own server code (`functions/api/image.js`) paints with FLUX on Cloudflare Workers AI, with Z-Image-Turbo and FLUX.2 klein on public Hugging Face Spaces as backups.

## Cloudflare

This is a Cloudflare Pages project. `wrangler.toml` connects Workers AI to the site as the binding `AI`. If the header never shows "Own AI", add it by hand: Pages project, Settings, Bindings, Add, Workers AI, variable name `AI`, then redeploy.

The `_headers` file turns on cross-origin isolation, which lets the optional on-device brain use several processor cores.

## Credits

Inspired by Capri. Own AI on [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/) with gpt-oss (OpenAI) and FLUX (Black Forest Labs). Backups by [Pollinations](https://pollinations.ai), [Z-Image-Turbo](https://huggingface.co/spaces/Tongyi-MAI/Z-Image-Turbo) and [FLUX.2 klein](https://huggingface.co/spaces/black-forest-labs/FLUX.2-klein-4B). Optional brains by [GitHub Models](https://github.com/marketplace/models) and [wllama](https://github.com/ngxson/wllama).
