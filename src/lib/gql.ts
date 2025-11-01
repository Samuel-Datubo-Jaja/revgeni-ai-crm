import { GraphQLClient } from "graphql-request";

/**
 * Returns a GraphQL client that works in both browser and server.
 * In the browser, if NEXT_PUBLIC_GRAPHQL_URL isn't set, we fall back to window.location.origin.
 */
export function getGqlClient() {
  const envUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL;

  const url =
    typeof window !== "undefined"
      ? envUrl ?? `${window.location.origin}/api/graphql`
      : envUrl ?? "http://localhost:3000/api/graphql";

  return new GraphQLClient(url);
}



