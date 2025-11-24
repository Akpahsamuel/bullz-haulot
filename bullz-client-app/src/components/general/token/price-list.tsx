import { cn } from "@/lib/utils";
import TokenCard, { TokenCardSkeleton } from "./card";
import { useGetPriceList } from "@/common-api-services/token-price.ts";
import { TokenResponse } from "@/common-api-services/token-price.ts/types";
import ChevronRight from "@/components/icons/chevron-right";
import { useEffect, useState } from "react";

type TimePeriod = "5m" | "1h";

interface PriceListProps {
  onSelect?: (args: TokenResponse) => void;
  onClickBack?: () => void;
}

const PriceList = (props?: PriceListProps) => {
  const { data: priceList, isLoading, isFetching, dataUpdatedAt } = useGetPriceList();
  const [lastUpdateTime, setLastUpdateTime] = useState<string>("");
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<TimePeriod>("5m");

  useEffect(() => {
    if (dataUpdatedAt) {
      const updateTime = new Date(dataUpdatedAt);
      setLastUpdateTime(updateTime.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      }));
    }
  }, [dataUpdatedAt]);

  return (
    <>
      <div className="flex items-center justify-between mt-[1.25rem] mb-[1.5rem]">
        <div className="flex items-center gap-[0.25rem]">
          {props?.onClickBack && <ChevronRight onClick={props?.onClickBack} />}
          <div className="flex items-center gap-[0.5rem]">
            <p className="text-gray-300 font-[600] leading-[1.375rem] text-[1.6875rem]">
              TOP COINS
            </p>
            {isFetching && !isLoading && (
              <div className="flex items-center gap-[0.25rem]">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-[0.75rem] text-green-400 font-[500]">
                  Updating...
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-[0.1875rem] items-center">
          <button
            onClick={() => setSelectedTimePeriod("5m")}
            className={cn(
              "rounded-[0.125rem] h-[1.625rem] text-center flex items-center justify-center leading-[1.375rem] text-[0.75rem] font-[600] px-[0.625rem] font-geist cursor-pointer transition-colors",
              {
                "text-white bg-button-bg": selectedTimePeriod === "5m",
                "text-gray-400 bg-[#1C1D22] hover:text-white": selectedTimePeriod !== "5m",
              }
            )}
          >
            5 mins
          </button>
          <button
            onClick={() => setSelectedTimePeriod("1h")}
            className={cn(
              "rounded-[0.125rem] h-[1.625rem] text-center flex items-center justify-center leading-[1.375rem] text-[0.75rem] font-[600] px-[0.625rem] font-geist cursor-pointer transition-colors",
              {
                "text-white bg-button-bg": selectedTimePeriod === "1h",
                "text-gray-400 bg-[#1C1D22] hover:text-white": selectedTimePeriod !== "1h",
              }
            )}
          >
            1 hour
          </button>
        </div>
      </div>
      
      {lastUpdateTime && !isLoading && (
        <div className="flex items-center justify-between mb-[1rem] text-[0.75rem] text-gray-400">
          <span>Last updated: {lastUpdateTime}</span>
          <span className="text-green-400">• Live updates every 30s</span>
        </div>
      )}

      {isLoading &&
        [1, 2, 3, 4, 5, 6].map((i) => <TokenCardSkeleton key={i} />)}
      {priceList?.map((token) => (
        //@ts-ignore
        <TokenCard
          {...token}
          imageUrl={token.imageUrl || ""}
          key={token.coinAddress}
          timePeriod={selectedTimePeriod}
          onClick={() => props?.onSelect && props?.onSelect({ ...token, imageUrl: token.imageUrl || "" })}
        />
      ))}
    </>
  );
};

export default PriceList;
