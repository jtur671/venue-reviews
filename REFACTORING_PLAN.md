# Refactoring Plan

## Overview
This document outlines a structured refactoring plan to improve code organization, maintainability, and scalability while preserving functionality.

---

## Phase 1: Data Layer & API Abstraction (High Priority)

### 1.1 Create Supabase Service Layer
**Goal**: Centralize all database queries and improve type safety

**Files to create:**
- `src/lib/services/venueService.ts` - Venue CRUD operations
- `src/lib/services/reviewService.ts` - Review CRUD operations

**Current issues:**
- Supabase queries scattered across components (`page.tsx`, `ReviewForm.tsx`, `AddVenueForm.tsx`, `VenuePage`)
- Duplicate error handling patterns
- Type safety issues with `any` types
- No centralized query logic

**Refactoring steps:**
```typescript
// src/lib/services/venueService.ts
export async function getAllVenues(): Promise<VenueWithStats[]>
export async function getVenueById(id: string): Promise<Venue | null>
export async function createVenue(data: CreateVenueInput): Promise<{ id: string }>
export async function searchVenues(query: string, city?: string): Promise<VenueWithStats[]>

// src/lib/services/reviewService.ts
export async function getReviewsByVenueId(venueId: string): Promise<Review[]>
export async function createReview(data: CreateReviewInput): Promise<Review>
export async function updateReview(id: string, userId: string, data: UpdateReviewInput): Promise<Review>
export async function deleteReview(id: string, userId: string): Promise<void>
```

**Benefits:**
- Single source of truth for queries
- Easier to test and mock
- Better error handling consistency
- Improved type safety

---

## Phase 2: Extract Custom Hooks (High Priority)

### 2.1 Data Fetching Hooks
**Goal**: Extract data fetching logic from components

**Files to create:**
- `src/hooks/useVenues.ts` - Venue list fetching and filtering
- `src/hooks/useVenue.ts` - Single venue fetching
- `src/hooks/useReviews.ts` - Reviews fetching with user review separation

**Current issues:**
- `HomePage` has 400+ lines with complex state management
- `VenuePage` mixes data fetching with presentation
- Duplicate loading/error state patterns

**Example:**
```typescript
// src/hooks/useVenues.ts
export function useVenues() {
  const { user, loading: userLoading } = useAnonUser();
  const [venues, setVenues] = useState<VenueWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const loadVenues = useCallback(async () => {
    // ... existing logic
  }, [userLoading, user]);
  
  return { venues, loading, error, refetch: loadVenues };
}
```

**Benefits:**
- Reusable data fetching logic
- Cleaner component code
- Easier to test
- Better separation of concerns

### 2.2 Computed Data Hooks
**Goal**: Extract complex computed values

**Files to create:**
- `src/hooks/useVenueStats.ts` - Popular cities, recently rated, etc.
- `src/hooks/useReviewStats.ts` - Average scores, aspect averages

**Current issues:**
- Multiple `useMemo` hooks in `HomePage` (popularCityStats, exampleVenue, recentlyRated, filteredVenues)
- Complex calculations mixed with component logic

---

## Phase 3: Component Decomposition (Medium Priority)

### 3.1 Break Down Large Components
**Goal**: Split `HomePage` into smaller, focused components

**Files to create:**
- `src/components/HomeHero.tsx` - Hero section with "how it works"
- `src/components/RecentlyRatedSection.tsx` - Recently rated venues list
- `src/components/PopularCitiesSection.tsx` - Popular cities display
- `src/components/WhatWeMeasureSection.tsx` - What we measure list

**Current issues:**
- `HomePage` is 400+ lines
- Multiple responsibilities in one component
- Hard to test individual sections

**Benefits:**
- Better component reusability
- Easier to test
- Clearer component hierarchy
- Better code organization

### 3.2 Extract Form Logic
**Goal**: Separate form state management from presentation

**Files to create:**
- `src/hooks/useReviewForm.ts` - Form state and validation logic
- `src/components/ReviewFormFields.tsx` - Form fields presentation
- `src/components/AspectSliders.tsx` - Slider group component

**Current issues:**
- `ReviewForm` mixes form logic, validation, and presentation
- 350+ lines in single component
- Hard to reuse form logic elsewhere

---

## Phase 4: Styling & CSS Organization (Medium Priority)

