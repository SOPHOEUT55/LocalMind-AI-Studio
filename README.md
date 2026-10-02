# LocalMind Studio — On-Device & Hybrid AI Workstation

LocalMind Studio is an air-gapped, on-device AI agent app designed for privacy, local neural computing, and hybrid model capabilities. It can run 100% offline within your browser using WebGPU and WebAssembly SIMD, and connects to high-capacity cloud models (Veo 3, Gemini 3.1 Flash Image, Gemini 3.5 Transcribe, and Lyria Music) when available.

---

## 🚀 Quickstart Guide

### Prerequisites
- **Node.js**: Version 18.0.0 or higher (Node 20+ recommended)
- **Package Manager**: `npm`, `pnpm`, or `bun`
- **Modern Browser**: Chrome, Edge, Brave, or Safari with WebGPU / WebAssembly support

### 1. Clone & Install Dependencies

```bash
git clone <your-repo-url>
cd localmind-studio

# Install dependencies
npm install
```

### 2. Configure Environment Variables

Copy the `.env.example` file to `.env`:

```bash
cp .env.example .env
```

Open `.env` and set your Google Gemini API key:

```env
GEMINI_API_KEY="your_actual_gemini_api_key_here"
PORT=3000
```

*(Note: When running in 100% offline / on-device mode, all local transformers, code sandboxes, and latent diffusion engines operate without needing an API key or internet connection).*

### 3. Start the Development Server

```bash
npm run dev
```

The application will start on:
👉 **`http://localhost:3000`**

### 4. Production Build

To build the client bundle for production:

```bash
npm run build
npm start
```

---

## 🌟 How to Use Each Feature

### 1. Autonomous Multi-Modal Agent (`Agent` Tab)
- **Model Selector**: In the top control bar, select your model architecture (`LocalMind Orchestrator 1.2B`, `NanoCoder Core 540M`, or `Neural Polymath 3.1B`).
- **Quantization Toggle**: Select your desired precision level:
  - `4-bit (Q4_K)`: Fastest inference (~74 tok/s, ~310 MB VRAM)
  - `8-bit (Q8_0)`: Balanced quality and memory (~48 tok/s, ~580 MB VRAM)
  - `FP16 (Half)`: Maximum fidelity (~24 tok/s, ~1.1 GB VRAM)
- Enter an end-to-end prompt (e.g. *"Build an arcade mini-game with code, art assets, and video teaser"*).
- Watch the agent decompose the prompt, stream reasoning tokens, and synthesize source code, image assets, and video clips into a single exportable project bundle.

### 2. Code Generation & Live Sandbox (`Code` Tab)
- Choose your target language: **HTML/JS**, **TypeScript/React**, **Python**, or **WGSL Shader**.
- Enter your prompt or click one of the suggested presets.
- Click **"Synthesize Code"** to watch token-by-token streaming with live throughput stats (`tok/s`).
- The right panel features a **Live Sandboxed Iframe Runner** that executes your HTML/Canvas/JS code in real-time with an interactive console log.
- Export source files with one click (`.html`, `.tsx`, `.py`, `.wgsl`).

### 3. Image Studio (`Images` Tab)
- **Dual Engines**:
  - **Gemini 3.1 Flash Image (`gemini-3.1-flash-image-preview`)**: High-definition image generation and prompt-based image editing.
  - **On-Device Diffusion (`MicroDiffusion-Turbo`)**: 100% offline multi-step latent diffusion with live visual canvas denoising.
- **Image Editing**: Click *"Upload to Edit"* to attach an existing image, enter text edit instructions (e.g. *"Add a glowing cyber visor"*), and generate updated versions.
- **Aspect Ratios**: `1:1`, `16:9`, `4:3`, `9:16`, and `3:4`.
- Click *"Send to Video"* to use any generated artwork as a video seed frame.

### 4. Veo 3 Video Studio (`Veo 3 Video` Tab)
- **Veo 3 Fast (`veo-3.1-fast-generate-preview`)**: Generates high-definition cinematic video clips.
- **Aspect Ratio**: Choose between `16:9` (Landscape) or `9:16` (Portrait).
- **Local Engine (`ChronosTemporal-Lite`)**: Generates on-device temporal motion loops with timeline scrubbing.
- Click *"Save MP4"* to download the generated video.

### 5. Audio Transcription Studio (`Transcribe` Tab)
- **Microphone**: Click the microphone button to record your voice in real time with an active duration timer.
- **File Upload**: Upload pre-recorded audio files (`.wav`, `.mp3`, `.webm`, `.m4a`).
- Click **"Transcribe Spoken Audio"** to run verbatim speech-to-text using `gemini-3.5-transcribe`.
- Copy or export the transcription text as `.txt`.

### 6. Lyria Music Studio (`Lyria Music` Tab)
- **Model Tiers**:
  - `lyria-3-clip-preview`: Short clips up to 30 seconds.
  - `lyria-3-pro-preview`: Full-length musical compositions.
- Enter a prompt describing genre, instruments, and mood.
- Optionally attach an artwork image to inspire the melody.
- Play back the track in the interactive waveform player and read the generated lyrics.
- Download the generated `.wav` audio file.

### 7. Hardware Diagnostics & Privacy Vault (`Hardware` Tab)
- Inspect WebGPU shader support, CPU logical cores, estimated RAM, and local IndexedDB quota.
- Verify air-gapped network isolation status (verifying 0 outbound packets).
- Purge local storage cache with one click.

### 8. PWA Offline Installation
- Click **"Install App"** in the top navigation bar to install LocalMind Studio directly to your Desktop (Chrome/Edge), Android, or iOS Home Screen.
- Once installed, the application functions offline without needing an active internet connection.

---

## 🔒 Privacy & Architecture

- **Air-Gapped Local Pipeline**: On-device code transformers, latent diffusion, and temporal motion engines run entirely on client hardware via WebGPU / WebAssembly SIMD. No prompt data leaves your machine in offline mode.
- **Secure Server Proxy**: For cloud models (Veo 3, Lyria, Gemini Flash Image, and Transcribe), API keys are strictly maintained on the server backend (`server.ts`) and never exposed to client browsers.
