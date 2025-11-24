//@ts-nocheck
import UserPlayerDp from "@/components/general/user-player-dp";
import NavWrapper from "@/components/layout/nav-wrapper";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BidMatching from "./components/bid-matching";
import ActiveMatches from "./components/active-matches";
import { useGetUserMatches } from "@/lib/hooks/use-create-bidding";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import { useGetSquadNamesByIds } from "@/lib/hooks/use-squad-contract";

const Player = () => {
  return (
    <div className="space-y-[0.5rem] flex flex-col items-center justify-center">
      <UserPlayerDp
        imageUrl="/public/images/weird-nft.jpg"
        classNames="size-[3.3125rem]"
      />
      <span className="font-[700] block text-[1.0625rem] leading-[100%] tracking-[0.04em] ">
        0xkfjg.....101
      </span>
      {/* <Button variant={"secondary"} className="h-[2rem]">
        VIEW TEAM
      </Button> */}
    </div>
  );
};

const EndedMatches = () => {
  const { data: userMatches } = useGetUserMatches();
  const currentAccount = useCurrentAccount();

  const getTimeRemaining = (endsAt: number) => {
    const now = Date.now();
    const remaining = Math.max(0, endsAt - now);
    return Math.floor(remaining / 1000);
  };

  const endedMatches =
    userMatches?.filter((match) => {
      if (match.status !== "Active") {
        return true;
      }

      const timeRemaining = getTimeRemaining(match.endsAt);
      return timeRemaining <= 0;
    }) || [];

  // Get all unique squad IDs from matches to fetch their names
  const squadIds = Array.from(
    new Set(endedMatches.flatMap((match) => [match.squad1Id, match.squad2Id])),
  );

  const { data: squadNames = {} } = useGetSquadNamesByIds(squadIds);

  if (endedMatches.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="font-offbit text-gray-400 text-[1rem]">
          No ended matches found.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {endedMatches.map((match) => {
        const isExpiredActive =
          match.status === "Active" && getTimeRemaining(match.endsAt) <= 0;
        const displayStatus = isExpiredActive
          ? "ENDED"
          : match.status.toUpperCase();

        // Get squad names or fallback to IDs
        const squad1Name =
          squadNames[match.squad1Id] || `Squad ${match.squad1Id}`;
        const squad2Name =
          squadNames[match.squad2Id] || `Squad ${match.squad2Id}`;

        return (
          <div
            key={match.id}
            className="bg-gray-850 p-4 rounded-lg border border-gray-700"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-offbit text-white text-[1rem] font-[700]">
                Match #{match.id.slice(0, 8)}...
              </span>
              <span
                className={`font-offbit text-[0.875rem] font-[700] ${
                  match.status === "Completed"
                    ? "text-green-400"
                    : match.status === "Tied"
                      ? "text-yellow-400"
                      : isExpiredActive
                        ? "text-gray-400"
                        : "text-red-400"
                }`}
              >
                {displayStatus}
              </span>
            </div>

            <div className="flex justify-between items-center mb-2">
              <div className="text-gray-300 text-[0.875rem]">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        match.player1 === currentAccount?.address
                          ? "text-green-400"
                          : ""
                      }
                    >
                      {match.player1.slice(0, 5)}...{match.player1.slice(-4)}
                    </span>
                    <span className="text-gray-500 text-[0.75rem]">
                      ({squad1Name})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">vs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        match.player2 === currentAccount?.address
                          ? "text-green-400"
                          : ""
                      }
                    >
                      {match.player2.slice(0, 5)}...{match.player2.slice(-4)}
                    </span>
                    <span className="text-gray-500 text-[0.75rem]">
                      ({squad2Name})
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-white text-[0.875rem] font-[700]">
                Prize: {Number(match.totalPrize) / Number(MIST_PER_SUI)} SUI
              </div>
            </div>

            {match.status === "Completed" && match.winner && (
              <div className="bg-green-900/20 border border-green-500/30 p-2 rounded">
                <span className="font-offbit text-green-400 text-[0.875rem] font-[700]">
                  🏆 Winner: {match.winner.slice(0, 5)}...
                  {match.winner.slice(-4)}
                </span>
              </div>
            )}

            {match.status === "Tied" && (
              <div className="bg-yellow-900/20 border border-yellow-500/30 p-2 rounded">
                <span className="font-offbit text-yellow-400 text-[0.875rem] font-[700]">
                  🤝 Match ended in a tie
                </span>
              </div>
            )}

            {isExpiredActive && (
              <div className="bg-gray-800/20 border border-gray-500/30 p-2 rounded">
                <span className="font-offbit text-gray-400 text-[0.875rem] font-[700]">
                  ⏱️ Match time expired
                </span>
                {match.winner ? (
                  <div className="mt-2">
                    <span className="font-offbit text-green-400 text-[0.875rem] font-[700]">
                      🏆 Winner: {match.winner.slice(0, 5)}...
                      {match.winner.slice(-4)}
                    </span>
                  </div>
                ) : (
                  <div className="mt-2">
                    <span className="font-offbit text-gray-300 text-[0.75rem]">
                      Final result pending
                    </span>
                  </div>
                )}
              </div>
            )}

            {match.prizeClaimed && (
              <div className="mt-2 text-green-400 text-[0.75rem]">
                ✅ Prize claimed
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const LiveSessions = () => {
  const currentAccount = useCurrentAccount();

  return (
    <NavWrapper>
      <main className="px-[1rem]">
        <Tabs defaultValue="matches" className="w-full mx-auto">
          <TabsList className="bg-gray-850 mx-auto w-full">
            <TabsTrigger
              className="font-offbit rounded-none text-[1.0625rem] font-[700] leading-[100%] tracking-[0.04em] text-center"
              value="matches"
            >
              ACTIVE MATCHES
            </TabsTrigger>
            <TabsTrigger
              className="font-offbit rounded-none text-[1.0625rem] font-[700] leading-[100%] tracking-[0.04em] text-center"
              value="bids"
            >
              MATCH BIDS
            </TabsTrigger>
            <TabsTrigger
              className="font-offbit rounded-none text-[1.0625rem] font-[700] leading-[100%] tracking-[0.04em] text-center"
              value="ended"
            >
              ENDED
            </TabsTrigger>
          </TabsList>

          <TabsContent value="matches" className="px-0">
            <ActiveMatches />
          </TabsContent>

          <TabsContent value="bids" className="px-0">
            <BidMatching currentUserAddress={currentAccount?.address} />
          </TabsContent>

          <TabsContent value="ended" className="px-0">
            <EndedMatches />
          </TabsContent>
        </Tabs>
      </main>
    </NavWrapper>
  );
};

export default LiveSessions;
