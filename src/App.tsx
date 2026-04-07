import { startTransition, useDeferredValue, useEffect, useRef, useState } from 'react'
import AuthPage, { STORAGE_KEYS } from './AuthPage'
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
  const [currentUser, setCurrentUser] = useState('')
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
  const [spotlightMovie, setSpotlightMovie] = useState<Movie | null>(null)
  const [movieDetails, setMovieDetails] = useState<MovieDetails | null>(null)
  const [movieCast, setMovieCast] = useState<CastMember[]>([])
  const [movieProviders, setMovieProviders] = useState<WatchProviderRegion | null>(null)
  const [relatedMovies, setRelatedMovies] = useState<Movie[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const deferredQuery = useDeferredValue(seedQuery)
  const sliderRef = useRef<HTMLDivElement | null>(null)
  const [cursorVisible, setCursorVisible] = useState(false)
  const [cursorBig, setCursorBig] = useState(false)
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const savedUser = window.localStorage.getItem(STORAGE_KEYS.currentUser)

    if (savedUser) {
      setCurrentUser(savedUser)
    }
  }, [])

  useEffect(() => {
    if (!currentUser) {
      return
    }

    function handleMove(event: MouseEvent) {
      setCursorVisible(true)
      setCursorPosition({ x: event.clientX, y: event.clientY })
    }

    function handleOver(event: MouseEvent) {
      const target = event.target

      if (!(target instanceof Element)) {
        return
      }

      setCursorBig(Boolean(target.closest('a, button, .shake-card, .ing-card, .hero-pill')))
    }

    function handleOut() {
      setCursorBig(false)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseover', handleOver)
    document.addEventListener('mouseout', handleOut)

    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseover', handleOver)
      document.removeEventListener('mouseout', handleOut)
    }
  }, [currentUser])

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
    if (deferredQuery.trim().length < 2) {
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
  const spotlightGenres = GENRES.filter((genre) =>
    selectedGenres.includes(genre.id),
  ).map((genre) => genre.name)
  const detailGenres = movieDetails?.genres.map((genre) => genre.name).join(', ') ?? ''
  const activeEraLabel =
    ERAS.find((era) => era.key === selectedEra)?.label ?? 'Any era'
  const displayMovie = heroMovie ?? activeMovies[0] ?? null
  const headlineMovie = selectedMovie ?? displayMovie
  const statusText = errorMessage
    ? errorMessage
    : activeLoading
      ? view === 'catalog'
        ? 'Loading the latest catalog drops...'
        : 'Cooking up movie recommendations...'
      : ''

  useEffect(() => {
    if (activeMovies.length === 0) {
      setSpotlightMovie(heroMovie)
      return
    }

    const bestRatedMovie = [...activeMovies].sort(
      (left, right) => right.vote_average - left.vote_average,
    )[0]

    setSpotlightMovie(bestRatedMovie ?? activeMovies[0])
  }, [activeMovies, heroMovie])

  function scrollSlider(direction: number) {
    sliderRef.current?.scrollBy({
      left: direction * 320,
      behavior: 'smooth',
    })
  }

  if (!currentUser) {
    return <AuthPage onAuthSuccess={setCurrentUser} />
  }

  return (
    <main className="app-shell">
      <div
        className={`cursor ${cursorVisible ? 'visible' : ''} ${cursorBig ? 'big' : ''}`}
        id="cursor"
        style={{ left: cursorPosition.x, top: cursorPosition.y }}
      />

      <div className="ticker">
        <div className="ticker-inner">
          <span className="ticker-word pink">MOVIESPHERE</span>
          <span className="ticker-word yellow">FINDS</span>
          <span className="ticker-word cream">YOUR NEXT WATCH</span>
          <span className="ticker-word pink">BY MOOD</span>
          <span className="ticker-word yellow">BY TASTE</span>
          <span className="ticker-word cream">BY CATALOG</span>
          <span className="ticker-sep">✦</span>
          <span className="ticker-word yellow">MOVIESPHERE</span>
          <span className="ticker-word pink">CURATES</span>
          <span className="ticker-word cream">THE NIGHT</span>
          <span className="ticker-word yellow">POPULAR PICKS</span>
          <span className="ticker-word pink">HIDDEN GEMS</span>
          <span className="ticker-word cream">ONE TAP AWAY</span>
          <span className="ticker-sep">✦</span>
        </div>
      </div>

      <nav className="yard-nav">
        <a className="nav-logo" href="#home">
          MovieSphere
        </a>
        <ul className="nav-links">
          <li>
            <a href="#lineup">Lineup</a>
          </li>
          <li>
            <a href="#discover">Discover</a>
          </li>
          <li>
            <button
              className="cart-link"
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
          </li>
          <li>
            <button
              className="ghost-link"
              onClick={() => {
                window.localStorage.removeItem(STORAGE_KEYS.currentUser)
                setCurrentUser('')
              }}
              type="button"
            >
              Logout
            </button>
          </li>
        </ul>
      </nav>

      <section className="hero" id="home">
        <div className="hero-blob"></div>
        <div className="hero-blob2"></div>

        <div className="hero-text">
          <div className="hero-eyebrow">
            <div className="dot"></div>
            <span>{`Welcome back • ${currentUser}`}</span>
          </div>

          <h1 className="hero-h1">
            <span className="pink">YOUR</span>
            <br />
            <span>NEXT</span>
            <br />
            <span className="yellow">MOVIE</span>
          </h1>

          <p className="hero-sub">
            MovieSphere turns a chaotic catalog into something bold, playful, and easy to explore. Start with a vibe, a favorite film, or dive straight into all movies.
          </p>

          <div className="hero-pills">
            {MOODS.map((mood) => (
              <button
                className={selectedMood === mood.key ? 'hero-pill active' : 'hero-pill'}
                key={mood.key}
                onClick={() => {
                  setView('recommendations')
                  setMode('compass')
                  setSelectedMood(mood.key)
                }}
                type="button"
              >
                {mood.label}
              </button>
            ))}
          </div>

          <div className="hero-btns">
            <a className="btn-hero-primary" href="#lineup">
              Browse picks ↓
            </a>
            <a className="btn-hero-secondary" href="#discover">
              Tune the recommendations
            </a>
          </div>

          <div className="hero-mini-stats">
            <div className="hms-chip">
              <div>
                <div className="hms-val">{view === 'catalog' ? `${catalogPage}` : '2'}</div>
                <div className="hms-lbl">{view === 'catalog' ? 'Catalog page' : 'Discovery modes'}</div>
              </div>
            </div>
            <div className="hms-chip">
              <div>
                <div className="hms-val">{activeEraLabel}</div>
                <div className="hms-lbl">Current era</div>
              </div>
            </div>
            <div className="hms-chip">
              <div>
                <div className="hms-val">{activeMovies.length || 0}</div>
                <div className="hms-lbl">Cards in view</div>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-img-wrap">
          <div className="hero-img-ring">
            <img
              alt={displayMovie ? `${displayMovie.title} poster` : 'Movie poster'}
              id="heroShakeImg"
              src={displayMovie ? getPoster(displayMovie) : 'https://placehold.co/500x750/1b1a18/f4efe6?text=MovieSphere'}
            />
          </div>
          <div className="hero-badge">{view === 'catalog' ? 'All movies' : activeMood?.label ?? 'Movie vibe'}</div>
        </div>
      </section>

      <div className="stats-strip">
        <div className="stat">
          <div className="stat-num">{spotlightGenres.length || 3}</div>
          <div className="stat-label">Genre signals</div>
        </div>
        <div className="stat">
          <div className="stat-num">{activeMovies.length}</div>
          <div className="stat-label">Visible cards</div>
        </div>
        <div className="stat">
          <div className="stat-num">{selectedMovie ? 'OPEN' : 'READY'}</div>
          <div className="stat-label">Detail overlay</div>
        </div>
      </div>

      <section className="discover-console" id="discover">
        <div className="section-header">
          <h2>
            TUNE THE
            <br />
            <em>DISCOVERY</em>
          </h2>
          <p>
            Shift between guided recommendations and the broader movie catalog without leaving the same energetic interface.
          </p>
        </div>

        <div className="discover-grid">
          <div className="discover-card">
            <div className="mode-switch" role="tablist" aria-label="Recommendation mode">
              <button
                className={mode === 'compass' ? 'active' : ''}
                onClick={() => {
                  setView('recommendations')
                  setMode('compass')
                }}
                type="button"
              >
                Preference compass
              </button>
              <button
                className={mode === 'seed' ? 'active' : ''}
                onClick={() => {
                  setView('recommendations')
                  setMode('seed')
                }}
                type="button"
              >
                Start from a movie
              </button>
            </div>

            {mode === 'compass' ? (
              <>
                <label className="panel-label">Genres</label>
                <div className="chip-grid">
                  {GENRES.map((genre) => (
                    <button
                      className={selectedGenres.includes(genre.id) ? 'chip active' : 'chip'}
                      key={genre.id}
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
                      className={selectedEra === era.key ? 'pill active' : 'pill'}
                      key={era.key}
                      onClick={() => setSelectedEra(era.key)}
                      type="button"
                    >
                      {era.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <label className="panel-label" htmlFor="seed-search">
                  Search a favorite movie
                </label>
                <input
                  className="search-input"
                  id="seed-search"
                  onChange={(event) => setSeedQuery(event.target.value)}
                  placeholder="Try Interstellar, Dune, La La Land..."
                  type="text"
                  value={seedQuery}
                />

                {searchResults.length > 0 ? (
                  <div className="search-results">
                    {searchResults.map((movie) => (
                      <button
                        className={
                          selectedSeedMovie?.id === movie.id
                            ? 'search-result active'
                            : 'search-result'
                        }
                        key={movie.id}
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
              </>
            )}
          </div>

          <div className="discover-card spotlight-card">
            <p className="eyebrow">Spotlight</p>
            <h3>{headlineMovie?.title ?? 'Movie spotlight loading'}</h3>
            <div className="spotlight-meta">
              <span>{headlineMovie ? getYear(headlineMovie.release_date) : 'Year'}</span>
              <span>{headlineMovie ? `${headlineMovie.vote_average.toFixed(1)} / 10` : 'Rating'}</span>
              <span>{view === 'catalog' ? 'Catalog mode' : activeMood?.label ?? 'Movie vibe'}</span>
            </div>
            <p>
              {headlineMovie?.overview ??
                'A featured movie summary appears here to give the page a strong editorial anchor.'}
            </p>
          </div>
        </div>
      </section>

      <section className="slider-section" id="lineup">
        <div className="section-header">
          <h2>
            THE
            <br />
            <em>LINEUP</em>
          </h2>
          <p>
            {view === 'catalog'
              ? 'Browse a wider stream of popular titles from TMDB and open any card for the full movie breakdown.'
              : mode === 'seed'
                ? seedMovieTitle
                  ? `Because you picked ${seedMovieTitle}, here is a sharper lineup of related titles.`
                  : 'Start from one movie you already trust, then let MovieSphere build the next row for you.'
                : 'These cards are tuned by mood, genres, and era so you can compare strong options quickly.'}
          </p>
        </div>

        {statusText ? (
          <p className={`status-banner ${errorMessage ? 'error' : ''}`}>{statusText}</p>
        ) : null}

        <div className="slider-viewport">
          <div className="slider-track" ref={sliderRef}>
            {activeMovies.map((movie, index) => (
              <button
                className={`shake-card ${index % 5 === 0 ? 'card-strawberry' : index % 5 === 1 ? 'card-coconut' : index % 5 === 2 ? 'card-blueberry' : index % 5 === 3 ? 'card-banana' : 'card-grapefruit'}`}
                key={movie.id}
                onClick={() => setSelectedMovie(movie)}
                type="button"
              >
                <span className="card-chip">{view === 'catalog' ? 'Catalog' : activeMood?.label ?? 'Pick'}</span>
                <img alt={`${movie.title} poster`} className="card-img" src={getPoster(movie)} />
                <div className="card-bottom">
                  <div className="card-name">{movie.title}</div>
                  <div className="card-desc">
                    {movie.overview || 'No plot summary is available for this movie yet.'}
                  </div>
                  <div className="card-footer">
                    <div className="card-price">{movie.vote_average.toFixed(1)} ★</div>
                    <span className="card-btn">OPEN +</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="slider-controls">
          <button className="ctrl-btn" onClick={() => scrollSlider(-1)} type="button">
            ←
          </button>
          <button className="ctrl-btn" onClick={() => scrollSlider(1)} type="button">
            →
          </button>
          {view === 'catalog' ? (
            <button
              className="catalog-button inline"
              disabled={catalogLoading || !catalogHasMore}
              onClick={() => void loadCatalogPage(catalogPage + 1)}
              type="button"
            >
              {catalogHasMore ? 'Load more' : 'No more pages'}
            </button>
          ) : null}
        </div>
      </section>

      <section className="newsletter">
        <div className="newsletter-inner">
          <div className="nl-left">
            <div className="nl-tag">🎬 Join the sphere</div>
            <h2>
              SAVE YOUR
              <br />
              TASTE.
              <br />
              BROWSE.
            </h2>
            <div className="nl-proof">
              <div className="nl-avatars">
                <div className="nl-avatar av1">M</div>
                <div className="nl-avatar av2">S</div>
                <div className="nl-avatar av3">P</div>
                <div className="nl-avatar av4">R</div>
              </div>
              <div className="nl-proof-text">
                <strong>{currentUser}</strong>
                is already exploring with MovieSphere
              </div>
            </div>
          </div>
          <div className="nl-right">
            <div className="nl-perks">
              <div className="nl-perk">
                <div className="nl-perk-icon">🔥</div>
                <span>Jump between recommendations and catalog browsing instantly</span>
              </div>
              <div className="nl-perk">
                <div className="nl-perk-icon">📺</div>
                <span>Open movie details and streaming availability in one tap</span>
              </div>
              <div className="nl-perk">
                <div className="nl-perk-icon">🧠</div>
                <span>Use mood, era, and taste to guide discovery instead of endless scrolling</span>
              </div>
            </div>
            <div className="nl-form">
              <input className="nl-input" readOnly type="text" value={`Logged in as ${currentUser}`} />
              <button
                className="nl-btn"
                onClick={() => {
                  setView('catalog')

                  if (catalogMovies.length === 0) {
                    void loadCatalogPage(1, true)
                  }
                }}
                type="button"
              >
                OPEN CATALOG ↗
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="lifestyle">
        <div className="lifestyle-inner">
          <div className="lifestyle-img-wrap">
            <div className="lifestyle-img-frame">
              <img
                alt={spotlightMovie ? `${spotlightMovie.title} poster` : 'MovieSphere pick'}
                src={spotlightMovie ? getPoster(spotlightMovie) : 'https://placehold.co/700x900/16131f/fef5e7?text=MovieSphere'}
              />
            </div>
            <div className="ls-badge">{spotlightMovie ? getYear(spotlightMovie.release_date) : 'Featured'}</div>
          </div>
          <div className="lifestyle-content">
            <div className="ls-kicker">movie night guide</div>
            <h2 className="ls-title">
              REFINE.
              <br />
              COMPARE.
              <br />
              WATCH.
            </h2>
            <p className="ls-copy">
              {spotlightMovie?.overview ??
                'Use the spotlight card to anchor your choice, then open the detail view whenever you want cast, runtime, and streaming availability.'}
            </p>
            <ul className="ls-features">
              <li>
                <div className="ls-dot"></div>
                <strong>Current mode</strong> — {view === 'catalog' ? 'All movies catalog' : mode === 'compass' ? 'Preference compass' : 'Seed recommendation'}
              </li>
              <li>
                <div className="ls-dot"></div>
                <strong>Era focus</strong> — {activeEraLabel}
              </li>
              <li>
                <div className="ls-dot"></div>
                <strong>Genre signal</strong> — {spotlightGenres.slice(0, 3).join(', ') || 'Open selection'}
              </li>
            </ul>
            <div className="ls-btns">
              <a className="ls-btn-s" href="#discover">
                Adjust filters
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="footer-inner">
          <div className="footer-logo-wrap">
            <a className="footer-logo-text" href="#home">
              MovieSphere
            </a>
            <span className="footer-dev-label">Recommendation interface</span>
          </div>

          <div className="footer-links">
            <a href="#discover">Discover</a>
            <a href="#lineup">Lineup</a>
            <a href="#home">Back to top</a>
          </div>

          <div className="footer-contact">
            <button
              className="footer-contact-btn btn-codepen"
              onClick={() => {
                setView('recommendations')
                setMode('seed')
              }}
              type="button"
            >
              Seed mode
            </button>
            <button
              className="footer-contact-btn btn-email"
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
        </div>
      </footer>

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
