import React from "react";
import { useGetUserMatches } from "@/lib/hooks/use-create-bidding";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import SuiLogo from "@/components/svg/sui.logo";
import { useNavigate } from "react-router";
import { useGetSquadNamesByIds } from "@/lib/hooks/use-squad-contract";
import LiveTokenStream from "./live-token-stream";

interface ActiveMatchesProps {}

const ActiveMatches: React.FC<ActiveMatchesProps> = () => {
  const { data: userMatches, isLoading } = useGetUserMatches();
  const currentAccount = useCurrentAccount();
  const navigate = useNavigate();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeRemaining = (endsAt: number) => {
    const now = Date.now();
    const remaining = Math.max(0, endsAt - now);
    return Math.floor(remaining / 1000);
  };

  
  const activeMatches = userMatches?.filter(match => {
    if (match.status !== "Active") {
      return false;
    }
    
   
    const timeRemaining = getTimeRemaining(match.endsAt);
    return timeRemaining > 0;
  }) || [];

  
  const squadIds = Array.from(new Set(
    activeMatches.flatMap(match => [match.squad1Id, match.squad2Id])
  ));

  const { data: squadNames = {} } = useGetSquadNamesByIds(squadIds);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="font-offbit text-gray-400">Loading active matches...</p>
      </div>
    );
  }

  if (!activeMatches || activeMatches.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="font-offbit text-gray-400 text-[1rem]">
          No active matches found.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-offbit text-white text-[1.375rem] font-[700] leading-[100%] tracking-[0.04em] text-center mb-4">
        ACTIVE MATCHES
      </h2>
      
      {/* Live Token Price Stream */}
      {activeMatches.length > 0 && (
        <LiveTokenStream activeMatches={activeMatches} />
      )}
      
      <div className="space-y-4">
        {activeMatches.map((match) => {
          const timeRemaining = getTimeRemaining(match.endsAt);
          const isCurrentUserPlayer1 = match.player1 === currentAccount?.address;
          const opponentAddress = isCurrentUserPlayer1 ? match.player2 : match.player1;
          const userSquadId = isCurrentUserPlayer1 ? match.squad1Id : match.squad2Id;
          const opponentSquadId = isCurrentUserPlayer1 ? match.squad2Id : match.squad1Id;

          // Get squad names or fallback to IDs
          const userSquadName = squadNames[userSquadId] || `Squad ${userSquadId}`;
          const opponentSquadName = squadNames[opponentSquadId] || `Squad ${opponentSquadId}`;

          return (
            <div
              key={match.id}
              className="bg-gray-850 rounded-lg p-4 border border-gray-700 cursor-pointer hover:border-gray-600 transition-all"
              onClick={() => navigate(`/live/${match.id}`)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="font-offbit text-white text-[0.875rem] font-[700]">
                      {userSquadName}
                    </p>
                    <p className="font-offbit text-gray-400 text-[0.75rem]">
                      You
                    </p>
                  </div>
                  <span className="font-[700] text-gray-300 font-offbit">VS</span>
                  <div className="text-center">
                    <p className="font-offbit text-white text-[0.875rem] font-[700]">
                      {opponentSquadName}
                    </p>
                    <p className="font-offbit text-gray-400 text-[0.75rem]">
                      {opponentAddress.slice(0, 6)}...{opponentAddress.slice(-4)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end mb-2">
                    <SuiLogo className="w-[1rem] h-[1rem] rounded-full" />
                    <span className="font-offbit text-white text-[1rem] font-[700]">
                      {Number(match.totalPrize) / Number(MIST_PER_SUI)}
                    </span>
                  </div>
                  <p className="font-offbit text-gray-400 text-[0.75rem]">
                    Prize Pool
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-center">
                  <p className="font-offbit text-gray-300 text-[0.875rem]">
                    Time Remaining
                  </p>
                  <p className="font-offbit text-white text-[1.125rem] font-[700]">
                    {formatTime(timeRemaining)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="font-offbit text-gray-300 text-[0.875rem]">
                    Status
                  </p>
                  <p className="font-offbit text-green-400 text-[0.875rem] font-[700]">
                    {match.status}
                  </p>
                </div>
                <div className="text-center">
                  <p className="font-offbit text-gray-300 text-[0.875rem]">
                    Duration
                  </p>
                  <p className="font-offbit text-white text-[0.875rem]">
                    {match.duration / 1000}s
                  </p>
                </div>
              </div>

              <div className="mt-4 text-center">
                <p className="font-offbit text-blue-400 text-[0.875rem]">
                  Click to view match details
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActiveMatches; 