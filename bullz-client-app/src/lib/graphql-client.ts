import { GraphQLClient } from 'graphql-request';

// Sui GraphQL endpoints
const GRAPHQL_ENDPOINTS = {
  mainnet: 'https://graphql.mainnet.sui.io/graphql',
  testnet: 'https://graphql.testnet.sui.io/graphql',

  // devnet: 'https://graphql.devnet.sui.io/graphql',
} as const;

type NetworkType = keyof typeof GRAPHQL_ENDPOINTS;

// Create GraphQL clients for each network
const clients = {
  mainnet: new GraphQLClient(GRAPHQL_ENDPOINTS.mainnet),
  testnet: new GraphQLClient(GRAPHQL_ENDPOINTS.testnet),
  // Commented out devnet - using testnet instead
  // devnet: new GraphQLClient(GRAPHQL_ENDPOINTS.devnet),
};

// Function to get the appropriate GraphQL client based on network
export function getGraphQLClient(network: NetworkType = 'testnet'): GraphQLClient {
  // Use testnet as fallback if network not found
  if (!clients[network]) {
    return clients.testnet;
  }
  return clients[network];
}

// Export individual clients for direct use
export const mainnetClient = clients.mainnet;
export const testnetClient = clients.testnet;

// export const devnetClient = clients.devnet;
export const devnetClient = clients.testnet; // Alias to testnet

// Default client (testnet for development)
export const defaultGraphQLClient = testnetClient;
