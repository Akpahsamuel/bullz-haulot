import { IPlayer } from "../types";
import { useState, useEffect, useRef } from "react";
import { extractTokenSymbol } from "@/common-api-services/token-price.ts/config";
import { useGetPriceList } from "@/common-api-services/token-price.ts";
import { useUserPortfolio } from "@/hooks/useUserPortfolio";
import { useToken1HourChange } from "@/common-api-services/token-price.ts/pyth-hermes";


const Player = ({
  player,
 
  onClick,
}: {
  player: IPlayer;
  multiplier: number;
  onClick: () => void;
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(!!player.imageUrl);
  const [imageSrc, setImageSrc] = useState<string>('');
  const imageLoadedRef = useRef(false);
  const blobUrlRef = useRef<string>('');
  

  useEffect(() => {
    if (player.imageUrl && player.imageUrl.trim() !== '') {
      setImageError(false);
      setImageLoading(true);
      imageLoadedRef.current = false;
    
      fetch(player.imageUrl)
        .then(res => res.blob())
        .then(blob => {
          if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
          }
          const blobUrl = URL.createObjectURL(blob);
          blobUrlRef.current = blobUrl;
          setImageSrc(blobUrl);
          setImageLoading(false);
          imageLoadedRef.current = true;
        })
        .catch(() => {
          setImageError(true);
          setImageLoading(false);
          imageLoadedRef.current = false;
        });
    } else {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = '';
      }
      setImageSrc('');
      setImageError(false);
      setImageLoading(false);
      imageLoadedRef.current = false;
    }
  }, [player.imageUrl]);
  

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  const displayName = extractTokenSymbol(player.name);
  const { data: priceList } = useGetPriceList();
  const { data: portfolio } = useUserPortfolio();
  const { data: pythChange } = useToken1HourChange(displayName.replace(/^b/, ''));
  

  const findTokenData = (playerSymbol: string) => {
   
    const tokenBySymbol = priceList?.find(token => token.symbol === playerSymbol);
    if (tokenBySymbol) return tokenBySymbol;
    
 
    return priceList?.find(token => token.coinAddress === playerSymbol) || null;
  };
  
  const portfolioAsset = portfolio?.find(asset => asset.symbol === player.name);
  
  const tokenData = !portfolioAsset ? findTokenData(player.name) : undefined;
  
  let percentageChange1h = pythChange?.percentageChange !== undefined
    ? pythChange.percentageChange
    : portfolioAsset?.change24h !== undefined
    ? portfolioAsset.change24h * 100 
    : tokenData?.percentagePriceChange1h 
    ? parseFloat(tokenData.percentagePriceChange1h) 
    : 0;
  
  // If using 24h change, approximate 1h as 24h / 24
  if (pythChange?.percentageChange === undefined) {
    percentageChange1h /= 24;
  }
  
  const isLoadingPrice = false; 
  
  const hasValidImageUrl = player.imageUrl && player.imageUrl.trim() !== '';
  const showFallback = !hasValidImageUrl || imageError;
  

  const formatPercentage = (value: number): string => {
    return value >= 0 ? `+${value.toFixed(2)}` : `${value.toFixed(2)}`;
  };

  const playerPoints = Math.round(player.multiplier * 2);
  
  const percentageValue = percentageChange1h;
  const hasPositiveChange = percentageValue >= 0;

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Two-section banner: percentage and points */}
      <div className="w-[6rem] grid grid-cols-2 mb-1 rounded-sm overflow-hidden">
        {/* Percentage section */}
        <div 
          className={`px-2 py-1 flex items-center justify-center ${
            isLoadingPrice 
              ? 'bg-gray-600' 
              : hasPositiveChange 
              ? 'bg-green-500' 
              : 'bg-red-500'
          }`}
        >
          <span className="text-white text-[0.75rem] font-[600] leading-[100%] whitespace-nowrap">
            {isLoadingPrice ? (
              '...'
            ) : (
              formatPercentage(percentageValue)
            )}
          </span>
        </div>
        {/* Points section */}
        <div className="bg-gray-600 px-2 py-1 flex items-center justify-center border-l border-l-gray-500">
          <span className="text-white text-[0.75rem] font-[600] leading-[100%] whitespace-nowrap">
            {playerPoints}PTS
          </span>
        </div>
      </div>
      
      {/* White rectangle wrapper around square image would be made better */}
      <div className="bg-white p-1 cursor-pointer" onClick={onClick}>
        <div className="w-[5.5rem] h-[6.5rem] flex items-center justify-center overflow-hidden bg-gray-700">
          {!showFallback && (
            <>
              <img 
                src={imageSrc}
                alt={displayName}
                className="w-[88px] h-[88px] object-cover"
                style={{ display: imageLoading ? 'none' : 'block' }}
              />
              {imageLoading && (
                <div className="w-[88px] h-[88px] bg-gray-600 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </>
          )}
          {showFallback && (
            <div className="w-[88px] h-[88px] bg-gray-600 flex items-center justify-center">
              <span className="text-white font-bold text-2xl">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* White label at bottom needs to be made better  */}
      <div className="w-full bg-white flex items-center justify-center -mt-[1.5rem] px-2 py-1 min-h-[2.5rem]">
        <span className="text-black w-full text-[1rem] font-[700] font-offbit leading-[100%] tracking-[0.04em] text-center">
          {displayName}
        </span>
      </div>
    </div>
  );
};

export default Player;
