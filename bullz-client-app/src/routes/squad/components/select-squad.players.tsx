import { useUserPortfolio, UserAsset } from "@/hooks/useUserPortfolio";
import PlusIcon from "@/components/icons/plus.icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import React, { useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { SquadForm } from "../types";
import Player from "./player";
import { Multiplier, Postition } from "./pitch";
import SearchIcon from "@/components/icons/search.icon";
import { Link } from "react-router";
import { useToken1HourChange } from "@/common-api-services/token-price.ts/pyth-hermes";
import { formatPercentageChange } from "@/common-api-services/token-price.ts/utils";

interface Props {
  list: number[][];
  onClose: () => void;
  initialFocusedPosition?: [Postition, Multiplier];
}

const SelectSquadPlayers = (props: Props) => {
  const [day, setDay] = React.useState("30s")
  const { data: portfolio, isLoading, error, isError } = useUserPortfolio();
  const [searchTerm, setSearchTerm] = useState("");
  const [focusedPosition, setFocusedPosition] = useState<
    [Postition, Multiplier]
  >(props.initialFocusedPosition ?? [1, 2.0]);
  const { control } = useFormContext<SquadForm>();
  const playerArray = useFieldArray({ control: control, name: "players" });
  const playerArrayWatch = useWatch({ control: control, name: "players" });

 
  const filteredPortfolio = portfolio?.filter(asset => 
    asset.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handlePlayerSelect = (asset: UserAsset) => {
    const foundPlayer = playerArrayWatch?.find(
      (player) => player.position === focusedPosition[0]
    );

    if (foundPlayer && playerArrayWatch)
      playerArray.update(playerArrayWatch.indexOf(foundPlayer), {
        ...foundPlayer,
        name: asset.symbol, 
        token_price_id: asset.symbol,
        imageUrl: asset.imageUrl || "", 
        multiplier: 1, 
      });

    if (playerArray.fields.length < 7 && !foundPlayer) {
      playerArray.append({
        position: focusedPosition[0],
        name: asset.symbol, 
        token_price_id: asset.symbol,
        imageUrl: asset.imageUrl || "", 
        multiplier: 1, 
      });
    }
    
  };

  const AssetItem = ({ asset }: { asset: UserAsset }) => {
    const { data: pythChange } = useToken1HourChange(asset.symbol.replace(/^b/, ''));
    const changeValue = pythChange?.percentageChange !== undefined ? pythChange.percentageChange : asset.change24h;
    const formattedChange = formatPercentageChange(changeValue);

    return (
      <div
        key={asset.symbol}
        onClick={() => handlePlayerSelect(asset)}
        className="bg-gray-800 border border-gray-700 p-3 rounded cursor-pointer hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-600 flex items-center justify-center">
              {asset.imageUrl ? (
                <img 
                  src={asset.imageUrl} 
                  alt={asset.symbol}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-full h-full bg-gray-600 flex items-center justify-center ${asset.imageUrl ? 'hidden' : ''}`}>
                <span className="text-white font-bold text-sm">
                  {asset.symbol.charAt(0)}
                </span>
              </div>
            </div>
            <div>
              <div className="text-white font-bold">{asset.symbol}</div>
              <div className="text-gray-400 text-sm">
                Balance: {asset.balanceFormatted}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-white font-bold">{asset.valueUsd}</div>
            <div className={`text-sm ${formattedChange.colorClass}`}>
              {formattedChange.value}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const dayOpts = [
    "30s",
    "1m"
  ]

  return (
    <>
      <div className="h-dvh">
        <div className="flex items-center justify-between px-6 py-2">
          <Button
            variant={"secondary"}
            className="h-[2.5rem]"
            onClick={props.onClose}
          >
            BACK
          </Button>
          <Button className="h-[2.5rem]" onClick={props.onClose}>
            DONE
          </Button>
        </div>

        <div className="flex gap-[1rem] p-6">
          <div className="flex flex-col w-[6rem]">
            {props.list.map(([position, multiplier]) => {
              const player = playerArrayWatch?.find(
                (p) => p.position === position
              );
              return (
                <div
                  onClick={() => setFocusedPosition([position, multiplier])}
                  key={position}
                  className={cn(
                    " h-[7rem] bg-gray-850 p-[0.75rem] border border-gray-700 flex items-center justify-center",
                    {
                      "bg-gray-700": position === focusedPosition[0],
                    }
                  )}
                >
                  {player ? (
                    <Player
                      key={position}
                      multiplier={multiplier}
                      player={player}
                      onClick={() => { }}
                    />
                  ) : (
                    <div className="flex flex-col-reverse items-center justify-center w-max">
                      <div
                        style={{
                          boxShadow:
                            "0px -8px 0px 0px #0000003D inset, 0px 8px 0px 0px #FFFFFF29 inset, 0px 12px 20px 0px #00000066",
                        }}
                        className={cn(
                          "size-[3.5rem] rounded-full bg-white cursor-pointer border-[4.4px] border-gray-100 flex items-center justify-center "
                        )}
                      // onClick={() => props.onClick && props.onClick(props.pos)}
                      >
                        <PlusIcon color="#474766" />
                      </div>

                      <div className="border-[0.5px] mb-[-1.25rem] border-gray-300 w-[1.875rem] text-center text-[0.875rem] py-[0.375rem] px-[0.25rem] rounded-full font-offbit text-black font-[700] leading-[100%] tracking-[0.04em] bg-white h-[1.375rem] flex items-center justify-center">
                        {multiplier}x
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="h-[calc(100dvh-104px)] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="font-offbit font-[700] tracking-[0.04em] leading-[100%] text-[22px] text-gray-300 uppercase">SELECT Asset</p>
              <div className=" bg-gray-700 p-1 flex items-center">
                {dayOpts.map((el, idx) => (
                  <button key={idx} className={cn("flex place-content-center p-1", day === el && "bg-white")} onClick={() => setDay(el)}><span className={cn("font-bold font-offbit text-[14px] leading-[100%] tracking-[4%] uppercase", day === el && "text-black")}>{el}</span></button>
                ))}
              </div>
            </div>
            <div className="bg-gray-800 w-full h-10 px-3 py-2 border border-gray-700 flex items-center gap-2">
              <SearchIcon />
              <input 
                type="text" 
                style={{ fontFamily: "inherit", fontSize: "17px", textTransform: 'uppercase', fontWeight: 'bold' }} 
                className="w-full outline-0 placeholder:font-offbit placeholder:font-bold placeholder:uppercase placeholder:text-[17px] placeholder:leading-[100%] placeholder:tracking-[4%] p-0" 
                placeholder="search for an asset" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="overflow-y-scroll">
              {/* Show loading state */}
              {isLoading && (
                <div className="flex items-center justify-center h-[10rem]">
                  <div className="text-gray-400">Loading portfolio...</div>
                </div>
              )}

              {/* Show error state */}
              {isError && (
                <div className="flex flex-col items-center justify-center h-[10rem] gap-2">
                  <div className="text-red-400">Failed to load portfolio</div>
                  <div className="text-gray-500 text-sm">
                    {error?.message || "Unknown error"}
                  </div>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Show empty state */}
              {!isLoading && !isError && (!portfolio || portfolio.length === 0) && (
                <div className="flex items-center justify-center h-[10rem]">
                  <div className="">
                    <p className="text-gray-400 font-offbit font-bold">No assets in portfolio</p>
                    <Link to={"/shares"}>
                    <Button>Buy Portfolio</Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* Show assets */}
              {!isLoading && !isError && filteredPortfolio && filteredPortfolio.length > 0 && (
                <>
                  <div className="mb-2 text-xs text-gray-500">
                    {filteredPortfolio.length} assets available
                  </div>
                  {filteredPortfolio.map((asset) => (
                    <AssetItem key={asset.symbol} asset={asset} />
                  ))}
                </>
              )}

              {/* Show no results for search */}
              {!isLoading && !isError && portfolio && portfolio.length > 0 && filteredPortfolio.length === 0 && (
                <div className="flex items-center justify-center h-[10rem]">
                  <div className="text-gray-400">No assets match your search</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SelectSquadPlayers;