### 4.1 Extract Inline Styles to CSS Classes
**Goal**: Move repeated inline styles to CSS classes

**Current issues:**
- Many inline styles throughout components
- Hard to maintain consistent spacing/sizing
- Difficult to theme consistently

**Examples to extract:**
- Form field containers
- Score pills/badges
- Section headers with specific styling
- Flex layouts (header inner, form actions)

**Files to update:**
- `app/globals.css` - Add utility classes
- Components - Replace inline styles with classes

**Example:**
```css
.form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.score-pill {
  padding: 0.4rem 0.75rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  background: var(--chip-bg);
  border: 1px solid var(--chip-border);
}
```

### 4.2 Create Style Constants
**Goal**: Extract magic numbers and repeated values

**Files to create:**
- `src/styles/constants.ts` - Spacing, colors, breakpoints

**Current issues:**
- Magic numbers scattered (0.75rem, 0.5rem, etc.)
- Color values hardcoded (#f97373, etc.)
- Breakpoint values repeated

---

## Phase 5: Type Safety & Constants (Low Priority)

### 5.1 Improve Type Definitions
**Goal**: Better type safety throughout

**Files to update:**
- `src/types/venues.ts` - Add more specific types
- Create `src/types/supabase.ts` - Generated Supabase types

**Current issues:**
- `any` types in Supabase queries
- Inconsistent type usage
- Missing return types on some functions

### 5.2 Extract Constants
**Goal**: Centralize configuration values

**Files to create:**
- `src/constants/aspects.ts` - Aspect configuration (icons, colors, labels)
- `src/constants/ui.ts` - UI constants (limits, defaults)

**Current issues:**
- Aspect config in `ReviewForm.tsx` (should be shared)
- Magic numbers (slice(0, 5), slice(0, 6))
- Hardcoded limits and defaults

---

## Phase 6: Utility Functions (Low Priority)

### 6.1 Date Formatting
**Goal**: Centralize date formatting logic

**Files to create:**
- `src/lib/utils/date.ts` - Date formatting utilities

**Current issues:**
- `formatDateShort` function in `page.tsx`
- Date formatting scattered (`toLocaleDateString`, `toLocaleString`)

### 6.2 Score Calculations
**Goal**: Extract score calculation logic

**Files to create:**
- `src/lib/utils/scores.ts` - Score calculation utilities

**Current issues:**
- Overall score calculation in `ReviewForm`
- Average calculations in `VenuePage`
- Aspect average calculations

---

## Phase 7: Error Handling & Loading States (Medium Priority)

### 7.1 Standardize Error Handling
**Goal**: Consistent error handling patterns

**Files to create:**
- `src/lib/utils/errors.ts` - Error handling utilities
- `src/components/ErrorBoundary.tsx` - Error boundary component

**Current issues:**
- Inconsistent error messages
- No centralized error handling
- Console.error scattered

### 7.2 Loading State Components
**Goal**: Reusable loading components

**Files to create:**
- `src/components/LoadingSpinner.tsx`
- `src/components/LoadingState.tsx`
- `src/components/EmptyState.tsx`

**Current issues:**
- Loading states are just text
- No consistent loading UI
- Empty states scattered

---

## Implementation Priority

### Immediate (Do First)
1. ✅ Extract `AspectKey` and `DEFAULT_ASPECTS` to types (DONE)
2. Phase 1.1: Create Supabase service layer
3. Phase 2.1: Extract `useVenues` hook
4. Phase 2.1: Extract `useVenue` hook

### Short Term (Next Sprint)
5. Phase 2.2: Extract computed data hooks
6. Phase 3.1: Break down `HomePage`
7. Phase 4.1: Extract common inline styles

### Medium Term (Future)
8. Phase 3.2: Extract form logic hooks
9. Phase 5: Type safety improvements
10. Phase 6: Utility functions
11. Phase 7: Error handling standardization

---

## Success Metrics

- **Code organization**: Components < 200 lines, hooks < 100 lines
- **Reusability**: No duplicate query logic
- **Type safety**: Zero `any` types in production code
- **Maintainability**: New features require changes in < 3 files
- **Testability**: All data logic in testable service/hook layer

---

## Notes

- All refactoring should be done incrementally
- Maintain backward compatibility during transitions
- Add tests for new service/hook layers
- Update documentation as you go
- Consider using React Query or SWR for data fetching (future consideration)
