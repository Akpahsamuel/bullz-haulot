// Main constants object - organized by network
export const CONSTANTS_ID = {
  testnet: {
    packageId: "0x6ed51d0461f15456dc0f6582179d1f86c4d6f2ed79aecf925d5925967f99bc66",
    adminCapId: "0xfa6cc94f71cdaf3e8dc2521b6af06e3a25e926e0a77a51588dd25abf39ca5e0e",
    treasuryCapId: "0xefd572aea76af5856a5d23a488e735625ecdf32dc27300baaf4b361984b744d6",
    adminRegistryId: "0x35fd335b55a379764c9609fe4117f252c8948cbb3082a05b838a5e913a327651",
    assetRegistryId: "0x254a62fea50ffef30659f0b0c121e47095a579db4334b1826c0a4a7edd1e8bfb",
    treasuryId: "0x082832385b7f038c903986e8934406f79f07694d674edad4ddd3bc42b148df46",
    squadRegistryId: "0x654ed4f35c747c2df32580cb38b44574239773cba212c7a9134745aa56103632",
    userRegistryId: "0xda2e106cfb55a5735f4bb06098a42284c31214c3733a6ba144121f5894263694",
    packRegistryId: "0x0ec93b9298226065c4492e4364f56432e506836ac5d04082540b0eb42aee272f",
    competitionStateId: "0x4e444f2893d8e6b7757a9dfb424edf77855621e85e8bae5ef82b4dcac9e1cdda",
    upgradeCapId: "0x7def30ef7fd8d6d3008916146123ad4a029e434f820a594d9ffaecd342ddadcd",
    subscriptionRegistryId: "0x712db8f24062ffd5830880d22cb6347be7ac13f657f3ee9efc4307059bc1c540",
    subscriptionConfigId: "0xc5a84fe4390201cc7747f18a554f760a8be706f9b96f77f4b8c701b3a7add45a",
    tradingSentimentStateId: "0xd4dd03e9a684a711b0d6fc9e6ad0d4b8692a074c6c4abe3264b745e1dc5b6adb",
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



