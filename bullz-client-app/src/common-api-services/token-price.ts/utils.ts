// Utility functions for token price formatting and display


export const formatTokenPrice = (price: string | number, decimals: number = 6): string => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (isNaN(numPrice)) return '$0.00';
  

  if (numPrice < 0.001 && numPrice > 0) {
    return `$${numPrice.toExponential(2)}`;
  }
  
 
  return `$${numPrice.toFixed(Math.min(decimals, 8))}`;
};


export const formatPercentageChange = (percentage: string | number): {
  value: string;
  isPositive: boolean;
  colorClass: string;
} => {
  const numPercentage = typeof percentage === 'string' ? parseFloat(percentage) : percentage;
  
  if (isNaN(numPercentage)) {
    return {
      value: '0.00%',
      isPositive: false,
      colorClass: 'text-gray-500'
    };
  }
  
  const isPositive = numPercentage >= 0;
  const value = `${isPositive ? '+' : ''}${numPercentage.toFixed(2)}%`;
  const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
  
  return {
    value,
    isPositive,
    colorClass
  };
};


export const shortenAddress = (address: string, startLength: number = 6, endLength: number = 4): string => {
  if (address.length <= startLength + endLength) {
    return address;
  }
  
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
};


export const formatCoinAmount = (amount: string | number, decimals: string | number): number => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const numDecimals = typeof decimals === 'string' ? parseInt(decimals) : decimals;
  
  return numAmount / Math.pow(10, numDecimals);
}; 