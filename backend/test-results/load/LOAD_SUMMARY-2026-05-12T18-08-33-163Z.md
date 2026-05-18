# API Load Test Summary

- **Generated**: 2026-05-12T18:08:33.163Z
- **Endpoint coverage**: 118 endpoints
- **Overall status**: PASSED
- **Allowed max error rate**: 1%
- **Auth execution mode**: fallback-unauthenticated
- **Auth bootstrap note**: Unable to obtain token for load_test_user_1@sparr.test: login_status=400, register_status=400, login_error={"error":"Invalid credentials","code":"INVALID_CREDENTIALS"}, register_error={"error":"fetch failed","code":"REGISTER_FAILED"}
- **Important**: Authenticated business-flow reliability was not fully validated in this run; endpoints were still load-probed for transport/server robustness.

## Profile summary

| Profile | Requests | Error rate % | p95 ms | p99 ms | Pass |
|---|---:|---:|---:|---:|---|
| baseline | 590 | 0 | 67.1 | 225.56 | YES |
| spike | 2360 | 0 | 161.38 | 772.84 | YES |
| stress | 5900 | 0 | 326.15 | 1420.25 | YES |

## Endpoint summary (worst profile per endpoint)

| Endpoint | Domain | Auth | Worst profile | Requests | Error rate % | p95 ms | p99 ms | Pass |
|---|---|---|---|---:|---:|---:|---:|---|
| `GET /` | root | no | stress | 50 | 0 | 26.45 | 26.52 | YES |
| `GET /api/auth/clubs/` | clubs | yes | stress | 50 | 0 | 27.57 | 27.66 | YES |
| `POST /api/auth/clubs/` | clubs | yes | stress | 50 | 0 | 19.96 | 20.43 | YES |
| `GET /api/auth/clubs/:clubId` | clubs | yes | stress | 50 | 0 | 10.66 | 10.99 | YES |
| `PATCH /api/auth/clubs/:clubId` | clubs | yes | stress | 50 | 0 | 19.79 | 20.44 | YES |
| `POST /api/auth/clubs/:clubId/avatar` | clubs | yes | stress | 50 | 0 | 17.93 | 18.9 | YES |
| `GET /api/auth/clubs/:clubId/calendar/selected` | clubs | yes | stress | 50 | 0 | 16.92 | 17.42 | YES |
| `POST /api/auth/clubs/:clubId/calendars/:calendarId/select` | clubs | yes | stress | 50 | 0 | 26.49 | 26.76 | YES |
| `POST /api/auth/clubs/:clubId/cover` | clubs | yes | stress | 50 | 0 | 16.84 | 17.34 | YES |
| `POST /api/auth/clubs/:clubId/join` | clubs | yes | stress | 50 | 0 | 20.89 | 21.19 | YES |
| `GET /api/auth/clubs/:clubId/join-requests` | clubs | yes | stress | 50 | 0 | 10.86 | 11.42 | YES |
| `POST /api/auth/clubs/:clubId/join-requests` | clubs | yes | stress | 50 | 0 | 19.1 | 19.49 | YES |
| `PATCH /api/auth/clubs/:clubId/join-requests/:requestId` | clubs | yes | stress | 50 | 0 | 14.83 | 15.24 | YES |
| `DELETE /api/auth/clubs/:clubId/leave` | clubs | yes | stress | 50 | 0 | 9.75 | 10.07 | YES |
| `GET /api/auth/clubs/:clubId/members` | clubs | yes | stress | 50 | 0 | 20.11 | 20.58 | YES |
| `DELETE /api/auth/clubs/:clubId/members/:profileId` | clubs | yes | stress | 50 | 0 | 15.37 | 15.69 | YES |
| `PATCH /api/auth/clubs/:clubId/members/:profileId` | clubs | yes | stress | 50 | 0 | 24.06 | 24.74 | YES |
| `GET /api/auth/clubs/:clubId/posts` | clubs | yes | stress | 50 | 0 | 17.18 | 17.23 | YES |
| `POST /api/auth/clubs/:clubId/posts` | clubs | yes | stress | 50 | 0 | 14.5 | 14.79 | YES |
| `GET /api/auth/clubs/:clubId/training-plans` | clubs | yes | stress | 50 | 0 | 9.58 | 10.14 | YES |
| `POST /api/auth/clubs/:clubId/training-plans` | clubs | yes | stress | 50 | 0 | 18.41 | 22.05 | YES |
| `POST /api/auth/clubs/:clubId/training-plans/:planId/copy` | clubs | yes | stress | 50 | 0 | 19.46 | 20.15 | YES |
| `POST /api/auth/clubs/:clubId/training-plans/full` | clubs | yes | stress | 50 | 0 | 23.7 | 23.86 | YES |
| `GET /api/auth/clubs/:clubId/trainings` | clubs | yes | stress | 50 | 0 | 15.82 | 16.39 | YES |
| `POST /api/auth/clubs/:clubId/trainings` | clubs | yes | stress | 50 | 0 | 17.58 | 18.08 | YES |
| `POST /api/auth/clubs/:clubId/trainings/:trainingId/add-to-calendar` | clubs | yes | stress | 50 | 0 | 17.5 | 18.13 | YES |
| `GET /api/auth/clubs/memberships/me` | clubs | yes | stress | 50 | 0 | 11.95 | 12.25 | YES |
| `POST /api/auth/comments` | auth | yes | stress | 50 | 0 | 14 | 15 | YES |
| `GET /api/auth/discovery` | auth | yes | stress | 50 | 0 | 16.32 | 16.49 | YES |
| `GET /api/auth/discovery/:postId/comments` | auth | yes | stress | 50 | 0 | 11.97 | 12.4 | YES |
| `GET /api/auth/discovery/boxers` | auth | yes | stress | 50 | 0 | 13.14 | 13.59 | YES |
| `GET /api/auth/discovery/recommendations` | auth | yes | stress | 50 | 0 | 10.25 | 10.68 | YES |
| `GET /api/auth/friends` | auth | yes | stress | 50 | 0 | 11.05 | 11.56 | YES |
| `DELETE /api/auth/friends/:targetProfileId` | auth | yes | stress | 50 | 0 | 11.2 | 11.62 | YES |
| `POST /api/auth/friends/request/:targetProfileId` | auth | yes | stress | 50 | 0 | 18.24 | 18.83 | YES |
| `PUT /api/auth/friends/requests/:friendRequestId/accept` | auth | yes | stress | 50 | 0 | 21.77 | 22.71 | YES |
| `DELETE /api/auth/friends/requests/:friendRequestId/decline` | auth | yes | stress | 50 | 0 | 13.38 | 13.89 | YES |
| `GET /api/auth/friends/requests/pending` | auth | yes | stress | 50 | 0 | 13.44 | 13.94 | YES |
| `GET /api/auth/friends/status/:targetProfileId` | auth | yes | stress | 50 | 0 | 14.29 | 18.11 | YES |
| `GET /api/auth/gamification/badges/catalog` | gamification | yes | stress | 50 | 0 | 15.44 | 15.78 | YES |
| `POST /api/auth/gamification/complete` | gamification | yes | stress | 50 | 0 | 20.34 | 20.73 | YES |
| `GET /api/auth/gamification/challenges` | gamification | yes | stress | 50 | 0 | 10.3 | 10.56 | YES |
| `GET /api/auth/gamification/challenges/:challengeId` | gamification | yes | stress | 50 | 0 | 13.95 | 14.55 | YES |
| `POST /api/auth/gamification/challenges/:challengeId/complete` | gamification | yes | stress | 50 | 0 | 16.4 | 16.79 | YES |
| `POST /api/auth/gamification/challenges/:challengeId/progress` | gamification | yes | stress | 50 | 0 | 19.27 | 19.86 | YES |
| `POST /api/auth/gamification/challenges/:challengeId/start` | gamification | yes | stress | 50 | 0 | 19.96 | 20.56 | YES |
| `GET /api/auth/gamification/profiles/:profileId/badges` | gamification | yes | stress | 50 | 0 | 10.79 | 11.44 | YES |
| `GET /api/auth/gamification/profiles/:profileId/progress` | gamification | yes | stress | 50 | 0 | 10.9 | 11.34 | YES |
| `POST /api/auth/gamification/recalculate/:profileId` | gamification | yes | stress | 50 | 0 | 19.13 | 19.71 | YES |
| `POST /api/auth/google/conflict-decision` | auth | yes | stress | 50 | 0 | 20.59 | 21.15 | YES |
| `POST /api/auth/google/login` | auth | no | stress | 50 | 0 | 1225.88 | 1233.12 | YES |
| `GET /api/auth/chat/conversations` | chat | yes | stress | 50 | 0 | 10.5 | 10.9 | YES |
| `POST /api/auth/chat/conversations` | chat | yes | stress | 50 | 0 | 20.31 | 20.44 | YES |
| `DELETE /api/auth/chat/conversations/:conversationId` | chat | yes | stress | 50 | 0 | 11.33 | 12.07 | YES |
| `PUT /api/auth/chat/conversations/:conversationId/last-read` | chat | yes | stress | 50 | 0 | 17.96 | 18.52 | YES |
| `POST /api/auth/chat/conversations/:conversationId/members` | chat | yes | stress | 50 | 0 | 22.1 | 26.11 | YES |
| `GET /api/auth/chat/conversations/:conversationId/messages` | chat | yes | stress | 50 | 0 | 10 | 10.38 | YES |
| `GET /api/auth/chat/conversations/:conversationId/participants` | chat | yes | stress | 50 | 0 | 10.51 | 10.9 | YES |
| `PATCH /api/auth/chat/conversations/:conversationId/rename` | chat | yes | stress | 50 | 0 | 19.19 | 19.74 | YES |
| `POST /api/auth/chat/message` | chat | yes | stress | 50 | 0 | 21.26 | 22.23 | YES |
| `POST /api/auth/interactions` | auth | yes | stress | 50 | 0 | 20 | 20.4 | YES |
| `POST /api/auth/login` | auth | no | stress | 50 | 0 | 1417.25 | 1420.25 | YES |
| `POST /api/auth/posts` | auth | yes | stress | 50 | 0 | 17.71 | 18.06 | YES |
| `DELETE /api/auth/profile` | auth | yes | stress | 50 | 0 | 6.75 | 7.04 | YES |
| `GET /api/auth/profile` | auth | yes | stress | 50 | 0 | 8.89 | 8.98 | YES |
| `POST /api/auth/profile` | auth | yes | stress | 50 | 0 | 16.64 | 17.09 | YES |
| `PUT /api/auth/profile` | auth | yes | stress | 50 | 0 | 15.59 | 16.04 | YES |
| `GET /api/auth/profile/foreign/:id` | auth | yes | stress | 50 | 0 | 11.11 | 11.55 | YES |
| `GET /api/auth/profile/posts/:id` | auth | yes | stress | 50 | 0 | 12.89 | 13.53 | YES |
| `GET /api/auth/profile/references` | auth | yes | stress | 50 | 0 | 12.47 | 12.89 | YES |
| `GET /api/auth/profiles` | auth | yes | stress | 50 | 0 | 12.93 | 13.03 | YES |
| `POST /api/auth/register` | auth | no | stress | 50 | 0 | 1421.2 | 1423.25 | YES |
| `POST /api/auth/training/calendars` | training | yes | stress | 50 | 0 | 19.49 | 20.26 | YES |
| `DELETE /api/auth/training/calendars/:calId/trainings/:itemId` | training | yes | stress | 50 | 0 | 17.64 | 17.76 | YES |
| `DELETE /api/auth/training/calendars/:id` | training | yes | stress | 50 | 0 | 12.56 | 13.07 | YES |
| `GET /api/auth/training/calendars/:id` | training | no | stress | 50 | 0 | 380.08 | 381.33 | YES |
| `PUT /api/auth/training/calendars/:id` | training | yes | stress | 50 | 0 | 19.09 | 19.71 | YES |
| `GET /api/auth/training/calendars/:id/preview` | training | yes | stress | 50 | 0 | 12.73 | 13.58 | YES |
| `POST /api/auth/training/calendars/:id/select` | training | yes | stress | 50 | 0 | 19.52 | 20.11 | YES |
| `POST /api/auth/training/calendars/:id/trainings` | training | yes | stress | 50 | 0 | 20.34 | 20.81 | YES |
| `PUT /api/auth/training/calendars/:id/trainings/reorder` | training | yes | stress | 50 | 0 | 20.62 | 21.28 | YES |
| `GET /api/auth/training/calendars/mine` | training | yes | stress | 50 | 0 | 13.69 | 14.22 | YES |
| `GET /api/auth/training/calendars/public` | training | yes | stress | 50 | 0 | 12.48 | 12.92 | YES |
| `GET /api/auth/training/calendars/selected` | training | yes | stress | 50 | 0 | 12.5 | 12.95 | YES |
| `GET /api/auth/training/calendars/week-stats` | training | yes | stress | 50 | 0 | 15.85 | 15.97 | YES |
| `GET /api/auth/training/combinations` | training | no | stress | 50 | 0 | 227.42 | 232.51 | YES |
| `POST /api/auth/training/combinations` | training | yes | stress | 50 | 0 | 19.1 | 19.81 | YES |
| `DELETE /api/auth/training/combinations/:id` | training | yes | stress | 50 | 0 | 11.64 | 12.1 | YES |
| `GET /api/auth/training/combinations/:id` | training | no | stress | 50 | 0 | 221.21 | 227 | YES |
| `PUT /api/auth/training/combinations/:id` | training | yes | stress | 50 | 0 | 16.59 | 16.98 | YES |
| `GET /api/auth/training/combinations/:id/preview` | training | no | stress | 50 | 0 | 223.16 | 223.66 | YES |
| `GET /api/auth/training/combinations/grouped` | training | no | stress | 50 | 0 | 237.96 | 239.93 | YES |
| `GET /api/auth/training/drills` | training | no | stress | 50 | 0 | 326.15 | 337.19 | YES |
| `POST /api/auth/training/drills` | training | yes | stress | 50 | 0 | 17.48 | 18.11 | YES |
| `DELETE /api/auth/training/drills/:id` | training | yes | stress | 50 | 0 | 11.12 | 11.69 | YES |
| `GET /api/auth/training/drills/:id` | training | no | stress | 50 | 0 | 224.26 | 229.82 | YES |
| `PUT /api/auth/training/drills/:id` | training | yes | stress | 50 | 0 | 20.15 | 20.78 | YES |
| `GET /api/auth/training/drills/:id/preview` | training | no | stress | 50 | 0 | 228.11 | 232.03 | YES |
| `GET /api/auth/training/drills/grouped` | training | no | stress | 50 | 0 | 345.98 | 358.55 | YES |
| `GET /api/auth/training/recommendations` | training | yes | stress | 50 | 0 | 12.91 | 13.38 | YES |
| `GET /api/auth/training/techniques` | training | no | stress | 50 | 0 | 243.24 | 245.82 | YES |
| `POST /api/auth/training/techniques` | training | yes | stress | 50 | 0 | 18.88 | 19.48 | YES |
| `DELETE /api/auth/training/techniques/:id` | training | yes | stress | 50 | 0 | 11.98 | 12.5 | YES |
| `GET /api/auth/training/techniques/:id` | training | no | stress | 50 | 0 | 225.01 | 225.37 | YES |
| `PUT /api/auth/training/techniques/:id` | training | yes | stress | 50 | 0 | 17.66 | 17.98 | YES |
| `GET /api/auth/training/techniques/:id/preview` | training | no | stress | 50 | 0 | 223.81 | 224.69 | YES |
| `GET /api/auth/training/techniques/grouped` | training | no | stress | 50 | 0 | 241.99 | 245.08 | YES |
| `GET /api/auth/training/trainings` | training | no | stress | 50 | 0 | 225.91 | 229.87 | YES |
| `POST /api/auth/training/trainings` | training | yes | stress | 50 | 0 | 22.81 | 24 | YES |
| `DELETE /api/auth/training/trainings/:id` | training | yes | stress | 50 | 0 | 13.81 | 14.03 | YES |
| `GET /api/auth/training/trainings/:id` | training | no | stress | 50 | 0 | 225.96 | 229.42 | YES |
| `PUT /api/auth/training/trainings/:id` | training | yes | stress | 50 | 0 | 19.73 | 20.36 | YES |
| `POST /api/auth/training/trainings/:id/components` | training | yes | stress | 50 | 0 | 19.83 | 20.36 | YES |
| `PUT /api/auth/training/trainings/:id/components/reorder` | training | yes | stress | 50 | 0 | 20.79 | 21.72 | YES |
| `DELETE /api/auth/training/trainings/components/:compId` | training | yes | stress | 50 | 0 | 17.8 | 18.77 | YES |
| `PUT /api/auth/training/trainings/components/:compId` | training | yes | stress | 50 | 0 | 28.72 | 29.65 | YES |
| `GET /api/auth/user` | auth | yes | stress | 50 | 0 | 12.32 | 13.45 | YES |
| `PUT /api/auth/user` | auth | yes | stress | 50 | 0 | 15.24 | 15.62 | YES |

