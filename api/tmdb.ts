const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

export default async function handler(request: Request) {
  const url = new URL(request.url)
  const path = url.searchParams.get('path')
  const readToken = process.env.TMDB_READ_ACCESS_TOKEN
  const apiKey = process.env.TMDB_API_KEY

  if (!path?.startsWith('/')) {
    return new Response(JSON.stringify({ error: 'Invalid TMDB path.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  }

  if (!readToken && !apiKey) {
    return new Response(JSON.stringify({ error: 'Missing TMDB server credentials.' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }

  const tmdbParams = new URLSearchParams(url.searchParams)
  tmdbParams.delete('path')

  if (apiKey && !readToken) {
    tmdbParams.set('api_key', apiKey)
  }

  const response = await fetch(`${TMDB_BASE_URL}${path}?${tmdbParams.toString()}`, {
    headers: readToken
      ? {
          Authorization: `Bearer ${readToken}`,
        }
      : undefined,
  })

  const body = await response.text()

  return new Response(body, {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') ?? 'application/json',
      'cache-control': 's-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
