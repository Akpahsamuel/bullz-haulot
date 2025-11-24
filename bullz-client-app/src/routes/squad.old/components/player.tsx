import SuiLogo from "@/components/svg/sui.logo";
import { IPlayer } from "../../squad/types";
import { useState, useEffect } from "react";
import { extractTokenSymbol } from "@/common-api-services/token-price.ts/config";

// ============================================================================
// NOW USING AFTERMATH SDK - Player images from Aftermath SDK
// ============================================================================
// This component now displays player token images fetched using the Aftermath SDK
// getCoinMetadata function instead of the Bullz API
// ============================================================================

const Player = ({
  player,
 
  onClick,
}: {
  player: IPlayer;
  multiplier: number;
  onClick: () => void;
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };
  
  const handleImageLoad = () => {
    setImageError(false);
    setImageLoading(false);
  };
  
  // Reset states when imageUrl changes
  useEffect(() => {
    if (player.imageUrl) {
      setImageError(false);
      setImageLoading(true);
    } else {
      setImageLoading(false);
    }
  }, [player.imageUrl]);
  
  const showFallback = !player.imageUrl || imageError;
  
  // Extract the token symbol for display
  const displayName = extractTokenSymbol(player.name);
  
  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className="w-[5.5rem] h-[5.5rem] rounded-full border-[4.4px] border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity bg-gray-700"
        onClick={onClick}
      >
        {!showFallback && (
          <>
            <img 
              src={player.imageUrl} // ← Player token image from Aftermath SDK
              alt={displayName}
              className="w-[88px] h-[88px] rounded-full object-cover"
              onError={handleImageError}
              onLoad={handleImageLoad}
              style={{ display: imageLoading ? 'none' : 'block' }}
            />
            {imageLoading && (
              <div className="w-[88px] h-[88px] rounded-full bg-gray-600 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </>
        )}
        {showFallback && (
          <div className="w-[88px] h-[88px] rounded-full bg-gray-600 flex items-center justify-center">
            <SuiLogo 
              width={60} 
              height={60} 
              className="rounded-full" 
            />
          </div>
        )}
      </div>

      <div className="w-full h-[1.9375rem] bg-white rounded-full flex items-center justify-center -mt-[1.5rem]">
        <span className="text-black w-full text-[1.375rem] font-[700] font-offbit leading-[100%] tracking-[0.04em] text-center">
          {displayName}
        </span>
      </div>
    </div>
  );
};

export default Player;
