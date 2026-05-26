# Bugfixes & Improvements Design

**Date:** 2026-03-24  
**Status:** Ready for implementation

## Overview

This design addresses 4 reported issues in the Sparr boxing app.

---

## Issue 1: Rest Day Shows as Training

### Problem
Rest days (calendar slots with `id_trainings = NULL`) display the same UI as "no training selected" — confusing users about whether they forgot to assign a training or it's intentionally a rest day.

### Solution
Add distinct visual styling for rest days:
- **Rest day icon**: Moon or bed icon (`moon-outline` from Ionicons)
- **Calmer color scheme**: Blue/purple tones instead of red
- **Clear label**: "Rest Day" with subtitle "Recovery time — take it easy!"
- **No action buttons**: Hide "Start Workout" and component list

### Technical Changes

**`frontend/src/components/TrainingCard.tsx`**:
- Add new prop: `isRestDay: boolean`
- Render different UI when `isRestDay=true`:
  - Different background color (blue-tinted glass)
  - Moon icon instead of fitness icon
  - "Rest Day" title
  - No workout buttons

**`frontend/src/screens/CalendarScreen.tsx`**:
- Pass `isRestDay` prop based on slot data:
  - `isRestDay = slot exists AND slot.id_trainings === null`
  - `isEmpty = no slot exists for this day`

---

## Issue 2: Discovery Filters Don't Work

### Problem
Style and weight class filters only apply to "Boxers" tab. Posts and Clubs tabs ignore these filters entirely.

### Solution
**Approach A: Remove irrelevant filters per tab** (Recommended)
- Style/weight filters only make sense for Boxers (profiles have style/weight, posts/clubs don't)
- Show filter panel only for relevant tabs
- Clubs: show join policy filter only
- Posts: show type filter (text/media) only
- Boxers: show style + weight class filters
- For You: no filters (recommendations are personalized)

### Technical Changes

**`frontend/src/screens/DiscoveryScreen.tsx`**:
- Conditionally render filters based on `activeTab`
- Move filter state clearing when switching tabs
- Remove style/weight filter inputs for Posts/Clubs/ForYou tabs

---

## Issue 3: Style/Weight Class Should Be Dropdowns

### Problem
Style and weight class filters are free-text inputs. Users must type exact values, which is error-prone and poor UX.

### Solution
Replace TextInputs with Select/Picker components populated from reference data:
- Fetch `boxing_style` and `weight_class` options on mount
- Use existing `/api/auth/profile/references` endpoint
- Display as dropdown/select with "All" option at top

### Technical Changes

**`frontend/src/screens/DiscoveryScreen.tsx`**:
- Add state: `boxingStyles`, `weightClasses` arrays
- Fetch reference data on mount via `getProfileReferences()`
- Replace TextInput with Select component (or chip-based selector for mobile)
- Filter values become IDs, not strings

**`frontend/src/api/references.ts`** (new file):
- Export `getReferences()` function to fetch style/weight options

**Filter UI Approach**: Use horizontal chip selector (like existing join policy filter) rather than dropdown — more mobile-friendly and consistent with current design.

---

## Issue 4: Popular Calendars in "For You"

### Problem
No way to discover popular training calendars. The "For You" tab shows clubs/boxers/trainings but not calendars.

### Solution
Add "Popular Calendars" section to "For You" tab with:
- Calendars sorted by fork count (most copied = most popular)
- Quick "Add to My Calendars" action
- Preview before adding

### Technical Changes

**Backend**:

**`backend/src/services/recommendationsService.ts`**:
- Add `getPopularCalendars(limit: number)` function
- Query: count `profiles_training_calendar` rows per calendar as "subscribers"
- Also count calendars forked (via `training_calendar.id_created_by != original creator`)
- Sort by subscriber count DESC

```sql
SELECT tc.*, 
       p.display_name AS creator_name,
       COUNT(DISTINCT ptc.profiles_id_profiles) AS subscriber_count,
       COUNT(DISTINCT tct.id_training_calendar_trainings) AS training_count
FROM training_calendar tc
LEFT JOIN profiles p ON tc.id_created_by = p.id_profiles
LEFT JOIN profiles_training_calendar ptc ON ptc.training_calendar_id_training_calendar = tc.id_training_calendar
LEFT JOIN training_calendar_trainings tct ON tct.id_training_calendar = tc.id_training_calendar
WHERE tc.privacy = 'public'
GROUP BY tc.id_training_calendar, p.display_name
ORDER BY subscriber_count DESC
LIMIT $1
```

**`backend/src/controllers/recommendationsController.ts`**:
- Include `popularCalendars` in recommendations response

**Frontend**:

**`frontend/src/api/recommendations.ts`**:
- Add `PopularCalendar` interface
- Update `Recommendations` type to include `popularCalendars`

**`frontend/src/components/RecommendationSection.tsx`**:
- Add `CalendarCard` component

**`frontend/src/screens/DiscoveryScreen.tsx`**:
- Render "Popular Calendars" section in "For You" tab
- Navigate to `CalendarPreview` on tap
- "Add" button to fork/select calendar

---

## File Changes Summary

### Modified Files
| File | Changes |
|------|---------|
| `frontend/src/components/TrainingCard.tsx` | Add `isRestDay` prop with distinct styling |
| `frontend/src/screens/CalendarScreen.tsx` | Pass `isRestDay` based on slot data |
| `frontend/src/screens/DiscoveryScreen.tsx` | Tab-specific filters, dropdowns, calendar section |
| `frontend/src/api/recommendations.ts` | Add `PopularCalendar` type |
| `frontend/src/components/RecommendationSection.tsx` | Add `CalendarCard` component |
| `backend/src/services/recommendationsService.ts` | Add `getPopularCalendars()` |
| `backend/src/controllers/recommendationsController.ts` | Include calendars in response |

### New Files
| File | Purpose |
|------|---------|
| `frontend/src/api/references.ts` | Fetch boxing_style and weight_class options |

---

## Testing Checklist

- [ ] Rest day displays with moon icon and different color
- [ ] Empty day (no calendar) shows "Select calendar" prompt
- [ ] Training day shows normal workout UI
- [ ] Filters only appear for relevant tabs
- [ ] Style/weight filters show dropdown options
- [ ] "All" option clears filter
- [ ] Popular calendars appear in "For You" tab
- [ ] Tapping calendar navigates to preview
- [ ] "Add" button forks calendar to user's collection
