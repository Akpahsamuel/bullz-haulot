import EmptyPlayerDp from "@/components/svg/empty-player-dp";
import UserPlayer from "@/components/svg/user-player";
import { Button } from "@/components/ui/button";
import { useGetUserBids, useCancelBid, useGetUserMatches } from "@/lib/hooks/use-create-bidding";
import { useState, useEffect } from "react";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import { useNavigate } from "react-router";

interface Props {
  onCancel: () => void;
  squadId?: number;
}

const LockedHorns = (props: Props) => {
  const { data: userBids, refetch: refetchBids } = useGetUserBids();
  const { data: userMatches, refetch: refetchMatches } = useGetUserMatches();
  const cancelBid = useCancelBid();
  const navigate = useNavigate();
  const [waitTime, setWaitTime] = useState(0);
  const [showTimeoutOption, setShowTimeoutOption] = useState(false);

  // Find active bid for the current squad (be more flexible with status)
  const activeBid = userBids?.find((bid: any) => {
    return bid.squadId === props.squadId;
  });

  // If no active bid found for specific squad, get the most recent bid
  const fallbackBid = userBids && userBids.length > 0 ? userBids[0] : null;
  const currentBid = activeBid || fallbackBid;

  // Poll for matches more frequently when waiting
  useEffect(() => {
    // Initial refetch when component mounts
    refetchMatches();
    
    // Set up more frequent polling for matches (every 5 seconds)
    const matchPollingInterval = setInterval(() => {
      refetchMatches();
    }, 5000);

    return () => clearInterval(matchPollingInterval);
  }, [refetchMatches]);

  // When a match is found, close modal and go to live screen
  useEffect(() => {
    if (userMatches && userMatches.length > 0 && currentBid) {
      // Find a match that contains the user's current bid
      const userBidMatch = userMatches.find((match: any) => {
        // Check if this match contains the user's bid (either bid1 or bid2)
        return match.bid1Id === currentBid.id || match.bid2Id === currentBid.id;
      });
      
      if (userBidMatch && userBidMatch.status === "Active") {
        props.onCancel();
        navigate(`/live/${userBidMatch.id}`);
      }
    }
  }, [userMatches, currentBid, navigate, props]);

  // Update wait time every second
  useEffect(() => {
    if (!currentBid) return;

    const interval = setInterval(() => {
      const currentTime = Date.now();
      const bidCreatedTime = Number(currentBid.createdAt);
      const elapsed = Math.floor((currentTime - bidCreatedTime) / 1000);
      setWaitTime(elapsed);

      // Show timeout option after 2 minutes
      if (elapsed > 120) {
        setShowTimeoutOption(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentBid]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCancelBid = async () => {
    // Try to cancel the specific bid first, then fallback
    const bidToCancel = currentBid;
    
    if (!bidToCancel) {
      // Still allow user to close the modal
      props.onCancel();
      return;
    }

    try {
      await cancelBid.mutateAsync({ bidId: bidToCancel.id });
      
      // Refetch bids to update the UI
      await refetchBids();
      
      // Close the modal
      props.onCancel();
    } catch (error) {
      // Still allow user to close the modal even if cancel fails
      props.onCancel();
    }
  };

  return (
    <div>
      <p className="text-center text-gray-300 font-[700] font-offbit text-[1.0625rem] leading-[100%] tracking-[0.04em] my-[1rem]">
        {showTimeoutOption ? "TAKING TOO LONG?" : "LOOKING FOR SOMEONE..."}
      </p>
      
      {currentBid && (
        <div className="text-center mb-[1rem]">
          <p className="text-white font-offbit text-[0.875rem] mb-2">
            Bid Amount: {Number(currentBid.bidAmount) / Number(MIST_PER_SUI)} SUI
          </p>
          <p className="text-gray-400 font-offbit text-[0.875rem]">
            Wait Time: {formatTime(waitTime)}
          </p>
          {showTimeoutOption && (
            <p className="text-yellow-400 font-offbit text-[0.75rem] mt-2">
              No opponent found yet. You can cancel to get your funds back.
            </p>
          )}
        </div>
      )}

      {!currentBid && (
        <div className="text-center mb-[1rem]">
          <p className="text-gray-400 font-offbit text-[0.875rem]">
            No active bid found. You can still close this dialog.
          </p>
        </div>
      )}

      <div className="flex items-center gap-[0.5rem] w-max mx-auto mb-[1rem]">
        <div className="w-[7rem] flex flex-col gap-[0.5rem] items-center justify-center">
          <UserPlayer
            color="#C2FF5F"
            style={{
              boxShadow: "0px 8.07px 13.45px 0px #00000066",
            }}
          />
          <span className="font-[700] text-[1.0625rem] leading-[100%] tracking-[0.04em]">
            YOU
          </span>
        </div>
        <span className="font-[700] text-gray-300 font-offbit text-[1.0625rem]">
          VS
        </span>

        <div className="w-[7rem] flex flex-col items-center justify-center gap-[0.5rem]">
          <EmptyPlayerDp
            style={{
              boxShadow: "0px 8.07px 13.45px 0px #00000066",
            }}
          />
          <span className="font-[700] text-[1.0625rem] leading-[100%] tracking-[0.04em] text-gray-400 font-offbit">
            ???
          </span>
        </div>
      </div>
      
      <div className="space-y-2">
        <Button
          type="button"
          className="w-full text-[1.0625rem] cursor-pointer"
          variant={showTimeoutOption ? "destructive" : "secondary"}
          onClick={handleCancelBid}
          disabled={cancelBid.isPending}
        >
          {cancelBid.isPending 
            ? "CANCELLING..." 
            : currentBid 
              ? "CANCEL REQUEST" 
              : "CLOSE"
          }
        </Button>
        
        {showTimeoutOption && currentBid && (
          <p className="text-center text-[0.75rem] text-gray-400 font-offbit">
            Don't worry - you'll get your full bid amount back including fees!
          </p>
        )}
      </div>
    </div>
  );
};

export default LockedHorns;
