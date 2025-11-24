"use client";

import TitleBar from "@/components/general/title-bar";
import SuiLogo from "@/components/svg/sui.logo";
import UserPlayerDp from "@/components/general/user-player-dp";
import RaceTrack from "../components/race-track";
import { useDisclosure } from "@/lib/hooks/use-diclosure";
import { useNavigate, useParams } from "react-router";
import WinnerMatchEnded from "./components/winner-match-ended";
import LosserMatchEnded from "./components/losser-match-ended";
import ShareResults from "./components/share-results";
import GatheringResultsModal from "./components/gathering-results-modal";
import { Button } from "@/components/ui/button";
import { useGetUserMatches } from "@/lib/hooks/use-create-bidding";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import { useEffect, useState } from "react";
import { CONSTANTS_ID } from "@/constantsId";
import { useLiveMatchStream } from "@/lib/hooks/use-live-match-stream";
import { SquadTokenService, SquadToken } from "@/lib/services/squad-token.service";

const Player = (props: {
  team_id: string;
  address: string;
  squadId: number;
  isCurrentUser: boolean;
}) => {
  const navigate = useNavigate();
  return (
    <div className="space-y-[0.5rem] flex flex-col items-center justify-center">
      <UserPlayerDp imageUrl="/public/images/weird-nft.jpg" />
      <span className="font-[700] block text-[1.0625rem] leading-[100%] tracking-[0.04em] ">
        {props.isCurrentUser
          ? "You"
          : `${props.address.slice(0, 6)}...${props.address.slice(-4)}`}
      </span>
      <Button
        variant={"secondary"}
        onClick={() => navigate(`/teams/${props.team_id}`)}
        className="h-[2rem] py-[1rem] font-[43.75rem] font-offbit text-[0.875rem] leading-[100%] cursor-pointer"
      >
        VIEW TEAM
      </Button>
    </div>
  );
};

