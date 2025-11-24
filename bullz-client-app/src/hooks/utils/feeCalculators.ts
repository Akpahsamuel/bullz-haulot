import type { FeeConfig } from './vaultDataFetchers';

export interface TradingFeeResult {
  feeAmount: string;
  feePercentage: string;
  totalCost: string;
  effectiveFeeBps?: number;
}

export const calculateAntiDumpFee = (
  sellShareBps: number,
  feeConfig: FeeConfig
): number => {
  if (sellShareBps <= feeConfig.dumpThreshold) {
    return feeConfig.baseFee;
  }

  const excessShare = sellShareBps - feeConfig.dumpThreshold;
  const antiDumpExtra = (excessShare * feeConfig.dumpSlope) / 10000;
  const antiDumpTotal = feeConfig.baseFee + antiDumpExtra;

  return Math.min(antiDumpTotal, feeConfig.maxDumpFee);
};

export const calculateSellFee = (
  amountBigInt: bigint,
  circulatingSupply: bigint,
  feeConfig: FeeConfig,
  effectiveFee: number
): number => {
  if (amountBigInt <= 0) {
    return effectiveFee;
  }

  const sellShareBps = Number((amountBigInt * BigInt(10000)) / circulatingSupply);
  return calculateAntiDumpFee(sellShareBps, feeConfig);
};

export const calculateTradingFee = ({
  amount,
  isSell,
  circulatingSupply,
  feeConfig
}: {
  amount: string;
  isSell: boolean;
  circulatingSupply: string;
  feeConfig: FeeConfig & { effectiveFee: number };
}): TradingFeeResult => {
  const amountBigInt = BigInt(amount);
  const circulatingSupplyBigInt = BigInt(circulatingSupply);
  
  let effectiveFee = feeConfig.effectiveFee;

  if (isSell && amountBigInt > 0) {
    effectiveFee = calculateSellFee(amountBigInt, circulatingSupplyBigInt, feeConfig, effectiveFee);
  }

  const feeAmount = (amountBigInt * BigInt(effectiveFee)) / BigInt(10000);
  const totalCost = isSell 
    ? (amountBigInt - feeAmount).toString() 
    : (amountBigInt + feeAmount).toString();

  return {
    feeAmount: feeAmount.toString(),
    feePercentage: (effectiveFee / 100).toFixed(2) + '%',
    totalCost,
    effectiveFeeBps: effectiveFee,
  };
};

export const getDefaultTradingFee = (amount: string): TradingFeeResult => ({
  feeAmount: '0',
  feePercentage: '0%',
  totalCost: amount,
  effectiveFeeBps: 0,
});

export const fetchAndCalculateTradingFee = async ({
  client,
  vaultId,
  amount,
  isSell,
  feeConfig
}: {
  client: any;
  vaultId: string;
  amount: string;
  isSell: boolean;
  feeConfig: any;
}): Promise<TradingFeeResult> => {
  const vaultObject = await client.getObject({
    id: vaultId,
    options: { showContent: true },
  });

  if (!vaultObject.data?.content || vaultObject.data.content.dataType !== 'moveObject') {
    throw new Error('Invalid vault object');
  }

  const fields = vaultObject.data.content.fields as any;
  const circulatingSupply = fields.circulating_supply || '1';

  return calculateTradingFee({
    amount,
    isSell,
    circulatingSupply,
    feeConfig,
  });
};

