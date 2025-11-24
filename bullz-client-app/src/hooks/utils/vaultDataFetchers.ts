export interface FeeConfig {
  baseFee: number; 
  dumpThreshold: number;
  dumpSlope: number;
  maxDumpFee: number;
  surgeFee: number;
  surgeFeeExpiry: number;
  prizePoolBps: number;
  teamBps: number;
}

export interface VaultFeeData extends FeeConfig {
  effectiveFee: number; 
  feePercentage: string; 
}

const DEFAULT_FEE_VALUES: FeeConfig = {
  baseFee: 500,
  dumpThreshold: 200,
  dumpSlope: 20000,
  maxDumpFee: 2500,
  surgeFee: 0,
  surgeFeeExpiry: 0,
  prizePoolBps: 8000,
  teamBps: 2000,
};

const FEE_FIELD_MAPPING: Record<keyof FeeConfig, string> = {
  baseFee: 'base_fee_bps',
  dumpThreshold: 'dump_threshold_bps',
  dumpSlope: 'dump_slope_bps',
  maxDumpFee: 'max_dump_fee_bps',
  surgeFee: 'surge_fee_bps',
  surgeFeeExpiry: 'surge_fee_expiry',
  prizePoolBps: 'prize_pool_bps',
  teamBps: 'team_bps',
};

export const getDefaultFeeConfig = (): VaultFeeData => ({
  ...DEFAULT_FEE_VALUES,
  effectiveFee: 500,
  feePercentage: '5%',
});

const getFieldValue = (fields: any, fieldName: string, defaultValue: number): number => {
  return Number(fields[fieldName] || defaultValue);
};

export const extractFeeConfigFromVaultFields = (fields: any): FeeConfig => {
  const config: Partial<FeeConfig> = {};
  
  for (const [key, fieldName] of Object.entries(FEE_FIELD_MAPPING)) {
    const defaultValue = DEFAULT_FEE_VALUES[key as keyof FeeConfig];
    config[key as keyof FeeConfig] = getFieldValue(fields, fieldName, defaultValue);
  }
  
  return config as FeeConfig;
};

export const calculateEffectiveFee = (feeConfig: FeeConfig): number => {
  const now = Date.now();
  const { surgeFeeExpiry, surgeFee, baseFee } = feeConfig;
  return surgeFeeExpiry > now && surgeFee > baseFee ? surgeFee : baseFee;
};

export const buildVaultFeeData = (feeConfig: FeeConfig): VaultFeeData => {
  const effectiveFee = calculateEffectiveFee(feeConfig);
  const feePercentage = (effectiveFee / 100).toFixed(2) + '%';
  
  return {
    ...feeConfig,
    effectiveFee,
    feePercentage,
  };
};

export const fetchVaultFeeData = async (client: any, vaultId: string): Promise<VaultFeeData> => {
  try {
    const vaultObject = await client.getObject({
      id: vaultId,
      options: { showContent: true },
    });

    if (!vaultObject.data?.content || vaultObject.data.content.dataType !== 'moveObject') {
      throw new Error('Invalid vault object');
    }

    const fields = vaultObject.data.content.fields as any;
    const feeConfig = extractFeeConfigFromVaultFields(fields);
    return buildVaultFeeData(feeConfig);
  } catch (error) {
    console.error('Error fetching vault fees with JSON-RPC:', error);
    return getDefaultFeeConfig();
  }
};

export const fetchVaultObject = async (client: any, vaultId: string) => {
  const vaultObject = await client.getObject({
    id: vaultId,
    options: { showContent: true },
  });

  if (!vaultObject.data?.content || vaultObject.data.content.dataType !== 'moveObject') {
    throw new Error('Invalid vault object');
  }

  return vaultObject.data.content.fields as any;
};

export const isValidTradingFeeParams = (
  feeConfig: any,
  amount: string
): boolean => {
  return !!(feeConfig && amount && amount !== '0');
};

