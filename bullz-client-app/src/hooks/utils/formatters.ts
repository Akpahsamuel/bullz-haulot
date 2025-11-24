export function formatBalance(balance: number): string {
  if (balance >= 1000000000000) {
    return (balance / 1000000000000).toFixed(2) + 'T';
  } else if (balance >= 1000000000) {
    return (balance / 1000000000).toFixed(2) + 'B';
  } else if (balance >= 1000000) {
    return (balance / 1000000).toFixed(2) + 'M';
  } else if (balance >= 1000) {
    return (balance / 1000).toFixed(2) + 'k';
  } else if (balance >= 1) {
    return balance.toFixed(0); 
  } else if (balance >= 0.01) {
    return balance.toFixed(4);
  } else {
    return balance.toFixed(6);
  }
}

export function formatUsdValue(value: number): string {
  if (value >= 1000000000) {
    return '$' + (value / 1000000000).toFixed(1) + 'B';
  } else if (value >= 1000000) {
    return '$' + (value / 1000000).toFixed(1) + 'M';
  } else if (value >= 1000) {
    return '$' + (value / 1000).toFixed(1) + 'k';
  } else if (value >= 1) {
    return '$' + value.toFixed(2);
  } else if (value >= 0.01) {
    return '$' + value.toFixed(4);
  } else {
    return '$0.00';
  }
}

