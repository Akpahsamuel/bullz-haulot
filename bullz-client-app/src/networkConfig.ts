import { getFullnodeUrl } from "@mysten/sui/client";
import { createNetworkConfig } from "@mysten/dapp-kit";
import { CONSTANTS_ID } from "./constantsId";
import type { KeyServerConfig } from '@mysten/seal';

const { networkConfig, useNetworkVariable, useNetworkVariables } =
  createNetworkConfig({
    testnet: {
      url: getFullnodeUrl("testnet"),
      // graphqlUrl: "https://graphql.testnet.sui.io/graphql", // Removed - using single RPC endpoint
      variables: {
        packageId: CONSTANTS_ID.testnet.packageId,
        adminCapId: CONSTANTS_ID.testnet.adminCapId,
        treasuryCapId: CONSTANTS_ID.testnet.treasuryCapId,
        adminRegistryId: CONSTANTS_ID.testnet.adminRegistryId,
        assetRegistryId: CONSTANTS_ID.testnet.assetRegistryId,
        treasuryId: CONSTANTS_ID.testnet.treasuryId,
        squadRegistryId: CONSTANTS_ID.testnet.squadRegistryId,
        userRegistryId: CONSTANTS_ID.testnet.userRegistryId,
        packRegistryId: CONSTANTS_ID.testnet.packRegistryId,
        competitionStateId: CONSTANTS_ID.testnet.competitionStateId,
        upgradeCapId: CONSTANTS_ID.testnet.upgradeCapId,
        subscriptionRegistryId: CONSTANTS_ID.testnet.subscriptionRegistryId || '0xTODO',
        subscriptionConfigId: CONSTANTS_ID.testnet.subscriptionConfigId || '0xTODO',
        tradingSentimentStateId: CONSTANTS_ID.testnet.tradingSentimentStateId || '0xTODO',
        sealPackageId: import.meta.env.VITE_SEAL_PACKAGE_ID || CONSTANTS_ID.testnet.packageId,
        sealServerConfigs: getSealServerConfigs(),

      },
    },
    // Commented out devnet - using testnet instead
    // devnet: {
    //   url: getFullnodeUrl("devnet"),
    //   graphqlUrl: "https://graphql.devnet.sui.io/graphql",
    //   variables: {
    //     packageId: CONSTANTS_ID.devnet.packageId,
    //     adminCapId: CONSTANTS_ID.devnet.adminCapId,
    //     treasuryCapId: CONSTANTS_ID.devnet.treasuryCapId,
    //     adminRegistryId: CONSTANTS_ID.devnet.adminRegistryId,
    //     assetRegistryId: CONSTANTS_ID.devnet.assetRegistryId,
    //     treasuryId: CONSTANTS_ID.devnet.treasuryId,
    //     squadRegistryId: CONSTANTS_ID.devnet.squadRegistryId,
    //     userRegistryId: CONSTANTS_ID.devnet.userRegistryId,
    //     packRegistryId: CONSTANTS_ID.devnet.packRegistryId,
    //     competitionStateId: CONSTANTS_ID.devnet.competitionStateId,
    //     upgradeCapId: CONSTANTS_ID.devnet.upgradeCapId,
    //     subscriptionRegistryId: CONSTANTS_ID.devnet.subscriptionRegistryId,
    //     subscriptionConfigId: CONSTANTS_ID.devnet.subscriptionConfigId,
    //     tradingSentimentStateId: CONSTANTS_ID.devnet.tradingSentimentStateId,
    //   },
    // },
    mainnet: {
      url: getFullnodeUrl("mainnet"),
      // graphqlUrl: "https://graphql.mainnet.sui.io/graphql", // Removed - using single RPC endpoint
      variables: {
        packageId: CONSTANTS_ID.mainnet.packageId,
        adminCapId: CONSTANTS_ID.mainnet.adminCapId,
        treasuryCapId: CONSTANTS_ID.mainnet.treasuryCapId,
        adminRegistryId: CONSTANTS_ID.mainnet.adminRegistryId,
        assetRegistryId: CONSTANTS_ID.mainnet.assetRegistryId,
        treasuryId: CONSTANTS_ID.mainnet.treasuryId,
        squadRegistryId: CONSTANTS_ID.mainnet.squadRegistryId,
        userRegistryId: CONSTANTS_ID.mainnet.userRegistryId,
        packRegistryId: CONSTANTS_ID.mainnet.packRegistryId,
        competitionStateId: CONSTANTS_ID.mainnet.competitionStateId,
        upgradeCapId: CONSTANTS_ID.mainnet.upgradeCapId,
        subscriptionRegistryId: CONSTANTS_ID.mainnet.subscriptionRegistryId || '0xTODO',
        subscriptionConfigId: CONSTANTS_ID.mainnet.subscriptionConfigId || '0xTODO',
        tradingSentimentStateId: CONSTANTS_ID.mainnet.tradingSentimentStateId || '0xTODO',
        sealPackageId: import.meta.env.VITE_SEAL_PACKAGE_ID || CONSTANTS_ID.mainnet.packageId,
        sealServerConfigs: getSealServerConfigs(),

      },
    },
  });

function getSealServerConfigs(): KeyServerConfig[] {
  try {
    const configString = import.meta.env.VITE_SEAL_SERVER_CONFIGS || '[]';
    const configs = JSON.parse(configString);
    
   
    if (!Array.isArray(configs)) {
      console.warn('VITE_SEAL_SERVER_CONFIGS must be an array');
      return [];
    }
    
    for (const config of configs) {
      if (!config.objectId || typeof config.objectId !== 'string') {
        console.warn('Invalid Seal server config: missing objectId');
        return [];
      }
      if (typeof config.weight !== 'number' || config.weight < 1) {
        console.warn('Invalid Seal server config: weight must be >= 1');
        return [];
      }
    }
    
    return configs;
  } catch (error) {
    console.warn('Failed to parse Seal server configs:', error);
    return [];
  }
}

export { useNetworkVariable, useNetworkVariables, networkConfig };
