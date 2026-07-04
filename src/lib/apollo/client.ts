import { ApolloClient, InMemoryCache, HttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { useAuthStore } from '../store/auth-store';

const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL ?? 'http://localhost:4000/graphql',
});

const authLink = setContext((_, { headers }) => {
  const token = typeof window !== 'undefined' ? useAuthStore.getState().accessToken : null;
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message }) => {
      // eslint-disable-next-line no-console
      console.error('[GraphQL error]:', message);
    });
  }
  if (networkError) {
    // eslint-disable-next-line no-console
    console.error('[Network error]:', networkError);
  }
});

export function createApolloClient() {
  return new ApolloClient({
    link: from([errorLink, authLink, httpLink]),
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            products: {
              keyArgs: ['filter', ['categorySlug', 'brandSlug', 'search', 'sort']],
            },
          },
        },
      },
    }),
  });
}
