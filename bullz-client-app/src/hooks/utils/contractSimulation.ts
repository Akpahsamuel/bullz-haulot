const CLOCK_ID = '0x0000000000000000000000000000000000000000000000000000000000000006';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';

const parseBigIntFromBytes = (bytes: number[]): bigint => {
  return BigInt('0x' + Buffer.from(bytes).reverse().toString('hex'));
};

export const simulateGetPrice = async (
  client: any,
  packageId: string,
  vaultId: string
): Promise<string | null> => {
  try {
    const result = await client.devInspectTransactionBlock({
      transactionBlock: {
        kind: 'moveCall',
        target: `${packageId}::trading::get_price`,
        arguments: [
          { kind: 'Input', index: 0, type: 'object', value: vaultId },
        ],
        typeArguments: [],
      } as any,
      sender: ZERO_ADDRESS,
    });

    if (result.results?.[0]?.returnValues) {
      const priceBytes = result.results[0].returnValues[0][0];
      const price = parseBigIntFromBytes(priceBytes);
      return price.toString();
    }

    return null;
  } catch (error) {
    console.error('Error simulating get_price:', error);
    return null;
  }
};

export const calculatePriceFromReserves = (
  usdcReserve: string,
  circulatingSupply: string
): string => {
  const usdcReserveBigInt = BigInt(usdcReserve);
  const circulatingSupplyBigInt = BigInt(circulatingSupply);

  if (circulatingSupplyBigInt === BigInt(0)) {
    return '0';
  }

  const price = (usdcReserveBigInt * BigInt(1_000_000_000)) / circulatingSupplyBigInt;
  return price.toString();
};

export const simulateQuoteBuy = async (
  client: any,
  packageId: string,
  vaultId: string,
  usdcAmount: string
): Promise<string> => {
  try {
    if (!usdcAmount || usdcAmount === '0') {
      return '0';
    }

    const result = await client.devInspectTransactionBlock({
      transactionBlock: {
        kind: 'moveCall',
        target: `${packageId}::trading::quote_buy`,
        arguments: [
          { kind: 'Input', index: 0, type: 'object', value: vaultId },
          { kind: 'Input', index: 1, type: 'pure', value: usdcAmount },
          { kind: 'Input', index: 2, type: 'object', value: CLOCK_ID },
        ],
        typeArguments: [],
      } as any,
      sender: ZERO_ADDRESS,
    });

    if (result.results?.[0]?.returnValues) {
      const bassetBytes = result.results[0].returnValues[0][0];
      const bassetAmount = parseBigIntFromBytes(bassetBytes);
      return bassetAmount.toString();
    }

    return '0';
  } catch (error) {
    console.error('Error getting buy quote:', error);
    return '0';
  }
};

export const simulateQuoteSell = async (
  client: any,
  packageId: string,
  vaultId: string,
  bassetAmount: string
): Promise<string> => {
  try {
    if (!bassetAmount || bassetAmount === '0') {
      return '0';
    }

    const result = await client.devInspectTransactionBlock({
      transactionBlock: {
        kind: 'moveCall',
        target: `${packageId}::trading::quote_sell`,
        arguments: [
          { kind: 'Input', index: 0, type: 'object', value: vaultId },
          { kind: 'Input', index: 1, type: 'pure', value: bassetAmount },
          { kind: 'Input', index: 2, type: 'object', value: CLOCK_ID },
        ],
        typeArguments: [],
      } as any,
      sender: ZERO_ADDRESS,
    });

    if (result.results?.[0]?.returnValues) {
      const usdcBytes = result.results[0].returnValues[0][0];
      const usdcAmount = parseBigIntFromBytes(usdcBytes);
      return usdcAmount.toString();
    }

    return '0';
  } catch (error) {
    console.error('Error getting sell quote:', error);
    return '0';
  }
};

