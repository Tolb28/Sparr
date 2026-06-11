# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sparr is a boxing training social platform — a monorepo with a Node.js/Express TypeScript backend and a React Native (Expo) frontend. Features include user profiles, social feed, training tracking, club management, chat, and gamification.

## Commands

### Backend (`backend/`)

```bash
npm run dev          # Start dev server with hot-reload (ts-node-dev)
npm run build        # Compile TypeScript to dist/
npm run start        # Run compiled output
```

### Frontend (`frontend/`)

```bash
npx expo start       # Start Expo dev server (scan QR or press a/i/w)
npx expo start --android
npx expo start --ios
npx expo start --web
```

There are no test commands currently configured.

## Architecture

### Backend

- **Framework**: Express 5 + TypeScript (ES2020, strict mode)
- **Database**: PostgreSQL via `pg` driver with connection pooling — see `backend/src/config/` for setup
- **Auth**: JWT tokens, validated by `backend/src/middleware/auth.ts`
- **File uploads**: Multer → Cloudinary (permanent storage)
- **Cache**: Redis via `backend/src/services/cacheService.ts`
- **Real-time**: Supabase JS client for real-time features
- **Layer structure**: `routes/ → controllers/ → services/` — keep business logic in services, not controllers

Key services: `clubsService.ts` (largest, ~40KB), `gamificationService.ts`, `chatService.ts`, `trainingService.ts`.

Gamification metrics live in `backend/src/metrics/` (badge logic, intensity score, streak days, skill level, etc.).

### Frontend

- **Framework**: React Native 0.81.5 + React 19 via Expo SDK
- **Navigation**: React Navigation — Stack Navigator wrapping a Bottom Tab Navigator. All route types defined in `src/navigation/AppNavigator.tsx` (`RootStackParamList`)
- **Styling**: NativeWind 4 (Tailwind for RN) + CSS variables for dynamic theming. Config in `frontend/tailwind.config.js`. Use Tailwind classes via `className` prop
- **UI components**: Gluestack UI 3 (`frontend/components/ui/`) — prefer these over raw RN primitives
- **Animations**: Legend Motion (`@legendapp/motion`) for complex animations; React Native Reanimated for lower-level work
- **Icons**: Lucide React Native + Expo Vector Icons
- **State**: React Context (`src/context/ProgressContext.tsx`) for badges/progress metrics — no Redux/Zustand
- **Auth storage**: Expo SecureStore for JWT tokens
- **API layer**: `src/api/` — one module per domain (e.g., `chatApi.ts`, `friends.ts`), all use a shared fetch wrapper with token injection

### Database

See `DATABASE_SCHEMA.sql` for the full PostgreSQL schema. Key tables: `users`, `profiles`, `posts`, `training_sessions`, `clubs`, `conversations`, `messages`, `badges`, `drills`, `techniques`, `combinations`, `challenges`.

Conversations support both 1-on-1 and group chats. Messages track edits and attachments.

## Key Conventions

- Backend env vars (DB URL, JWT secret, Cloudinary, Supabase) come from `.env` (git-ignored) — copy from team
- NativeWind CSS variables (`--color-primary`, `--color-secondary`, etc.) drive the entire color theme — don't hardcode colors
- `frontend/components/ui/glass-card.tsx` is the primary card component used throughout the app
