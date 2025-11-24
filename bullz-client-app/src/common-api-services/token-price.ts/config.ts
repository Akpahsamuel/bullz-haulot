
// Removed TOKEN_ADDRESSES - not needed anymore
const TOKEN_ADDRESSES: Record<string, string> = {
  CETUS: '0xcetus',
  SUI: '0x2::sui::SUI',
  WAL: '0xwal',
  MIU: '0xmiu',
};


export const getAllTokenAddresses = (): string[] => {
  return Object.values(TOKEN_ADDRESSES);
};


export const getDefaultTokenAddresses = (): string[] => {
  return [
    TOKEN_ADDRESSES.CETUS,
    TOKEN_ADDRESSES.SUI,
    TOKEN_ADDRESSES.WAL,
    TOKEN_ADDRESSES.MIU,
  ];
};

export const getTokenAddressBySymbol = (symbol: string): string | undefined => {
  return TOKEN_ADDRESSES[symbol as keyof typeof TOKEN_ADDRESSES];
};

export const getTokenSymbolByAddress = (address: string): string | undefined => {
  const entry = Object.entries(TOKEN_ADDRESSES).find(([, addr]) => addr === address);
  return entry?.[0];
};

export const extractTokenSymbol = (fullTokenAddress: string): string => {
  const parts = fullTokenAddress.split('::');
  if (parts.length >= 3) {
    return parts[2];
  }
  
  const symbol = getTokenSymbolByAddress(fullTokenAddress);
  if (symbol) {
    return symbol;
  }
  
 
  return fullTokenAddress;
}; 