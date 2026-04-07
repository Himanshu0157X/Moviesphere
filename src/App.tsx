import { startTransition, useDeferredValue, useEffect, useState } from 'react'
import './App.css'

type Movie = {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  genre_ids?: number[]
}

type SearchMovie = {
  id: number
  title: string
  release_date: string
}

type MovieDetails = {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  runtime: number | null
  genres: Genre[]
  tagline: string
  status: string
}

type CastMember = {
  id: number
  name: string
  character: string
}

type Provider = {
  provider_id: number
  provider_name: string
}

type WatchProviderRegion = {
  link?: string
  flatrate?: Provider[]
  rent?: Provider[]
  buy?: Provider[]
}

type WatchProvidersResponse = {
  results?: {
    US?: WatchProviderRegion
  }
}

type Genre = {
  id: number
  name: string
}

type MoodKey = 'feel-good' | 'intense' | 'mind-bending' | 'heartfelt'
type EraKey = 'any' | 'recent' | '2010s' | '2000s' | 'classics'

const API_BASE = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/original'
const API_KEY = import.meta.env.VITE_TMDB_API_KEY

const GENRES: Genre[] = [
  { id: 28, name: 'Action' },
  { id: 35, name: 'Comedy' },
  { id: 18, name: 'Drama' },
  { id: 27, name: 'Horror' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Sci-Fi' },
  { id: 53, name: 'Thriller' },
  { id: 16, name: 'Animation' },
  { id: 10751, name: 'Family' },
]

const MOODS: {
  key: MoodKey
  label: string
  description: string
  genres: number[]
  sortBy: string
}[] = [
  {
    key: 'feel-good',
    label: 'Feel-good',
    description: 'light, warm, and easy to recommend for a relaxed evening',
    genres: [35, 10751],
    sortBy: 'popularity.desc',
  },
  {
    key: 'intense',
    label: 'Intense',
    description: 'high energy stories with suspense, action, and stakes',
    genres: [28, 53],
    sortBy: 'popularity.desc',
  },
  {
    key: 'mind-bending',
    label: 'Mind-bending',
    description: 'clever plots, twists, and speculative worlds',
    genres: [878, 9648],
    sortBy: 'vote_average.desc',
  },
  {
    key: 'heartfelt',
    label: 'Heartfelt',
    description: 'emotion-first picks with romance and drama at the center',
    genres: [18, 10749],
    sortBy: 'vote_average.desc',
  },
]

const ERAS: {
  key: EraKey
  label: string
  releaseDateGte?: string
  releaseDateLte?: string
}[] = [
  { key: 'any', label: 'Any era' },
  { key: 'recent', label: '2020s', releaseDateGte: '2020-01-01' },
  {
    key: '2010s',
    label: '2010s',
    releaseDateGte: '2010-01-01',
    releaseDateLte: '2019-12-31',
  },
  {
    key: '2000s',
    label: '2000s',
    releaseDateGte: '2000-01-01',
    releaseDateLte: '2009-12-31',
  },
  { key: 'classics', label: 'Before 2000', releaseDateLte: '1999-12-31' },
]

function getYear(date?: string) {
  return date ? date.slice(0, 4) : 'TBA'
}

function getPoster(movie: Movie) {
  return movie.poster_path
    ? `${IMAGE_BASE}${movie.poster_path}`
    : 'https://placehold.co/500x750/1b1a18/f4efe6?text=Poster+Unavailable'
}

function getBackdrop(movie: Movie | null) {
  if (!movie?.backdrop_path) {
    return ''
  }

  return `${BACKDROP_BASE}${movie.backdrop_path}`
}

function getRuntimeLabel(runtime: number | null) {
  if (!runtime) {
    return 'Runtime unavailable'
  }

  const hours = Math.floor(runtime / 60)
  const minutes = runtime % 60

  if (!hours) {
    return `${minutes}m`
  }

  return `${hours}h ${minutes}m`
}

function formatProviders(providers?: Provider[]) {
  if (!providers?.length) {
    return 'Not listed'
  }

  return providers.map((provider) => provider.provider_name).join(', ')
}

function toggleGenre(current: number[], genreId: number) {
  return current.includes(genreId)
    ? current.filter((id) => id !== genreId)
    : [...current, genreId]
}

async function fetchTmdb<T>(path: string, params: Record<string, string> = {}) {
  const searchParams = new URLSearchParams({
    language: 'en-US',
    include_adult: 'false',
    ...params,
  })

  const response = API_KEY
    ? await fetch(
        `${API_BASE}${path}?${new URLSearchParams({
          api_key: API_KEY,
          ...Object.fromEntries(searchParams),
        }).toString()}`,
      )
    : await fetch(
        `/api/tmdb?${new URLSearchParams({
          path,
          ...Object.fromEntries(searchParams),
        }).toString()}`,
      )

  if (!response.ok) {
    throw new Error('TMDB request failed. Please check the API key and try again.')
  }

  return (await response.json()) as T
}

function App() {
  const [mode, setMode] = useState<'compass' | 'seed'>('compass')
  const [view, setView] = useState<'recommendations' | 'catalog'>('recommendations')
  const [selectedGenres, setSelectedGenres] = useState<number[]>([878, 9648])
  const [selectedMood, setSelectedMood] = useState<MoodKey>('mind-bending')
  const [selectedEra, setSelectedEra] = useState<EraKey>('recent')
  const [discoverMovies, setDiscoverMovies] = useState<Movie[]>([])
  const [catalogMovies, setCatalogMovies] = useState<Movie[]>([])
  const [catalogPage, setCatalogPage] = useState(1)
  const [catalogHasMore, setCatalogHasMore] = useState(true)
  const [heroMovie, setHeroMovie] = useState<Movie | null>(null)
  const [seedQuery, setSeedQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchMovie[]>([])
  const [selectedSeedMovie, setSelectedSeedMovie] = useState<SearchMovie | null>(null)
  const [seedRecommendations, setSeedRecommendations] = useState<Movie[]>([])
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [seedLoading, setSeedLoading] = useState(false)
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [movieDetails, setMovieDetails] = useState<MovieDetails | null>(null)
  const [movieCast, setMovieCast] = useState<CastMember[]>([])
  const [movieProviders, setMovieProviders] = useState<WatchProviderRegion | null>(null)
  const [relatedMovies, setRelatedMovies] = useState<Movie[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const deferredQuery = useDeferredValue(seedQuery)

  useEffect(() => {
    let cancelled = false

    async function loadDiscoverMovies() {
      setDiscoverLoading(true)
      setErrorMessage('')

      const mood = MOODS.find(({ key }) => key === selectedMood)
      const era = ERAS.find(({ key }) => key === selectedEra)
      const withGenres = Array.from(
        new Set([...selectedGenres, ...(mood?.genres ?? [])]),
      ).join(',')

      try {
        const data = await fetchTmdb<{ results: Movie[] }>('/discover/movie', {
          sort_by: mood?.sortBy ?? 'popularity.desc',
          vote_count_gte: '180',
          with_genres: withGenres,
          ...(era?.releaseDateGte ? { 'release_date.gte': era.releaseDateGte } : {}),
          ...(era?.releaseDateLte ? { 'release_date.lte': era.releaseDateLte } : {}),
        })

        if (!cancelled) {
          setDiscoverMovies(data.results.slice(0, 12))
          setHeroMovie(data.results[0] ?? null)
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to load movies right now.',
          )
        }
      } finally {
        if (!cancelled) {
          setDiscoverLoading(false)
        }
      }
    }

    void loadDiscoverMovies()

    return () => {
      cancelled = true
    }
  }, [selectedGenres, selectedMood, selectedEra])

  useEffect(() => {
    if (deferredQuery.trim().length < 2 || !API_KEY) {
      setSearchResults([])
      return
    }

    let cancelled = false

    async function searchMovies() {
      try {
        const data = await fetchTmdb<{ results: SearchMovie[] }>('/search/movie', {
          query: deferredQuery.trim(),
          page: '1',
        })

        if (!cancelled) {
          startTransition(() => {
            setSearchResults(data.results.slice(0, 5))
          })
        }
      } catch {
        if (!cancelled) {
          setSearchResults([])
        }
      }
    }

    void searchMovies()

    return () => {
      cancelled = true
    }
  }, [deferredQuery])

  useEffect(() => {
    if (!selectedSeedMovie) {
      setSeedRecommendations([])
      return
    }

    const seedMovieId = selectedSeedMovie.id
    let cancelled = false

    async function loadRecommendations() {
      setSeedLoading(true)
      setErrorMessage('')

      try {
        const data = await fetchTmdb<{ results: Movie[] }>(`/movie/${seedMovieId}/recommendations`)

        if (!cancelled) {
          setSeedRecommendations(data.results.slice(0, 12))
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to load recommendations.',
          )
        }
      } finally {
        if (!cancelled) {
          setSeedLoading(false)
        }
      }
    }

    void loadRecommendations()

    return () => {
      cancelled = true
    }
  }, [selectedSeedMovie])

  useEffect(() => {
    if (!selectedMovie) {
      setMovieDetails(null)
      setMovieCast([])
      setMovieProviders(null)
      setRelatedMovies([])
      return
    }

    const selectedMovieId = selectedMovie.id
    let cancelled = false

    async function loadMovieDetails() {
      setDetailLoading(true)

      try {
        const [details, providers, credits, similar] = await Promise.all([
          fetchTmdb<MovieDetails>(`/movie/${selectedMovieId}`),
          fetchTmdb<WatchProvidersResponse>(`/movie/${selectedMovieId}/watch/providers`),
          fetchTmdb<{ cast: CastMember[] }>(`/movie/${selectedMovieId}/credits`),
          fetchTmdb<{ results: Movie[] }>(`/movie/${selectedMovieId}/similar`),
        ])

        if (!cancelled) {
          setMovieDetails(details)
          setMovieProviders(providers.results?.US ?? null)
          setMovieCast(credits.cast.slice(0, 8))
          setRelatedMovies(similar.results.slice(0, 6))
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to load movie details.',
          )
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false)
        }
      }
    }

    void loadMovieDetails()

    return () => {
      cancelled = true
    }
  }, [selectedMovie])

  async function loadCatalogPage(page: number, replace = false) {
    setCatalogLoading(true)
    setErrorMessage('')

    try {
      const data = await fetchTmdb<{ page: number; total_pages: number; results: Movie[] }>(
        '/discover/movie',
        {
          sort_by: 'popularity.desc',
          vote_count_gte: '200',
          page: String(page),
        },
      )

      setCatalogPage(data.page)
      setCatalogHasMore(data.page < Math.min(data.total_pages, 20))
      setCatalogMovies((current) => (replace ? data.results : [...current, ...data.results]))
      setHeroMovie((current) => current ?? data.results[0] ?? null)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to load the TMDB catalog.',
      )
    } finally {
      setCatalogLoading(false)
    }
  }

  const activeMood = MOODS.find(({ key }) => key === selectedMood)
  const recommendationMovies =
    mode === 'compass' ? discoverMovies : seedRecommendations
  const recommendationLoading = mode === 'compass' ? discoverLoading : seedLoading
  const activeMovies = view === 'catalog' ? catalogMovies : recommendationMovies
  const activeLoading = view === 'catalog' ? catalogLoading : recommendationLoading
  const seedMovieTitle = selectedSeedMovie?.title ?? ''
  const spotlightMovie = activeMovies[1] ?? heroMovie
  const spotlightGenres = GENRES.filter((genre) =>
    selectedGenres.includes(genre.id),
  ).map((genre) => genre.name)
  const detailGenres = movieDetails?.genres.map((genre) => genre.name).join(', ') ?? ''

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">MovieSphere</p>
          <p className="topbar-title">A movie recommendation website built to help users discover films faster through guided, personalized suggestions.</p>
        </div>
        <div className="topbar-badges" aria-label="Project badges">
          <button
            className={view === 'catalog' ? 'topbar-badge active' : 'topbar-badge'}
            onClick={() => {
              setView('catalog')

              if (catalogMovies.length === 0) {
                void loadCatalogPage(1, true)
              }
            }}
            type="button"
          >
            All movies
          </button>
        </div>
      </header>

      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Recommendation studio</p>
          <h1>Shape a movie night with a cleaner, smarter recommendation cockpit.</h1>
          <p className="hero-text">
            MovieSphere turns uncertain browsing into a guided path. Tune by mood,
            genre, and era, or start from a movie you already trust to discover a
            sharper set of next-watch options.
          </p>

          <div className="mode-switch" role="tablist" aria-label="Recommendation mode">
            <button
              className={mode === 'compass' ? 'active' : ''}
              onClick={() => setMode('compass')}
              type="button"
            >
              Preference compass
            </button>
            <button
              className={mode === 'seed' ? 'active' : ''}
              onClick={() => setMode('seed')}
              type="button"
            >
              Start from a movie
            </button>
          </div>

        </div>

        <div
          className="hero-feature"
          style={
            heroMovie
              ? {
                  backgroundImage: `linear-gradient(180deg, rgba(16, 18, 22, 0.12), rgba(16, 18, 22, 0.9)), url(${getBackdrop(
                    heroMovie,
                  )})`,
                }
              : undefined
          }
        >
          <p className="feature-label">Current featured pick</p>
          <h2>{heroMovie?.title ?? 'Waiting for recommendations'}</h2>
          <p>
            {heroMovie?.overview ??
              'Add your TMDB key, then the first recommendation appears here as a cinematic feature card.'}
          </p>
        </div>
      </section>

      <section className="workspace">
        <aside className="control-panel">
          {view === 'catalog' ? (
            <div className="panel-card">
              <h3>TMDB catalog</h3>
              <p>
                This view opens a broader stream of movies from TMDB so you can browse
                a much larger set of movie cards beyond the personalized suggestions.
              </p>

              <label className="panel-label">Catalog status</label>
              <p className="supporting-text">
                Showing page {catalogPage} from the TMDB discovery feed.
              </p>

              <div className="catalog-actions">
                <button
                  className="catalog-button"
                  onClick={() => setView('recommendations')}
                  type="button"
                >
                  Back to recommendations
                </button>
                <button
                  className="catalog-button secondary"
                  disabled={catalogLoading || !catalogHasMore}
                  onClick={() => void loadCatalogPage(catalogPage + 1)}
                  type="button"
                >
                  {catalogHasMore ? 'Load more' : 'No more pages'}
                </button>
              </div>
            </div>
          ) : mode === 'compass' ? (
            <div className="panel-card">
              <h3>Preference compass</h3>

              <label className="panel-label">Mood</label>
              <div className="chip-grid">
                {MOODS.map((mood) => (
                  <button
                    key={mood.key}
                    className={selectedMood === mood.key ? 'chip active' : 'chip'}
                    onClick={() => setSelectedMood(mood.key)}
                    type="button"
                  >
                    {mood.label}
                  </button>
                ))}
              </div>
              <p className="supporting-text">{activeMood?.description}</p>

              <label className="panel-label">Genres</label>
              <div className="chip-grid">
                {GENRES.map((genre) => (
                  <button
                    key={genre.id}
                    className={
                      selectedGenres.includes(genre.id) ? 'chip active' : 'chip'
                    }
                    onClick={() =>
                      setSelectedGenres((current) => toggleGenre(current, genre.id))
                    }
                    type="button"
                  >
                    {genre.name}
                  </button>
                ))}
              </div>

              <label className="panel-label">Era</label>
              <div className="pill-row">
                {ERAS.map((era) => (
                  <button
                    key={era.key}
                    className={selectedEra === era.key ? 'pill active' : 'pill'}
                    onClick={() => setSelectedEra(era.key)}
                    type="button"
                  >
                    {era.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="panel-card">
              <h3>Seed a recommendation</h3>
              <label className="panel-label" htmlFor="seed-search">
                Search a favorite movie
              </label>
              <input
                id="seed-search"
                className="search-input"
                onChange={(event) => setSeedQuery(event.target.value)}
                placeholder="Try Interstellar, La La Land, Dune..."
                type="text"
                value={seedQuery}
              />

              {searchResults.length > 0 ? (
                <div className="search-results">
                  {searchResults.map((movie) => (
                    <button
                      key={movie.id}
                      className={
                        selectedSeedMovie?.id === movie.id
                          ? 'search-result active'
                          : 'search-result'
                      }
                      onClick={() => {
                        setSelectedSeedMovie(movie)
                        setSeedQuery(movie.title)
                        setSearchResults([])
                      }}
                      type="button"
                    >
                      <span>{movie.title}</span>
                      <small>{getYear(movie.release_date)}</small>
                    </button>
                  ))}
                </div>
              ) : null}

              <p className="supporting-text">
                Pick one movie you already trust and MovieSphere pulls related titles
                from TMDB recommendations.
              </p>
            </div>
          )}
        </aside>

        <section className="results-panel">
          <div className="results-header">
            <div>
              <p className="eyebrow">Recommendations</p>
              <h2>
                {view === 'catalog'
                  ? 'Movies Catalog'
                  : mode === 'compass'
                  ? 'Movies tuned to your preferences'
                  : selectedSeedMovie
                    ? `Because you liked ${seedMovieTitle}`
                    : 'Choose a seed movie to unlock recommendations'}
              </h2>
            </div>
            <p className="results-caption">
              {view === 'catalog'
                ? 'Browse a larger movie catalog with continuously loaded cards, making it easier to explore popular titles in one place.'
                : 'The new layout emphasizes hierarchy: one hero recommendation, one spotlight detail panel, and a card grid built for fast scanning.'}
            </p>
          </div>

          <div className="results-overview">
            <section className="spotlight-card">
              <p className="eyebrow">Spotlight</p>
              <h3>{spotlightMovie?.title ?? 'Your next standout pick appears here'}</h3>
              <div className="spotlight-meta">
                <span>{spotlightMovie ? getYear(spotlightMovie.release_date) : 'Year'}</span>
                <span>
                  {spotlightMovie ? `${spotlightMovie.vote_average.toFixed(1)} / 10` : 'Rating'}
                </span>
                <span>{activeMood?.label ?? 'Mood'}</span>
              </div>
              <p>
                {spotlightMovie?.overview ??
                  'Recommendations will surface here with a clearer narrative summary to help the user compare options.'}
              </p>
            </section>

            <section className="summary-card">
              <p className="eyebrow">Active filters</p>
              <div className="summary-list">
                <div>
                  <span>Mode</span>
                  <strong>{mode === 'compass' ? 'Preference compass' : 'Seed movie'}</strong>
                </div>
                <div>
                  <span>Mood</span>
                  <strong>{activeMood?.label ?? 'Not set'}</strong>
                </div>
                <div>
                  <span>Era</span>
                  <strong>{ERAS.find((era) => era.key === selectedEra)?.label ?? 'Any era'}</strong>
                </div>
                <div>
                  <span>Genres</span>
                  <strong>{spotlightGenres.slice(0, 3).join(', ') || 'Open selection'}</strong>
                </div>
              </div>
            </section>
          </div>

          {errorMessage ? <p className="status-banner error">{errorMessage}</p> : null}
          {activeLoading ? (
            <p className="status-banner">
              {view === 'catalog' ? 'Loading TMDB movies...' : 'Loading recommendations...'}
            </p>
          ) : null}
          {!API_KEY ? (
            <p className="status-banner error">
              Add `VITE_TMDB_API_KEY` to a `.env` file to fetch real movie data.
            </p>
          ) : null}

          <div className="movie-grid">
            {activeMovies.map((movie) => (
              <button
                className="movie-card"
                key={movie.id}
                onClick={() => setSelectedMovie(movie)}
                type="button"
              >
                <img alt={`${movie.title} poster`} src={getPoster(movie)} />
                <div className="movie-copy">
                  <div className="movie-meta">
                    <span>{getYear(movie.release_date)}</span>
                    <span>{movie.vote_average.toFixed(1)} / 10</span>
                  </div>
                  <h3>{movie.title}</h3>
                  <p>{movie.overview || 'No plot summary is available for this movie yet.'}</p>
                </div>
              </button>
            ))}
          </div>

          {view === 'catalog' && API_KEY ? (
            <div className="results-footer">
              <button
                className="catalog-button"
                disabled={catalogLoading || !catalogHasMore}
                onClick={() => void loadCatalogPage(catalogPage + 1)}
                type="button"
              >
                {catalogHasMore ? 'Load more' : 'You have reached the loaded TMDB limit'}
              </button>
            </div>
          ) : null}
        </section>
      </section>

      {selectedMovie ? (
        <section className="detail-overlay" role="dialog" aria-modal="true" aria-label="Movie details">
          <button
            aria-label="Close movie details"
            className="detail-backdrop"
            onClick={() => setSelectedMovie(null)}
            type="button"
          />

          <div className="detail-panel">
            <div className="detail-header">
              <p className="eyebrow">Movie catalog</p>
              <button
                className="detail-close"
                onClick={() => setSelectedMovie(null)}
                type="button"
              >
                Close
              </button>
            </div>

            {detailLoading || !movieDetails ? (
              <p className="status-banner">Loading movie details...</p>
            ) : (
              <div className="detail-layout">
                <div className="detail-poster-wrap">
                  <img
                    alt={`${movieDetails.title} poster`}
                    className="detail-poster"
                    src={getPoster(movieDetails)}
                  />
                </div>

                <div className="detail-content">
                  <div className="detail-hero">
                    <h2>{movieDetails.title}</h2>
                    <p className="detail-tagline">
                      {movieDetails.tagline || 'Expanded movie information and streaming details'}
                    </p>
                    <div className="spotlight-meta">
                      <span>{getYear(movieDetails.release_date)}</span>
                      <span>{movieDetails.vote_average.toFixed(1)} / 10</span>
                      <span>{getRuntimeLabel(movieDetails.runtime)}</span>
                      <span>{movieDetails.status}</span>
                    </div>
                    <p>{movieDetails.overview}</p>
                  </div>

                  <div className="detail-grid">
                    <section className="detail-card">
                      <h3>About this movie</h3>
                      <div className="summary-list">
                        <div>
                          <span>Genres</span>
                          <strong>{detailGenres || 'Not available'}</strong>
                        </div>
                        <div>
                          <span>Release year</span>
                          <strong>{getYear(movieDetails.release_date)}</strong>
                        </div>
                        <div>
                          <span>Runtime</span>
                          <strong>{getRuntimeLabel(movieDetails.runtime)}</strong>
                        </div>
                      </div>
                    </section>

                    <section className="detail-card">
                      <h3>Where to watch</h3>
                      <div className="provider-list">
                        <div>
                          <span>Stream</span>
                          <strong>{formatProviders(movieProviders?.flatrate)}</strong>
                        </div>
                        <div>
                          <span>Rent</span>
                          <strong>{formatProviders(movieProviders?.rent)}</strong>
                        </div>
                        <div>
                          <span>Buy</span>
                          <strong>{formatProviders(movieProviders?.buy)}</strong>
                        </div>
                      </div>
                      <p className="provider-note">Availability shown for the United States.</p>
                      {movieProviders?.link ? (
                        <a
                          className="provider-link"
                          href={movieProviders.link}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Open streaming links
                        </a>
                      ) : null}
                    </section>

                    <section className="detail-card">
                      <h3>Main cast</h3>
                      <div className="cast-list">
                        {movieCast.length > 0 ? (
                          movieCast.map((person) => (
                            <div className="cast-item" key={person.id}>
                              <strong>{person.name}</strong>
                              <span>{person.character || 'Cast'}</span>
                            </div>
                          ))
                        ) : (
                          <p>No cast details available.</p>
                        )}
                      </div>
                    </section>

                    <section className="detail-card">
                      <h3>Related movies</h3>
                      <div className="related-grid">
                        {relatedMovies.length > 0 ? (
                          relatedMovies.map((movie) => (
                            <button
                              className="related-card"
                              key={movie.id}
                              onClick={() => setSelectedMovie(movie)}
                              type="button"
                            >
                              <img alt={`${movie.title} poster`} src={getPoster(movie)} />
                              <span>{movie.title}</span>
                            </button>
                          ))
                        ) : (
                          <p>No related movies available.</p>
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : null}
    </main>
  )
}

export default App
