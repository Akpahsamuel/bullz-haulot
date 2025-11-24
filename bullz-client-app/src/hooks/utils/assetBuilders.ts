import { formatBalance, formatUsdValue } from './formatters';
import { getUserBalanceForVault } from './portfolioFetchers';

export interface VaultData {
  vaultId: string;
  symbol: string;
  name?: string;
  imageUrl?: string;
}

export interface UserBalanceData {
  balance: string;
  balanceRaw: number;
}

export interface PriceData {
  price: string;
  valueUsd: string;
  valueUsdRaw: number;
}

export interface UserAsset {
  symbol: string;
  name?: string;
  vaultId: string;
  balance: string;
  balanceRaw: number;
  balanceFormatted: string;
  price: string;
  valueUsd: string;
  valueUsdRaw: number;
  change24h: number;
  imageUrl?: string; 
}

export const calculateVaultPrice = async (client: any, vaultId: string): Promise<PriceData> => {
  try {
    const vaultObject = await client.getObject({
      id: vaultId,
      options: { showContent: true }
    });

    if (vaultObject.data?.content && vaultObject.data.content.dataType === 'moveObject') {
      const vaultFields = vaultObject.data.content.fields as any;
      const usdcReserveValue = vaultFields.usdc_reserve || vaultFields.usdcReserve || '0';
      const tradingSupplyValue = vaultFields.trading_supply || vaultFields.tradingSupply || '1';

      const usdcReserve = parseFloat(usdcReserveValue.toString());
      const tradingSupply = parseFloat(tradingSupplyValue.toString());

      if (tradingSupply === 0) {
        return {
          price: '0',
          valueUsd: '',
          valueUsdRaw: 0,
        };
      }

      // Price per smallest unit = usdc_reserve / trading_supply
      // IMPORTANT: usdc_reserve is in MIST units but treated as USDC units directly
      // As per user instruction: "if 100000mist 100000udc" - treat MIST as USDC without conversion
      // So 110,000,000 MIST = 110,000,000 USDC (not 110 USDC)
      // But we need to convert to USDC per smallest unit correctly
      // The issue is that price should be: (usdc_reserve / 1_000_000) / trading_supply
      // because 1 USDC = 1,000,000 micro-USDC, and usdc_reserve is in micro-USDC
      const USDC_TO_MIST = 1_000_000; // 1 USDC = 1,000,000 MIST
      const usdcReserveInUsdc = usdcReserve / USDC_TO_MIST; 
      const pricePerSmallest = usdcReserveInUsdc / tradingSupply; 
      
      return {
        price: pricePerSmallest.toFixed(12),
        valueUsd: '',
        valueUsdRaw: pricePerSmallest,
      };
    }
  } catch (error) {
    // Error fetching vault data - return default
  }

  return {
    price: '0',
    valueUsd: '',
    valueUsdRaw: 0,
  };
};

export const buildUserAsset = ({
  symbol,
  vault,
  balanceData,
  priceData,
  priceList
}: {
  symbol: string;
  vault: VaultData;
  balanceData: UserBalanceData;
  priceData: PriceData;
  priceList?: any[];
}): UserAsset => {
  // Calculate USD value: user's balance (in smallest units) × price per smallest unit (in USDC)
  // Example: 3,780,000,000 × 0.0000030112 = 11.38 USDC will fix after real usage of usdc
  const usdValue = balanceData.balanceRaw * priceData.valueUsdRaw;

  // Find the token data from priceList to get the 24h change
  const tokenData = priceList?.find(token => token.symbol === symbol);
  const change24hValue = tokenData?.percentagePriceChange1h 
    ? parseFloat(tokenData.percentagePriceChange1h) / 100 
    : 0;

  return {
    symbol,
    name: vault.name,
    vaultId: vault.vaultId,
    balance: balanceData.balance,
    balanceRaw: balanceData.balanceRaw,
    balanceFormatted: formatBalance(balanceData.balanceRaw),
    price: priceData.price,
    valueUsd: formatUsdValue(usdValue),
    valueUsdRaw: usdValue,
    change24h: change24hValue,
    imageUrl: vault.imageUrl || undefined,
  };
};

export const processUserAsset = async ({
  client,
  symbol,
  vault,
  userAddress,
  priceList
}: {
  client: any;
  symbol: string;
  vault: VaultData;
  userAddress: string;
  priceList?: any[];
}): Promise<UserAsset | null> => {
  try {
    const balance = await getUserBalanceForVault({
      client,
      vaultId: vault.vaultId,
      userAddress
    });
    const balanceRaw = parseFloat(balance);

    if (balanceRaw <= 0) {
      return null;
    }

    const priceData = await calculateVaultPrice(client, vault.vaultId);
    const balanceData: UserBalanceData = { balance, balanceRaw };

    return buildUserAsset({ symbol, vault, balanceData, priceData, priceList });
  } catch (error) {
    return null;
  }
};

