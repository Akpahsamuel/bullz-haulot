import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useEffect } from "react";

interface GatheringResultsModalProps {
  isOpen: boolean;
  onResultsGathered: (result: {
    isWinner: boolean;
    isLoser: boolean;
    winner?: string;
    loser?: string;
    isTie: boolean;
  }) => void;
  matchId: string;
  currentUserAddress: string;
  suiClient: any;
  packageId: string;
  squad1ImageUrl?: string;
  squad2ImageUrl?: string;
}

const GatheringResultsModal = ({
  isOpen,
  onResultsGathered,
  matchId,
  currentUserAddress,
  suiClient,
  packageId,
  squad1ImageUrl,
  squad2ImageUrl,
}: GatheringResultsModalProps) => {

  useEffect(() => {
    if (!isOpen) return;

    let interval: NodeJS.Timeout | null = null;

    const poll = async () => {
      try {
        const [completedEvents, tiedEvents] = await Promise.all([
          suiClient.queryEvents({
            query: {
              MoveEventType: `${packageId}::match_escrow::MatchCompleted`,
            },
            limit: 50,
            order: "descending",
          }),
          suiClient.queryEvents({
            query: {
              MoveEventType: `${packageId}::match_escrow::MatchTied`,
            },
            limit: 50,
            order: "descending",
          }),
        ]);

        const completedEvent = completedEvents.data.find((event: any) =>
          event.parsedJson && (event.parsedJson as any).match_id === matchId
        );

        if (completedEvent && completedEvent.parsedJson) {
          const data = completedEvent.parsedJson as any;
          const winner = data.winner as string;
          const loser = data.loser as string;

          if (interval) clearInterval(interval);
          onResultsGathered({
            isWinner: winner === currentUserAddress,
            isLoser: loser === currentUserAddress,
            winner,
            loser,
            isTie: false,
          });
          return;
        }

        const tiedEvent = tiedEvents.data.find((event: any) =>
          event.parsedJson && (event.parsedJson as any).match_id === matchId
        );

        if (tiedEvent && tiedEvent.parsedJson) {
          if (interval) clearInterval(interval);
          onResultsGathered({
            isWinner: false,
            isLoser: false,
            winner: undefined,
            loser: undefined,
            isTie: true,
          });
          return;
        }
        // If no event yet, keep polling
      } catch (_) {
        // Ignore and keep polling
      }
    };

    // Start immediate poll, then continue at interval
    poll();
    interval = setInterval(poll, 1500);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, matchId, currentUserAddress, suiClient, packageId, onResultsGathered]);



  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-xs w-[280px] bg-gray-800 border border-gray-600 rounded-lg p-4"
        style={{
          boxShadow: "0px 10px 30px rgba(0, 0, 0, 0.8)",
        }}
      >
        <div className="flex flex-col items-center justify-center">
          {/* Squad images visual */}
          <div className="flex items-center justify-center mb-3">
            <div className="flex -space-x-1">
              <div className="w-10 h-10 rounded-lg border border-gray-700 overflow-hidden">
                <img 
                  src={squad1ImageUrl || "/public/images/weird-nft.jpg"} 
                  alt="Squad 1"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="w-10 h-10 rounded-lg border border-gray-700 overflow-hidden">
                <img 
                  src={squad2ImageUrl || "/public/images/owl-nft.jpg"} 
                  alt="Squad 2"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Hourglass icon */}
          <div className="mb-2">
            <div className="w-6 h-6 text-white flex items-center justify-center text-lg">⏳</div>
          </div>

          {/* Main text */}
          <h2 className="font-offbit text-white text-sm font-bold text-center tracking-wider leading-tight">
            GATHERING
            <br />
            RESULTS...
          </h2>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GatheringResultsModal;
