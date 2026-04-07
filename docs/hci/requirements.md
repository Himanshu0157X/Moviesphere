# Requirements

## Functional Requirements
1. The system shall allow users to get recommendations using mood, genre, and era filters.
2. The system shall allow users to search for a known movie and fetch recommendation results based on that movie.
3. The system shall display movie poster, title, release year, rating, and overview for each result.
4. The system shall fetch live movie data from TMDB using the provided API key.
5. The system shall communicate loading and error states clearly.

## Non-Functional Requirements
1. The interface should be usable on desktop and mobile screens.
2. The recommendation controls should be understandable within a few seconds of first use.
3. The layout should minimize cognitive overload through grouping, whitespace, and limited choice sets.
4. The app should provide feedback for missing API configuration and failed API requests.

## User Stories
1. As a casual viewer, I want to choose a mood so I can discover movies without knowing a title.
2. As a returning movie fan, I want to start from a favorite film so I can get similar suggestions.
3. As a busy user, I want compact information on each recommendation so I can decide quickly.
4. As a first-time user, I want simple controls so I do not need instructions before using the app.

## Success Criteria
1. A first-time user can generate a recommendation list in under 20 seconds.
2. Users can explain the difference between the two recommendation modes after a single session.
3. At least 80% of test users report that the interface feels less overwhelming than browsing a generic catalog.
