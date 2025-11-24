/**
 * Utility functions for fee calculations matching the Bullz smart contract logic
 * These functions mirror the fee calculation logic in trading.move and fee_management.move
 */

const BPS_SCALE = 10000; // 1 basis point = 0.01%

/**
 * Convert basis points to percentage
 * @param bps - Basis points (e.g., 500 = 5%)
 * @returns Percentage as number (e.g., 5)
 */
export function bpsToPercentage(bps: number): number {
  return bps / 100;
}

/**
 * Convert percentage to basis points
 * @param percentage - Percentage as number (e.g., 5 = 5%)
 * @returns Basis points (e.g., 500)
 */
export function percentageToBps(percentage: number): number {
  return Math.round(percentage * 100);
}

/**
 * Format basis points as a percentage string
 * @param bps - Basis points
 * @returns Formatted string (e.g., "5.00%")
 */
export function formatBpsAsPercentage(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

/**
 * Calculate fee amount from a total using basis points
 * Matches: math::mul_div(amount, fee_bps, BPS_SCALE)
 * @param amount - Total amount (as string to handle large numbers)
 * @param feeBps - Fee in basis points
 * @returns Fee amount as string
 */
export function calculateFeeAmount(amount: string, feeBps: number): string {
  const amountBigInt = BigInt(amount);
  const feeAmount = (amountBigInt * BigInt(feeBps)) / BigInt(BPS_SCALE);
  return feeAmount.toString();
}

/**
 * Calculate amount after fee deduction
 * @param amount - Original amount
 * @param feeBps - Fee in basis points
 * @returns Amount after fee as string
 */
export function calculateAmountAfterFee(amount: string, feeBps: number): string {
  const amountBigInt = BigInt(amount);
  const feeAmount = (amountBigInt * BigInt(feeBps)) / BigInt(BPS_SCALE);
  const afterFee = amountBigInt - feeAmount;
  return afterFee.toString();
}

/**
 * Calculate effective fee for a sell transaction with anti-dump mechanism
 * Matches the get_active_fee_bps function in trading.move
 * @param sellAmount - Amount being sold
 * @param circulatingSupply - Total circulating supply
 * @param baseFee - Base fee in basis points
 * @param dumpThreshold - Dump threshold in basis points
 * @param dumpSlope - Dump slope in basis points
 * @param maxDumpFee - Maximum dump fee in basis points
 * @param surgeFee - Surge fee in basis points
 * @param surgeFeeExpiry - Surge fee expiry timestamp
 * @returns Effective fee in basis points
 */
export function calculateEffectiveSellFee(
  sellAmount: string,
  circulatingSupply: string,
  baseFee: number,
  dumpThreshold: number,
  dumpSlope: number,
  maxDumpFee: number,
  surgeFee: number = 0,
  surgeFeeExpiry: number = 0
): number {
  const sellAmountBigInt = BigInt(sellAmount);
  const circulatingSupplyBigInt = BigInt(circulatingSupply);

  if (circulatingSupplyBigInt === BigInt(0) || sellAmountBigInt === BigInt(0)) {
    return baseFee;
  }

  let totalFee = baseFee;

  // Calculate sell share in basis points
  const sellShareBps = Number((sellAmountBigInt * BigInt(BPS_SCALE)) / circulatingSupplyBigInt);

  // Apply anti-dump fee if selling more than threshold
  if (sellShareBps > dumpThreshold) {
    const excessShare = sellShareBps - dumpThreshold;
    const antiDumpExtra = Math.floor((excessShare * dumpSlope) / BPS_SCALE);
    const antiDumpTotal = baseFee + antiDumpExtra;

    totalFee = Math.min(antiDumpTotal, maxDumpFee);
  }

  // Apply surge fee if active and higher than current fee
  const now = Date.now();
  if (surgeFeeExpiry > now && surgeFee > totalFee) {
    totalFee = surgeFee;
  }

  return totalFee;
}

/**
 * Calculate effective fee for a buy transaction
 * @param baseFee - Base fee in basis points
 * @param surgeFee - Surge fee in basis points
 * @param surgeFeeExpiry - Surge fee expiry timestamp
 * @returns Effective fee in basis points
 */
export function calculateEffectiveBuyFee(
  baseFee: number,
  surgeFee: number = 0,
  surgeFeeExpiry: number = 0
): number {
  const now = Date.now();

  // Check if surge fee is active and higher than base fee
  if (surgeFeeExpiry > now && surgeFee > baseFee) {
    return surgeFee;
  }

  return baseFee;
}

/**
 * Calculate AMM price based on reserves
 * Matches: calculate_price(basset_reserve, usdc_reserve) from trading.move
 * @param bassetReserve - Base asset reserve
 * @param usdcReserve - USDC reserve
 * @returns Price as string
 */
export function calculateAMMPrice(bassetReserve: string, usdcReserve: string): string {
  const bassetBigInt = BigInt(bassetReserve);
  const usdcBigInt = BigInt(usdcReserve);

  if (bassetBigInt === BigInt(0)) {
    return '0';
  }

  // Price calculation: (usdc_reserve * 1_000_000_000) / basset_reserve
  const price = (usdcBigInt * BigInt(1_000_000_000)) / bassetBigInt;
  return price.toString();
}

/**
 * Calculate output amount for a buy transaction (constant product formula)
 * Matches: quote_buy logic from trading.move
 * @param usdcIn - USDC input amount
 * @param bassetReserve - Base asset reserve
 * @param usdcReserve - USDC reserve
 * @param feeBps - Fee in basis points
 * @returns Base asset output amount
 */
export function calculateBuyOutput(
  usdcIn: string,
  bassetReserve: string,
  usdcReserve: string,
  feeBps: number
): string {
  const usdcInBigInt = BigInt(usdcIn);
  const bassetReserveBigInt = BigInt(bassetReserve);
  const usdcReserveBigInt = BigInt(usdcReserve);

  if (usdcInBigInt === BigInt(0)) {
    return '0';
  }

  // Calculate fee and amount after fee
  const feeAmount = (usdcInBigInt * BigInt(feeBps)) / BigInt(BPS_SCALE);
  const usdcAfterFee = usdcInBigInt - feeAmount;

  // AMM formula: basset_out = (basset_reserve * usdc_after_fee) / (usdc_reserve + usdc_after_fee)
  const bassetOut = (bassetReserveBigInt * usdcAfterFee) / (usdcReserveBigInt + usdcAfterFee);

  return bassetOut.toString();
}

/**
 * Calculate output amount for a sell transaction (constant product formula)
 * Matches: quote_sell logic from trading.move
 * @param bassetIn - Base asset input amount
 * @param bassetReserve - Base asset reserve
 * @param usdcReserve - USDC reserve
 * @param feeBps - Fee in basis points
 * @returns USDC output amount
 */
export function calculateSellOutput(
  bassetIn: string,
  bassetReserve: string,
  usdcReserve: string,
  feeBps: number
): string {
  const bassetInBigInt = BigInt(bassetIn);
  const bassetReserveBigInt = BigInt(bassetReserve);
  const usdcReserveBigInt = BigInt(usdcReserve);

  if (bassetInBigInt === BigInt(0)) {
    return '0';
  }

  // Calculate fee and amount after fee
  const feeAmount = (bassetInBigInt * BigInt(feeBps)) / BigInt(BPS_SCALE);
  const bassetAfterFee = bassetInBigInt - feeAmount;

  // AMM formula: usdc_out = (usdc_reserve * basset_after_fee) / (basset_reserve + basset_after_fee)
  const usdcOut = (usdcReserveBigInt * bassetAfterFee) / (bassetReserveBigInt + bassetAfterFee);

  return usdcOut.toString();
}

/**
 * Distribute fees between prize pool and team
 * Matches: distribute_fees function from trading.move
 * @param feeAmount - Total fee amount
 * @param prizePoolBps - Prize pool share in basis points
 * @returns Object with prizePoolFee and teamFee
 */
export function distributeFees(
  feeAmount: string,
  prizePoolBps: number
): { prizePoolFee: string; teamFee: string } {
  const feeAmountBigInt = BigInt(feeAmount);
  const prizePoolFee = (feeAmountBigInt * BigInt(prizePoolBps)) / BigInt(BPS_SCALE);
  const teamFee = feeAmountBigInt - prizePoolFee;

  return {
    prizePoolFee: prizePoolFee.toString(),
    teamFee: teamFee.toString(),
  };
}

/**
 * Format a token amount with decimals
 * @param amount - Amount as string
 * @param decimals - Number of decimals
 * @returns Formatted amount as number
 */
export function formatTokenAmount(amount: string, decimals: number = 9): number {
  const amountBigInt = BigInt(amount);
  const divisor = BigInt(10 ** decimals);
  return Number(amountBigInt) / Number(divisor);
}

/**
 * Parse a token amount from decimal to base units
 * @param amount - Amount as decimal number
 * @param decimals - Number of decimals
 * @returns Amount in base units as string
 */
export function parseTokenAmount(amount: number, decimals: number = 9): string {
  const amountBigInt = BigInt(Math.floor(amount * 10 ** decimals));
  return amountBigInt.toString();
}
