import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useGetActiveBids } from "@/lib/hooks/use-create-bidding";
// import { useGetPriceList } from "@/common-api-services/token-price.ts";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import SuiLogo from "@/components/svg/sui.logo";
import { useGetSquadNamesByIds } from "@/lib/hooks/use-squad-contract";

interface BidMatchingProps {
  currentUserAddress?: string;
}

const BidMatching: React.FC<BidMatchingProps> = ({ currentUserAddress }) => {
  const { data: activeBids, isLoading } = useGetActiveBids();
  // const { data: priceList } = useGetPriceList();
  const [selectedBid1, setSelectedBid1] = useState<string | null>(null);
  const [selectedBid2, setSelectedBid2] = useState<string | null>(null);

  // Filter out current user's bids
  const otherUserBids = activeBids?.filter(bid => bid.creator !== currentUserAddress) || [];

  // Get all unique squad IDs from bids to fetch their names
  const squadIds = Array.from(new Set(
    otherUserBids.map(bid => bid.squadId)
  ));

  const { data: squadNames = {} } = useGetSquadNamesByIds(squadIds);

  const handleBidSelect = (bidId: string) => {
    if (selectedBid1 === bidId) {
      setSelectedBid1(null);
    } else if (selectedBid2 === bidId) {
      setSelectedBid2(null);
    } else if (!selectedBid1) {
      setSelectedBid1(bidId);
    } else if (!selectedBid2) {
      setSelectedBid2(bidId);
    }
  };

  const handleMatchBids = async () => {
    if (!selectedBid1 || !selectedBid2) return;

    const bid1 = activeBids?.find(bid => bid.id === selectedBid1);
    const bid2 = activeBids?.find(bid => bid.id === selectedBid2);

    if (!bid1 || !bid2) return;

    // Clear selections
    setSelectedBid1(null);
    setSelectedBid2(null);
  };

  const canMatch = selectedBid1 && selectedBid2 && selectedBid1 !== selectedBid2;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="font-offbit text-gray-400">Loading active bids...</p>
      </div>
    );
  }

  if (!otherUserBids || otherUserBids.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="font-offbit text-gray-400 text-[1rem]">
          No active bids from other users to match.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-offbit text-white text-[1.375rem] font-[700] leading-[100%] tracking-[0.04em] text-center mb-4">
        MATCH BIDS
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {otherUserBids.map((bid) => {
          const isSelected1 = selectedBid1 === bid.id;
          const isSelected2 = selectedBid2 === bid.id;
          const isSelected = isSelected1 || isSelected2;

          // Get squad name or fallback to ID
          const squadName = squadNames[bid.squadId] || `Squad ${bid.squadId}`;
          
          return (
            <div
              key={bid.id}
              className={`bg-gray-850 rounded-lg p-4 border cursor-pointer transition-all ${
                isSelected 
                  ? "border-blue-500 bg-blue-900/20" 
                  : "border-gray-700 hover:border-gray-600"
              }`}
              onClick={() => handleBidSelect(bid.id)}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-offbit text-white text-[1rem] font-[700]">
                    {squadName}
                  </p>
                  <p className="font-offbit text-gray-300 text-[0.875rem]">
                    {Number(bid.bidAmount) / Number(MIST_PER_SUI)} SUI
                  </p>
                  <p className="font-offbit text-gray-400 text-[0.75rem]">
                    Duration: {bid.duration / 1000}s
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-offbit text-gray-400 text-[0.75rem]">
                    {bid.creator.slice(0, 6)}...{bid.creator.slice(-4)}
                  </p>
                  {isSelected && (
                    <p className="font-offbit text-blue-400 text-[0.625rem] mt-1">
                      {isSelected1 ? "BID 1" : "BID 2"}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex justify-center items-center">
                <div className="flex items-center gap-2">
                  <SuiLogo className="w-[1rem] h-[1rem] rounded-full" />
                  <span className="font-offbit text-white text-[0.875rem]">
                    {Number(bid.bidAmount) / Number(MIST_PER_SUI)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {canMatch && (
        <div className="flex justify-center mt-6">
          <Button
            onClick={handleMatchBids}
            className="font-offbit text-[1rem] px-8 py-3"
          >
            VIEW COMPATIBLE BIDS
          </Button>
        </div>
      )}
    </div>
  );
};

export default BidMatching; 