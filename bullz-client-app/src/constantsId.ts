// Main constants object - organized by network
export const CONSTANTS_ID = {
  testnet: {
    packageId: "0xb89df460e30e5a2049b5c7d2f50aaf5a12ebbf474515d7fddeeb8da7c833643e",
    adminCapId: "0x8039eea7668ae929461e0647fead2faee972387aae95539edb2b0e5840a8081a",
    treasuryCapId: "0xfa7efe46c47dd6f2b28c7726034ada3c00a3b350557a26de2aa1840f6e5377c6",
    adminRegistryId: "0xc9dedf583503435511fcb236e15ff4ea2b212be3e91e3787eef74de3acb7f65a",
    assetRegistryId: "0x7eb353957d9fd9f9d7d5abc4e0f5bec19899a9feaafa46d8158b8d0a2bcfb4ee",
    treasuryId: "0xb90aac52d11ee3004461f38109fe71aa4934c239924c9a058bc59fbb9a0028ea",
    squadRegistryId: "0xaa98dfcd4e3e3f6d72c13415601865158e9c92a34ebca3923744119eb55baccc",
    userRegistryId: "0x378fca67e41c501b7d155b77113aaf7c884258901672e58e4e2cd58d80d10c5c",
    packRegistryId: "0xbf42a25bdf9d6cbf736ffc8ebb95c4cedb201268c069cc46c0a84d966f0c1003",
    competitionStateId: "0x067fbae477b8842bf845f0542d9f37f103ff16fce82f3ccfdc6cf192e024efbb",
    upgradeCapId: "0xe1fbb913f363ffc6d268a474431710b5264f70b82e2e52243010f0d48ba21591",
    subscriptionRegistryId: "0x91c4ef5f98ed767bfef6f685b07a2da989d033ed9fd2fff266f98b3dbbc401f1",
    subscriptionConfigId: "0x12a609d76926ad1c2e2a34d3b3ed3c6717ce984be9d051d23ae03ce9b5074ac9",
    tradingSentimentStateId: "0xefcc2e74b435f80be50088931e1cddeddd00b9f25236442c0d61780b663f1c46",
  },
  devnet: {
    packageId: "0x26eece883f8d4e067d4af4a9a793d73ac9f2d45dfbdd3cc201891669d05a3a0d",
    adminCapId: "0x852b598f091d1d0bc88ffb5a41c6dc6982dc770d5dd03651bb14b3eb36a73564",
    treasuryCapId: "0xf765dd7000170311eab275383e8f44bd99b9178a55f294679efb4a1cf70792ae",
    adminRegistryId: "0xd7767bf15e6af8a4ab86fc6bf92b77836f91f9e4ff2a2984b76288c75605a867",
    assetRegistryId: "0x68a8f65a0084a870e7c3b35576e809c9432ef575d4034cd9909631218c9d97f6",
    treasuryId: "0x5c9f73b42a112e90fb09cfacf9915198ef8749139d951f64a40f8d064a6542a4",
    squadRegistryId: "0x2f67f81ba32365c0233fde05a2c82563532d623d009baa32ec309c4cfdffc158",
    userRegistryId: "0xdab64f57f42bd6471a82ac3cab21d090311ac5c98ac297a75569ec82fd84d434",
    packRegistryId: "0xcffdc9ac648f4ca5a719e749858d534941ab70838e4aa9285b2f086b6690fba4",
    competitionStateId: "0x79b068d05bf218fa887124de565881f913d9daf0c153a0b0b62ffba9c9df9a18",
    upgradeCapId: "0xde29a994acc49afb8e0d16d7b1ef06e57a173626c371137820fe0de425a89328",
    subscriptionRegistryId: "0xda924fc1d7fb5df0cd4e9b1d2d33232c11bd7a49fd38b3b9355374bb487f1bda",
    subscriptionConfigId: "0xabfe4fb5f970c9cd4896e529bfde81d65136f638a21066016729dab382c834bf",
    tradingSentimentStateId: "0xd9e2813119db8d67dbf208550993e03f5ff14728902d948ba5a6c86613858ce5",
  },
  mainnet: {
    packageId: "0xTODO",
    adminCapId: "0xTODO",
    treasuryCapId: "0xTODO",
    adminRegistryId: "0xTODO",
    assetRegistryId: "0xTODO",
    treasuryId: "0xTODO",
    squadRegistryId: "0xTODO",
    userRegistryId: "0xTODO",
    packRegistryId: "0xTODO",
    competitionStateId: "0xTODO",
    upgradeCapId: "0xTODO",
    subscriptionRegistryId: "0xTODO",
    subscriptionConfigId: "0xTODO",
    tradingSentimentStateId: "0xTODO",
  },
};

