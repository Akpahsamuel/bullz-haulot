import { useGetPriceList } from "@/common-api-services/token-price.ts";
import { formatPercentageChange } from "@/common-api-services/token-price.ts/utils";
import { Token1HourChangeDisplay } from "./Token1HourChangeDisplay";

// ============================================================================
// NOW USING AFTERMATH SDK - Coin images and metadata from Aftermath SDK
// ============================================================================
// This component now displays coin images and metadata fetched using the
// Aftermath SDK getCoinMetadata function instead of the Bullz API
// ============================================================================

export const TokenPriceDisplay = () => {
  const { data: priceList, isLoading, error, isError } = useGetPriceList(); // ← Now using Aftermath SDK

  if (isLoading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Token Prices</h2>
        <p className="text-gray-500">Loading token prices...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Token Prices</h2>
        <p className="text-red-500">
          Error loading token prices: {error?.message || "Unknown error"}
        </p>
      </div>
    );
  }

  if (!priceList || priceList.length === 0) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Token Prices</h2>
        <p className="text-gray-500">No token data available</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Token Prices</h2>
      {priceList && priceList.length > 0 ? (
        <div className="space-y-4">
          {priceList.map((token) => {
            const change5m = formatPercentageChange(token.percentagePriceChange5m);
            
            return (
              <div key={token.coinAddress} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                {/* AFTERMATH SDK IMAGE: Using coin image from Aftermath SDK metadata */}
                {token.imageUrl ? (
                  <img 
                    src={token.imageUrl} // ← Coin image from Aftermath SDK
                    alt={token.name}
                    className="w-10 h-10 rounded-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `data:image/svg+xml;base64,${btoa(`
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="20" cy="20" r="20" fill="#F7F7F7"/>
                          <text x="20" y="25" text-anchor="middle" font-family="Arial" font-size="12" fill="#999">${token.symbol}</text>
                        </svg>
                      `)}`;
                    }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-xs font-semibold text-gray-600">{token.symbol}</span>
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold">{token.name}</h3>
                    <span className="text-sm text-gray-500 uppercase">{token.symbol}</span>
                  </div>
                  <p className="text-lg font-mono">${parseFloat(token.currentPrice || "0").toFixed(6)}</p>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${change5m.colorClass}`}>
                    5m: {change5m.value}
                  </div>
                  <Token1HourChangeDisplay symbol={token.symbol} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-500">No token data available</p>
      )}
    </div>
  );
}; 