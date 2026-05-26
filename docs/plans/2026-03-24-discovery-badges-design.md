# Discovery Recommendations & Badge Details Design

**Date:** 2026-03-24  
**Status:** Approved for implementation

## Overview

This design addresses two missing features in the Sparr boxing app:
1. **Discovery recommendations** — Personalized content based on user location, fighting style, and weight class
2. **Badge detail view** — Bottom sheet modal showing badge information when tapped

## User Stories

### Discovery Recommendations
- **As a boxer**, I want to see clubs near me so I can find training partners.
- **As a beginner**, I want to discover popular trainings so I can follow proven workouts.
- **As a user**, I want to find boxers like me (same style/weight class) to connect with.

### Badge Details
- **As a user**, I want to tap on any badge to see what it means and my progress toward unlocking it.
- **As a user**, I want to see when I earned a badge and why.

## Design Decisions

### Location Matching
**Decision:** Text-based location matching (not GPS geolocation)

**Rationale:**
- GPS requires additional permissions and complexity
- Users already provide location text in their profile
- Simple ILIKE matching (`location ILIKE '%Prague%'`) is effective for most use cases
- Can upgrade to geolocation later if needed

### Popular Trainings Definition
**Decision:** Combined score from user completions + club scheduling

**Rationale:**
- Workout completions alone would favor solo trainings
- Club scheduling alone would miss popular personal routines
- Combined scoring gives a balanced view of actual usage

### Badge Detail UI
**Decision:** Bottom sheet modal

**Rationale:**
- More native feel on mobile than full-screen navigation
- User maintains context of where they came from
- Can be dismissed with swipe-down gesture
- Consistent with modern app design patterns

## Technical Design

### Backend API

**Endpoint:** `GET /auth/discovery/recommendations`

**Response:**
```json
{
  "success": true,
  "recommendations": {
    "nearbyClubs": [
      { "idclubs": 1, "title": "Prague Boxing Club", "location": "Prague", "members_count": 45 }
    ],
    "popularTrainings": [
      { "id_trainings": 1, "title": "Heavy Bag Basics", "popularity": 120 }
    ],
    "suggestedBoxers": [
      { "id_profiles": 5, "display_name": "Jan Novak", "title_style": "Counter Puncher" }
    ]
  }
}
```

### Frontend Components

```
DiscoveryScreen
├── TabBar (Posts | Clubs | Boxers | For You)  ← new tab
└── ForYouTab
    ├── RecommendationSection (Nearby Clubs)
    ├── RecommendationSection (Popular Trainings)
    └── RecommendationSection (Boxers Like You)

BadgeCarousel
├── BadgeIcon (with onPress)
└── BadgeDetailModal (bottom sheet)
```

## File Changes

### New Files
| File | Purpose |
|------|---------|
| `backend/src/services/recommendationsService.ts` | SQL queries for recommendations |
| `backend/src/controllers/recommendationsController.ts` | Request handling |
| `frontend/src/api/recommendations.ts` | API wrapper |
| `frontend/src/components/BadgeDetailModal.tsx` | Bottom sheet component |
| `frontend/src/components/RecommendationSection.tsx` | Horizontal scroll cards |

### Modified Files
| File | Changes |
|------|---------|
| `backend/src/routes/auth.ts` | Add recommendations route |
| `frontend/src/screens/DiscoveryScreen.tsx` | Add "For You" tab |
| `frontend/src/components/BadgeCarousel.tsx` | Add tap handler + modal |

## Migration

No database migrations required — all queries use existing tables.

## Future Enhancements

1. **GPS geolocation** — Upgrade to real distance-based recommendations
2. **Trending content** — Time-weighted popularity (recent activity matters more)
3. **Follow/bookmark trainings** — Let users save recommended trainings
4. **Badge sharing** — Share earned badges to social media
