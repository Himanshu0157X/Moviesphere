# Prototype, Usability Testing, and Iteration

## Prototype
The high-fidelity prototype is the implemented React web app in this project. It uses live TMDB data and translates the low-fidelity wireframe into a polished interface with:

- A cinematic hero area
- Two recommendation modes
- Filter chips for mood, genre, and era
- Search-driven seed recommendations
- Responsive movie cards with concise metadata

## Usability Test Plan

### Test Objectives
1. Check whether first-time users understand the two recommendation modes.
2. Measure whether users can generate a recommendation list quickly.
3. Identify points of confusion in filtering and search interactions.

### Tasks
1. Find a mind-bending movie released in the 2020s.
2. Use a favorite movie to get similar recommendations.
3. Compare two suggested movies and choose one to watch.

### Metrics
1. Time on task
2. Number of mis-clicks
3. Verbal confusion points
4. Post-task satisfaction rating on a 5-point scale

## Sample Findings from 3 Pilot Tests
1. All 3 users understood the mood-based path immediately.
2. 2 users expected search suggestions to remain visible after selecting a movie, so selection feedback needed to be stronger.
3. 1 user wanted clearer confirmation that recommendations had refreshed after changing filters.
4. Users liked the poster-first layout because it felt familiar and quick to scan.

## Iterations Made
1. Added a stronger active state to mode buttons, chips, and search results.
2. Added a featured movie panel to provide an immediate focal recommendation.
3. Kept the recommendation set capped to reduce overload and endless scrolling.
4. Added explicit loading and configuration messages for better system feedback.

## Next Iteration Ideas
1. Add watchlist saving and comparison mode.
2. Explain why each recommendation was selected.
3. Offer accessibility settings such as larger cards and reduced motion.
