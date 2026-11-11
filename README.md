# Belgo AI

A chat companion who lives on the chat bar.

- **Brain:** GitHub Models with a free GitHub token, or an on-device model through wllama (llama.cpp in WebAssembly).
- **Pictures:** painted without a key by Z-Image-Turbo, with FLUX.2 klein as the backup, on public Hugging Face Spaces.

## Speed

The `_headers` file turns on cross-origin isolation on Cloudflare Pages, which lets the on-device brain use several processor cores in Chrome, Edge and Firefox. Without it Belgo still works, on one core.

## Credits

Inspired by Capri. Online answers by [GitHub Models](https://github.com/marketplace/models). On-device answers by [wllama](https://github.com/ngxson/wllama). Pictures by [Z-Image-Turbo](https://huggingface.co/spaces/Tongyi-MAI/Z-Image-Turbo) and [FLUX.2 klein](https://huggingface.co/spaces/black-forest-labs/FLUX.2-klein-4B).
