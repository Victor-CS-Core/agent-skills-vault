# Agent Skill Vault

A local-first personal library for storing, browsing, and searching your favorite AI agent skills. Designed for developers, makers, and tinkerers who need instant access, minimal friction, and a cyberpunk-inspired atmospheric UI.

## Features

- **Local-First & Fast:** Your skills are stored locally in the browser for instant access. Speed over everything!
- **Skill Imports:** Easily import skills from GitHub repositories or skills.sh.
- **Manual Skills:** Add your own custom skills manually using Markdown.
- **Cloud Sync:** Optional Supabase integration for syncing your vault across devices.
- **Developer-Focused UI:** Deep dark mode with vibrant neon accents (purple, cyan), monospace typography, and a distraction-free layout to keep you focused.
- **Markdown Rendering:** View skill bodies safely with sanitized Markdown rendering.

## Tech Stack

- **Framework:** React 18
- **Build Tool:** Vite
- **Language:** TypeScript
- **Styling:** Custom CSS (Neon/Cyberpunk aesthetic)
- **Backend/Sync:** Supabase (optional cloud sync)
- **Dependencies:** `marked` and `dompurify` for safe Markdown rendering.

## Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd agent-skills-vault
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and visit the local URL provided by Vite (usually `http://localhost:5173`).

## Available Scripts

- `npm run dev`: Starts the local development server.
- `npm run build`: Compiles TypeScript and builds the app for production.
- `npm run test`: Runs the test suite using Vitest.
- `npm run preview`: Previews the production build locally.
- `npm run deploy`: Builds the app and deploys it to GitHub Pages.

## Cloud Sync Setup (Optional)

If you want to sync your skills across devices, you can set up a Supabase project and connect it in the app:
1. Open the "Cloud Settings" modal in the app.
2. Enter your Supabase URL and Anon Key.
3. Use the Magic Link feature to authenticate and begin syncing!

## License

This project is licensed under the MIT License.
