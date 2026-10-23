# ProcureRescue AI — MVP

A hackathon MVP for recovering from supplier delays and material shortages. It combines TinyFish live-web search with a transparent, deterministic comparison workflow. It does **not** place orders or claim that supplier stock, price, or delivery is confirmed unless the source says so.

## Features
- Procurement disruption input form with a ready-made demo scenario.
- TinyFish Search integration (server-side API key).
- Fallback demo dataset when no API key is configured or live search fails.
- Supplier candidate cards with source links and explicit unverified states.
- Hard-constraint checks and transparent ranking.
- Recovery recommendation and RFQ draft.

## Requirements
- Node.js 18+
- TinyFish API key (optional for demo mode; get one at https://agent.tinyfish.ai/)

## Run locally
Open two terminals.

### Backend
```bash
cd server
cp .env.example .env
# Add TINYFISH_API_KEY to .env to enable live search. Leave blank for demo mode.
npm install
npm run dev
```
Backend: http://localhost:4000

### Frontend
```bash
cd client
npm install
npm run dev
```
Open the Vite URL printed in the terminal (usually http://localhost:5173).

## TinyFish integration
The backend calls TinyFish Search using `GET https://api.search.tinyfish.ai?query=<encoded query>` with the `X-API-Key` header.

The MVP intentionally starts with Search, the lightest live-web primitive. For the final hackathon demo, optionally add TinyFish Fetch/Agent to inspect shortlisted pages more deeply. Live search snippets are not treated as proof of stock, price, or delivery commitments.

## Demo flow
1. Click **Load demo scenario**.
2. Click **Find recovery options**.
3. Show live supplier research (if API key is configured) or the labelled demo results.
4. Point out that unknown price/lead-time fields stay unknown.
5. Show the backup plan and RFQ draft.

## Important
- The demo dataset is illustrative and clearly labelled as demo data.
- Verify the current TinyFish API documentation and API-key access before the event.
- Do not commit `.env`; never expose the API key in frontend code.