## Service function coverage

- Covered service exports: 91/97
- Uncovered service exports: 6

| Service function | Covered by tested endpoint controller | Controllers |
|---|---|---|
| `authAuditService.ts#logAuthEvent` | NO | - |
| `authAuditService.ts#logAuthEventSafe` | NO | - |
| `authService.ts#loginLocalUser` | YES | userController.ts |
| `authService.ts#loginWithGoogleIdToken` | YES | userController.ts |
| `authService.ts#registerLocalUser` | YES | userController.ts |
| `authService.ts#resolveGoogleOwnershipConflict` | YES | userController.ts |
| `cachedProgressService.ts#getProfileProgressCached` | YES | gamificationController.ts |
| `calendarService.ts#addTrainingToCalendar` | YES | trainingCalendarsController.ts |
| `calendarService.ts#clearCalendarTrainings` | YES | trainingCalendarsController.ts |
| `calendarService.ts#createCalendar` | YES | trainingCalendarsController.ts |
| `calendarService.ts#deleteCalendar` | YES | trainingCalendarsController.ts |
| `calendarService.ts#forkCalendar` | YES | trainingCalendarsController.ts |
| `calendarService.ts#getCalendarById` | YES | trainingCalendarsController.ts |
| `calendarService.ts#getCalendarPreview` | YES | trainingCalendarsController.ts |
| `calendarService.ts#getSelectedCalendar` | YES | trainingCalendarsController.ts |
| `calendarService.ts#getWeeklyStats` | YES | trainingCalendarsController.ts |
| `calendarService.ts#listPublicCalendars` | YES | trainingCalendarsController.ts |
| `calendarService.ts#listUserCalendars` | YES | trainingCalendarsController.ts |
| `calendarService.ts#removeTrainingFromCalendar` | YES | trainingCalendarsController.ts |
| `calendarService.ts#reorderCalendarTrainings` | YES | trainingCalendarsController.ts |
| `calendarService.ts#selectCalendar` | YES | trainingCalendarsController.ts |
| `calendarService.ts#updateCalendar` | YES | trainingCalendarsController.ts |
| `cloudinaryService.ts#cloudinaryService` | YES | discoveryController.ts, friendsController.ts, profileController.ts, combinationsController.ts, drillsController.ts, techniquesController.ts |
| `clubsService.ts#addClubTrainingToSelectedCalendar` | YES | clubsController.ts |
| `clubsService.ts#copyClubTrainingPlan` | YES | clubsController.ts |
| `clubsService.ts#createClub` | YES | clubsController.ts |
| `clubsService.ts#createClubCalendarFull` | YES | clubsController.ts |
| `clubsService.ts#createClubPost` | YES | clubsController.ts |
| `clubsService.ts#createClubTraining` | YES | clubsController.ts |
| `clubsService.ts#createClubTrainingPlan` | YES | clubsController.ts |

> Note: Endpoint reliability pass/fail is based on transport errors/timeouts and HTTP 5xx rate. Expected 4xx validations are treated as handled responses.

