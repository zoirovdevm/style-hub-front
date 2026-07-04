const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL ?? 'http://localhost:4000/graphql';

/**
 * Server-side GraphQL fetch used inside React Server Components so
 * SEO-critical pages (home, shop, product detail, categories) render
 * with real content on the first response instead of a client-only
 * loading state. Interactive/authenticated data (cart, wishlist, admin)
 * still goes through Apollo Client on the client.
 */
export async function serverFetchGraphQL<T = any>(
  query: string,
  variables?: Record<string, unknown>,
  revalidate = 60,
): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    next: { revalidate },
  });

  const json = await res.json();
  if (json.errors) {
    // eslint-disable-next-line no-console
    console.error('GraphQL server-fetch error:', json.errors);
    throw new Error(json.errors[0]?.message ?? 'GraphQL error');
  }
  return json.data as T;
}
