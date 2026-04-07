# MovieSphere

MovieSphere is a movie recommendation mini-project built around the full HCI cycle: user research, requirements, wireframing, prototyping, usability testing, and iteration.


## Features
- Preference-based recommendations using mood, genre, and era
- Seed-based recommendations from a movie you already like
- Live movie content from TMDB
- Responsive cinematic UI
- HCI documentation included in `docs/hci`

## Setup
1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file using `.env.example`:

```bash
VITE_TMDB_API_KEY=your_tmdb_api_key_here
```

3. Start the app:

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Vercel Deployment

For Vercel, do not rely on the local `.env` file. Add one of these environment variables in your Vercel project settings and redeploy:

```bash
TMDB_READ_ACCESS_TOKEN=your_tmdb_read_access_token
```

or

```bash
TMDB_API_KEY=your_tmdb_api_key
```

The app is configured to use the server-side `/api/tmdb` proxy on Vercel, so TMDB credentials do not need to be exposed in the browser.

