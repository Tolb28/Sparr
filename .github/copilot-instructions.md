# Project Guidelines

## Project Purpose
Sparr is a boxing app combining training tracking with social features, targeting both total beginners and experienced boxers. Core goals:
- **Training**: Track workouts, sessions, progress, streaks, and skill development over time.
- **Discovery**: Help users find training partners, coaches, and gyms.
- **Social**: Share progress and highlights, post advice, ask questions, and interact with the broader boxing community.

## Build and Test
- Root install: `npm install`
- Backend install: `cd backend && npm install`
- Backend dev: `cd backend && npm run dev` (uses `ts-node-dev` with auto-restart)
- Backend build/start: `cd backend && npm run build && npm run start`
- Backend type-check (no emit): `cd backend && npx tsc --noEmit`
- Frontend install: `cd frontend && npm install`
- Frontend run: `cd frontend && npm run start` (or `npm run android`, `npm run ios`, `npm run web`)
- No automated test suites or linting scripts exist yet.

## Tech Stack
- **Backend**: Express 5, TypeScript (strict), PostgreSQL (hosted on Supabase, accessed via the `pg` driver — not the Supabase JS client), JWT auth, Multer + Cloudinary for uploads.
- **Frontend**: Expo 54 / React Native 0.81, React 19, React Navigation 7 (native stack + bottom tabs), Gluestack UI 3 + NativeWind (Tailwind classes on RN), Legend Motion for animations. Icons from `@expo/vector-icons` (Ionicons) and `lucide-react-native`. Fonts: Barlow and Barlow Condensed via `@expo-google-fonts`.

## Architecture
- Monorepo: `backend/` (Express API) and `frontend/` (Expo React Native).
- **All** backend routes are nested under `/api/auth/` — including training, chat, clubs, and gamification. Sub-routers are mounted inside `backend/src/routes/auth.ts`. Example: `/api/auth/training/...`, `/api/auth/chat/...`.
- Backend flow: route → controller → service → `pool.query()` (SQL via `pg`). Controllers handle HTTP; services own business logic and SQL.
- Frontend flow: API wrapper modules (`frontend/src/api/*`) consumed by screens/components that own state transitions and optimistic UI.
- Navigation: `AppNavigator` (native stack) wraps `BottomTabNavigator`; conditional rendering based on stored token. Bottom tabs: Calendar, Techniques, Profile, Discovery, Friends.
- `RootStackParamList` in `frontend/src/navigation/AppNavigator.tsx` is the single type registry for all stack screen names and params. Add new screens there before registering them in the navigator.

## TypeScript Strictness (Backend)
`backend/tsconfig.json` enables `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` on top of `strict`:
- Array/object index access returns `T | undefined` — always guard before use.
- Optional properties (`x?: T`) cannot be assigned `undefined` explicitly; omit the key instead.

## Code Style
- Match the style already used in the touched file; keep edits surgical and avoid broad refactors.
- Backend auth context uses `req.userId` / `req.profileId` via `@ts-ignore` casts — follow that pattern rather than extending the Request type.
- Frontend uses mixed typing (`any` is common in screens/API responses); prefer local adapters over sweeping type rewrites.
- Styling is a hybrid of gluestack primitives + Tailwind class names + inline style objects. Use `frontend/src/theme/colors.ts` (import from `@/src/theme/colors`) as the canonical color reference — do not hardcode hex values.
- Gluestack UI primitives live in `frontend/components/ui/` (auto-generated); custom components in `frontend/src/components/`.
- Import patterns are mixed (`@/...` aliases and relative imports); keep the local file's existing style. The `@/*` alias maps to the frontend project root, so `@/src/theme/colors` resolves to `frontend/src/theme/colors.ts` and `@/components/ui/avatar` resolves to `frontend/components/ui/avatar`.

## Key Conventions
- Auth uses `Authorization: Bearer <token>`; middleware injects `req.userId` and optionally `req.profileId` (from `x-profile-id` header for multi-profile users). Controllers depend on both.
- Frontend API calls use `buildAuthHeaders()` from `frontend/src/api/profile.ts` to bundle JWT + active profile context. Other API modules replicate this pattern — do not add new auth header construction logic.
- `ServerIP` from `frontend/src/api/tokenHandler.ts` is the canonical base URL for API calls; it reads `EXPO_PUBLIC_API_URL` first, then falls back to platform-specific hardcoded addresses. `profileHandler.ts` duplicates this constant with a different IP — do not use it for new API calls.
- Token/profile persistence: native uses `expo-secure-store`, web uses `localStorage` (`tokenHandler.ts`, `profileHandler.ts`).
- File uploads follow multer + FormData conventions; do not set `Content-Type` manually for multipart requests.
- Calendar/training logic is local-date-oriented; avoid timezone behavior changes without validating weekly/date mapping logic.
- Data-heavy screens often use both `useEffect` and `useFocusEffect` for refresh behavior.
- Keep backend response shapes stable — frontend API wrappers and screens depend on endpoint-specific formats.

## Database
- PostgreSQL via `DATABASE_URL`, configured in `backend/src/config/db.ts` (exports `pool`).
- The root-level `DATABASE_SCHEMA.sql` is the authoritative full schema reference — consult it before writing queries.
- Migrations live in `backend/sql/migrations/` as plain `.sql` files named `YYYY-MM-DD_HHMM_<description>.sql`; apply manually.
- Keep SQL parameterized (`$1`, `$2`, etc.); never use string-interpolated query values.

## Security
- Required env vars: `DATABASE_URL`, `JWT_SECRET`, `CLOUDINARY_*` credentials, `EXPO_PUBLIC_API_URL`.
- Do not rely on the JWT fallback secret (`dev_secret`) outside local development.
- Avoid logging tokens, auth headers, or sensitive profile/media payloads.