const LiveSessionPage = () => {
  const navigate = useNavigate();
  const params = useParams();
  const sessionId = params.session_id as string;
  const currentAccount = useCurrentAccount();
  const { data: userMatches } = useGetUserMatches();
  const suiClient = useSuiClient();

  const [squadTokenService] = useState(() => new SquadTokenService());
  const [allSquadTokens, setAllSquadTokens] = useState<SquadToken[]>([]);
  const [player1Performance, setPlayer1Performance] = useState(0);
  const [player2Performance, setPlayer2Performance] = useState(0);
  const [matchEnded, setMatchEnded] = useState(false);
  const [matchData, setMatchData] = useState<{
    winner: string;
    loser: string;
    duration: number;
    prizeAmount: number;
    player1Performance: number;
    player2Performance: number;
    currentUserAddress: string;
    isCurrentUserPlayer1: boolean;
  } | null>(null);

  // Handler for when results are gathered
  const handleResultsGathered = (result: {
    isWinner: boolean;
    isLoser: boolean;
    winner?: string;
    loser?: string;
    isTie: boolean;
  }) => {
    closeGatheringResults();

    // Calculate match duration
    const matchStartTime = currentMatch?.startedAt || Date.now();
    const matchEndTime = Date.now();
    const duration = matchEndTime - matchStartTime;

    // Set match data for display in modals
    if (currentMatch && currentAccount?.address) {
      const isCurrentUserPlayer1 = currentMatch.player1 === currentAccount.address;

      setMatchData({
        winner: result.winner || (isCurrentUserPlayer1 ? currentMatch.player2 : currentMatch.player1),
        loser: result.loser || (isCurrentUserPlayer1 ? currentMatch.player2 : currentMatch.player1),
        duration: duration,
        prizeAmount: Number(currentMatch.totalPrize),
        player1Performance: player1Performance,
        player2Performance: player2Performance,
        currentUserAddress: currentAccount.address,
        isCurrentUserPlayer1: isCurrentUserPlayer1,
      });
    }

    // Open appropriate modal based on real contract results only
    setTimeout(() => {
      if (result.isTie) {
        openWinningSheet();
      } else if (result.isWinner) {
        openWinningSheet();
      } else if (result.isLoser) {
        openLossingSheet();
      }
      // If neither, keep modal open and polling – do nothing here
    }, 200);
  };

  // Get WebSocket URL from environment
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';

  // Find current match
  const currentMatch = userMatches?.find(
    (match) => match.id === sessionId && match.status === "Active"
  );

  const {
    isOpen: winningSheetIsOpen,
    onClose: closeWinningSheet,
    onOpen: openWinningSheet,
  } = useDisclosure();
  const {
    isOpen: lossingSheetIsOpen,
    onClose: closeLossingSheet,
    onOpen: openLossingSheet,
  } = useDisclosure();
  const {
    isOpen: shareDrawerIsOpen,
    onClose: closeShareDrawer,
    onOpen: openShareDrawer,
  } = useDisclosure();
  const {
    isOpen: gatheringResultsIsOpen,
    onClose: closeGatheringResults,
    onOpen: openGatheringResults,
  } = useDisclosure();

  // Check for match end conditions using REAL contract data
  useEffect(() => {
    if (!currentMatch || matchEnded) return;

    const checkMatchEnd = async () => {
      const timeLeft = getTimeRemaining(currentMatch.endsAt);
      const finishThreshold = 5; // 5% performance = finish line (same as race track)

      // Check if time expired or someone reached finish line
      const timeExpired = timeLeft <= 0;
      const player1Finished = player1Performance >= finishThreshold;
      const player2Finished = player2Performance >= finishThreshold;
      const anyoneFinished = player1Finished || player2Finished;

      if (timeExpired || anyoneFinished) {
        setMatchEnded(true);

        // Show gathering results modal
        setTimeout(() => {
          openGatheringResults();
        }, 1000); // 1 second delay to let the race animation finish
      }
    };

    checkMatchEnd();
  }, [currentMatch, player1Performance, player2Performance, matchEnded, currentAccount?.address, openGatheringResults]);

  useEffect(() => {
    if (!currentMatch) return;

    const timer = setInterval(() => {
      const newTimeRemaining = getTimeRemaining(currentMatch.endsAt);
      setTimeRemaining(newTimeRemaining);

      if (newTimeRemaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentMatch]);

  // Initialize squad tokens and websocket streaming
  useEffect(() => {
    const initializeSquadTokens = async () => {
      if (!suiClient || !currentMatch) return;

      try {
      
        const network = import.meta.env.VITE_SUI_NETWORK || "testnet";
        const networkConstants = CONSTANTS_ID[network as keyof typeof CONSTANTS_ID];

        if (!networkConstants?.squadRegistryId) {
          return;
        }

        // Initialize service
        squadTokenService.initialize(suiClient, networkConstants.squadRegistryId);

        // Fetch tokens for both squads
        const [squad1Tokens, squad2Tokens] = await Promise.all([
          squadTokenService.getSquadTokens(currentMatch.squad1Id),
          squadTokenService.getSquadTokens(currentMatch.squad2Id),
        ]);

        const allTokens = [...squad1Tokens, ...squad2Tokens];
        setAllSquadTokens(allTokens);
      } catch (error) {
        // Error fetching squad tokens - silently continue
      }
    };

    initializeSquadTokens();
  }, [currentMatch, suiClient]);

  // Use websocket streaming
  const { isConnected, squadPerformance, error } = useLiveMatchStream({
    matchId: currentMatch?.id || '',
    squadTokens: allSquadTokens,
    wsUrl,
  });

  // Update player performances when streaming data changes
  useEffect(() => {
    if (squadPerformance) {
      // For now, using the same performance for both players
      // In a real implementation, you'd calculate separate performances for each squad
      const performance = squadPerformance.averagePercentageChange || 0;
      setPlayer1Performance(performance);
      setPlayer2Performance(performance * 0.8); // Simulate different performance
    }
  }, [squadPerformance]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const getTimeRemaining = (endsAt: number) => {
    const endTime = endsAt;
    const now = Date.now();
    const timeLeft = Math.max(0, Math.floor((endTime - now) / 1000));
    return timeLeft;
  };

  const [timeRemaining, setTimeRemaining] = useState(() => {
    return currentMatch ? getTimeRemaining(currentMatch.endsAt) : 0;
  });

  if (!currentMatch) {
    return (
      <div className="text-center py-8">
        <p className="font-offbit text-gray-400">Match not found or no longer active</p>
        <Button onClick={() => navigate("/live")} className="mt-4">
          Back to Live Matches
        </Button>
      </div>
    );
  }

  const player1Address = currentMatch.player1;
  const player2Address = currentMatch.player2;
  const player1SquadId = currentMatch.squad1Id;
  const player2SquadId = currentMatch.squad2Id;

  return (
    <>
      <TitleBar title="LIVE MATCH" onClick={() => navigate("/live")} />

      {/* Connection Status */}
      {error && (
        <div className="mx-auto max-w-md mb-4 p-3 bg-red-500/20 border border-red-500 rounded">
          <p className="font-offbit text-red-400 text-center text-[0.75rem]">⚠️ {error}</p>
        </div>
      )}

      <div className="mt-[1.5rem] w-max mx-auto py-[0.5rem]">
        <p className="text-gray-300 font-[700] font-offbit leading-[100%] tracking-[0.04em] text-center mb-[2rem]">
          MATCH IN PROGRESS {isConnected && <span className="text-green-400">🔴 LIVE</span>}
        </p>
        <div className="flex items-center gap-[0.5rem]">
          <Player
            team_id={player1SquadId.toString()}
            address={player1Address}
            squadId={player1SquadId}
            isCurrentUser={player1Address === currentAccount?.address}
          />
          <span className="font-[700] text-gray-300 font-offbit">VS</span>
          <Player
            team_id={player2SquadId.toString()}
            address={player2Address}
            squadId={player2SquadId}
            isCurrentUser={player2Address === currentAccount?.address}
          />
        </div>
      </div>
      <div className=" mb-[2rem] mt-[0.25rem] w-full">
        <div className="flex justify-center gap-[0.25rem] items-start py-[0.25rem]">
          <SuiLogo className="w-[1.25rem] h-[1.25rem] rounded-full" />
          <span className="text-[1.375rem] font-[700] font-offbit tracking-[0.04em] leading-[100%]">
            {Number(currentMatch.totalPrize) / Number(MIST_PER_SUI)}
          </span>
        </div>

        <div className="font-[700] w-full text-center flex items-center justify-center h-[2.25rem]  bg-gradient-to-l from-[#000019] via-[#1F1F33] to-[#000019]">
          {formatTime(timeRemaining)}
        </div>
      </div>

      {/* Live Race Track with streaming data */}
      <RaceTrack
        player1Performance={player1Performance}
        player2Performance={player2Performance}
        player1Address={player1Address}
        player2Address={player2Address}
        isConnected={isConnected}
      />

      <WinnerMatchEnded
        isOpen={winningSheetIsOpen}
        openShareDrawer={openShareDrawer}
        onClose={closeWinningSheet}
        matchData={matchData || undefined}
      />
      <LosserMatchEnded
        isOpen={lossingSheetIsOpen}
        openShareDrawer={openShareDrawer}
        onClose={closeLossingSheet}
        matchData={matchData || undefined}
      />
      <ShareResults isOpen={shareDrawerIsOpen} onClose={closeShareDrawer} />

      <GatheringResultsModal
        isOpen={gatheringResultsIsOpen}
        onResultsGathered={handleResultsGathered}
        matchId={currentMatch?.id || ''}
        currentUserAddress={currentAccount?.address || ''}
        suiClient={suiClient}
        packageId={(() => {
        const network = import.meta.env.VITE_SUI_NETWORK || "testnet";
          const networkConstants = CONSTANTS_ID[network as keyof typeof CONSTANTS_ID];
          return networkConstants.packageId;
        })()}
        squad1ImageUrl="/public/images/weird-nft.jpg"
        squad2ImageUrl="/public/images/owl-nft.jpg"
      />
    </>
  );
};

export default LiveSessionPage;
