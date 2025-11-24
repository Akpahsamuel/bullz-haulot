/**
 * Vault data fetching utilities
 * Low-level functions for fetching and processing vault data from Sui blockchain
 */

export interface VaultData {
  symbol: string;
  vaultId: string;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  circulatingSupply: string;
  supplyCap: string;
  tradingEnabled: boolean;
  decimals: number;
}

export interface VaultDataParams {
  symbol: string;
  vaultId: string;
  vaultFields: any;
}

export interface BalanceQueryParams {
  balancesTableId: string;
  userAddress: string;
}

function validateRegistryObject(registryObject: any): any {
  if (!registryObject.data?.content || registryObject.data.content.dataType !== 'moveObject') {
    throw new Error('Invalid registry object');
  }
  return registryObject.data.content.fields;
}

function extractVaultsTableId(fields: any): string {
  const vaultsTableId = fields.vaults?.fields?.id?.id;
  if (!vaultsTableId) {
    throw new Error('Vaults table not found');
  }
  return vaultsTableId;
}

export async function getVaultsTableId(client: any, assetRegistryId: string): Promise<string> {
  const registryObject = await client.getObject({
    id: assetRegistryId,
    options: {
      showContent: true,
    },
  });

  const fields = validateRegistryObject(registryObject);
  return extractVaultsTableId(fields);
}

export async function getObjectFields(client: any, objectId: string, throwOnError = false): Promise<any | null> {
  const object = await client.getObject({
    id: objectId,
    options: {
      showContent: true,
    },
  });

  if (!object.data?.content || object.data.content.dataType !== 'moveObject') {
    if (throwOnError) {
      throw new Error('Invalid object');
    }
    return null;
  }

  return object.data.content.fields;
}

export async function getFieldObject(client: any, field: any): Promise<{ vaultId: string; symbol: string } | null> {
  const fieldData = await getObjectFields(client, field.objectId);
  if (!fieldData) {
    return null;
  }

  const vaultId = fieldData.value;
  const symbol = field.name?.value as string;

  return { vaultId, symbol };
}

export async function getVaultFields(client: any, vaultId: string, throwOnError = false): Promise<any | null> {
  return getObjectFields(client, vaultId, throwOnError);
}

export function buildVaultData({ symbol, vaultId, vaultFields }: VaultDataParams): VaultData {
  return {
    symbol,
    vaultId,
    name: vaultFields.name || symbol,
    description: vaultFields.description || '',
    imageUrl: vaultFields.image_url || '',
    category: vaultFields.category || 'Crypto',
    circulatingSupply: vaultFields.circulating_supply || '0',
    supplyCap: vaultFields.supply_cap || '0',
    tradingEnabled: vaultFields.trading_enabled || false,
    decimals: vaultFields.decimals || 9,
  } as VaultData;
}

export async function fetchVaultData(client: any, field: any): Promise<VaultData | null> {
  const fieldInfo = await getFieldObject(client, field);
  if (!fieldInfo) {
    return null;
  }

  const vaultFields = await getVaultFields(client, fieldInfo.vaultId);
  if (!vaultFields) {
    return null;
  }

  return buildVaultData({ symbol: fieldInfo.symbol, vaultId: fieldInfo.vaultId, vaultFields });
}

export function calculateVaultPrice(fields: any): string {
  const usdcReserve = BigInt(fields.usdc_reserve || '0');
  const tradingSupply = BigInt(fields.trading_supply || '1');

  if (tradingSupply === BigInt(0)) {
    return '0';
  }

  // Calculate price: (usdc_reserve * 1_000_000_000) / trading_supply
  // This matches the contract's calculate_price function
  // Result is in micro-units (6 decimal places) per bBNB (smallest unit)
  const price = (usdcReserve * BigInt(1_000_000_000)) / tradingSupply;
  return price.toString();
}

export async function getVaultInfoFields(client: any, vaultId: string): Promise<any> {
  return getVaultFields(client, vaultId, true);
}

const VAULT_FIELD_DEFAULTS = {
  symbol: '',
  name: '',
  description: '',
  imageUrl: '',
  circulatingSupply: '0',
  supplyCap: '0',
  tradingEnabled: false,
  usdcReserve: '0',
  category: '',
  decimals: 9,
} as const;

function getStringField(fields: any, key: string, defaultValue: string): string {
  return String(fields[key] ?? defaultValue);
}

function getNumberField(fields: any, key: string, defaultValue: number): number {
  return Number(fields[key] ?? defaultValue);
}

function getBooleanField(fields: any, key: string, defaultValue: boolean): boolean {
  return Boolean(fields[key] ?? defaultValue);
}

export function buildVaultInfo(vaultId: string, fields: any) {
  return {
    vaultId,
    symbol: getStringField(fields, 'symbol', VAULT_FIELD_DEFAULTS.symbol),
    name: getStringField(fields, 'name', VAULT_FIELD_DEFAULTS.name),
    description: getStringField(fields, 'description', VAULT_FIELD_DEFAULTS.description),
    imageUrl: getStringField(fields, 'image_url', VAULT_FIELD_DEFAULTS.imageUrl),
    circulatingSupply: getStringField(fields, 'circulating_supply', VAULT_FIELD_DEFAULTS.circulatingSupply),
    supplyCap: getStringField(fields, 'supply_cap', VAULT_FIELD_DEFAULTS.supplyCap),
    tradingEnabled: getBooleanField(fields, 'trading_enabled', VAULT_FIELD_DEFAULTS.tradingEnabled),
    usdcReserve: getStringField(fields, 'usdc_reserve', VAULT_FIELD_DEFAULTS.usdcReserve),
    category: getStringField(fields, 'category', VAULT_FIELD_DEFAULTS.category),
    decimals: getNumberField(fields, 'decimals', VAULT_FIELD_DEFAULTS.decimals),
  };
}

export async function getBalancesTableId(client: any, vaultId: string): Promise<string | null> {
  const vaultFields = await getVaultFields(client, vaultId);
  if (!vaultFields) {
    return null;
  }

  const balancesTableId = vaultFields.user_balances?.fields?.id?.id;
  return balancesTableId || null;
}

export async function getUserBalanceFromTable(client: any, { balancesTableId, userAddress }: BalanceQueryParams): Promise<string> {
  try {
    const userBalance = await client.getDynamicFieldObject({
      parentId: balancesTableId,
      name: {
        type: 'address',
        value: userAddress,
      },
    });

    if (userBalance.data?.content && userBalance.data.content.dataType === 'moveObject') {
      const balanceFields = userBalance.data.content.fields as any;
      return balanceFields.value || '0';
    }
  } catch {
    // User balance not found or error fetching
  }

  return '0';
}