// Individual exports for backward compatibility (derived from CONSTANTS_ID)
export const TESTNET_PACKAGE_ID = CONSTANTS_ID.testnet.packageId;
export const DEVNET_PACKAGE_ID = CONSTANTS_ID.devnet.packageId;
export const MAINNET_PACKAGE_ID = CONSTANTS_ID.mainnet.packageId;

export const TESTNET_ADMIN_CAP = CONSTANTS_ID.testnet.adminCapId;
export const DEVNET_ADMIN_CAP = CONSTANTS_ID.devnet.adminCapId;
export const MAINNET_ADMIN_CAP = CONSTANTS_ID.mainnet.adminCapId;

export const TESTNET_TREASURY_CAP = CONSTANTS_ID.testnet.treasuryCapId;
export const DEVNET_TREASURY_CAP = CONSTANTS_ID.devnet.treasuryCapId;
export const MAINNET_TREASURY_CAP = CONSTANTS_ID.mainnet.treasuryCapId;

export const TESTNET_SQUAD_REGISTRY = CONSTANTS_ID.testnet.squadRegistryId;
export const DEVNET_SQUAD_REGISTRY = CONSTANTS_ID.devnet.squadRegistryId;
export const MAINNET_SQUAD_REGISTRY = CONSTANTS_ID.mainnet.squadRegistryId;

export const TESTNET_USER_REGISTRY = CONSTANTS_ID.testnet.userRegistryId;
export const DEVNET_USER_REGISTRY = CONSTANTS_ID.devnet.userRegistryId;
export const MAINNET_USER_REGISTRY = CONSTANTS_ID.mainnet.userRegistryId;

export const TESTNET_ASSET_REGISTRY = CONSTANTS_ID.testnet.assetRegistryId;
export const DEVNET_ASSET_REGISTRY = CONSTANTS_ID.devnet.assetRegistryId;
export const MAINNET_ASSET_REGISTRY = CONSTANTS_ID.mainnet.assetRegistryId;

export const TESTNET_PACK_REGISTRY = CONSTANTS_ID.testnet.packRegistryId;
export const DEVNET_PACK_REGISTRY = CONSTANTS_ID.devnet.packRegistryId;
export const MAINNET_PACK_REGISTRY = CONSTANTS_ID.mainnet.packRegistryId;

export const TESTNET_TREASURY = CONSTANTS_ID.testnet.treasuryId;
export const DEVNET_TREASURY = CONSTANTS_ID.devnet.treasuryId;
export const MAINNET_TREASURY = CONSTANTS_ID.mainnet.treasuryId;

export const TESTNET_COMPETITION_STATE = CONSTANTS_ID.testnet.competitionStateId;
export const DEVNET_COMPETITION_STATE = CONSTANTS_ID.devnet.competitionStateId;
export const MAINNET_COMPETITION_STATE = CONSTANTS_ID.mainnet.competitionStateId;

export const TESTNET_ADMIN_REGISTRY = CONSTANTS_ID.testnet.adminRegistryId;
export const DEVNET_ADMIN_REGISTRY = CONSTANTS_ID.devnet.adminRegistryId;
export const MAINNET_ADMIN_REGISTRY = CONSTANTS_ID.mainnet.adminRegistryId;

export const TESTNET_UPGRADE_CAP = CONSTANTS_ID.testnet.upgradeCapId;
export const DEVNET_UPGRADE_CAP = CONSTANTS_ID.devnet.upgradeCapId;
export const MAINNET_UPGRADE_CAP = CONSTANTS_ID.mainnet.upgradeCapId;

// Helper function to get the correct ID based on network
export const getNetworkSpecificId = (network: 'testnet' | 'mainnet', idType: string): string => {
 
  const networkConstants = CONSTANTS_ID[network];
  
  switch (idType) {
    case 'package':
      return networkConstants.packageId;
    case 'admin':
      return networkConstants.adminCapId;
    case 'treasuryCap':
      return networkConstants.treasuryCapId;
    case 'squadRegistry':
      return networkConstants.squadRegistryId;
    case 'userRegistry':
      return networkConstants.userRegistryId;
    case 'assetRegistry':
      return networkConstants.assetRegistryId;
    case 'packRegistry':
      return networkConstants.packRegistryId;
    case 'treasury':
      return networkConstants.treasuryId;
    case 'competitionState':
      return networkConstants.competitionStateId;
    case 'adminRegistry':
      return networkConstants.adminRegistryId;
    case 'upgradeCap':
      return networkConstants.upgradeCapId;
    case 'subscriptionRegistry':
      return networkConstants.subscriptionRegistryId;
    case 'subscriptionConfig':
      return networkConstants.subscriptionConfigId;
    case 'tradingSentimentState':
      return networkConstants.tradingSentimentStateId;
    default:
      return '';
  }
};



