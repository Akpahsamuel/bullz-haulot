import UserPlayerDp from "@/components/general/user-player-dp";
import FinishFlag from "@/components/svg/finish-flag";
import RaceDotGrid from "@/components/svg/race-dot-grid";
// import UserPlayer from "@/components/svg/user-player";
import { SVGProps } from "react";

const Tick = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="3"
      height="116"
      viewBox="0 0 3 116"
      fill="none"
      {...props}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect y="6" width="3" height="104" fill="currentColor" />
      <line
        x1="1.25"
        y1="1.09278e-08"
        x2="1.24999"
        y2="116"
        stroke="currentColor"
        stroke-width="0.5"
      />
    </svg>
  );
};

interface RaceTrackProps {
  player1Performance?: number;
  player2Performance?: number;
  player1Address?: string;
  player2Address?: string;
  isConnected?: boolean;
}

const RaceTrack = ({ 
  player1Performance = 0, 
  player2Performance = 0, 
  // player1Address = "", 
  // player2Address = "",
  isConnected = false 
}: RaceTrackProps) => {
  // Determine which player is leading
  // const player1Leading = player1Performance >= player2Performance;
  // const player2Leading = player2Performance > player1Performance;
  
  // Calculate track position based on performance (max 100% of track width)
  const maxPerformance = Math.max(Math.abs(player1Performance), Math.abs(player2Performance));
  const trackScale = maxPerformance > 0 ? Math.min(maxPerformance / 5, 1) : 0; // Scale so 5% = full track
  
  const player1Position = maxPerformance > 0 ? (Math.abs(player1Performance) / maxPerformance) * trackScale : 0;
  const player2Position = maxPerformance > 0 ? (Math.abs(player2Performance) / maxPerformance) * trackScale : 0;

  return (
    <div className="h-[25rem] rounded-[1rem] w-[23.875rem] mx-auto border border-gray-800 flex items-center relative">
      {/* Connection Status */}
      {!isConnected && (
        <div className="absolute top-2 right-2 bg-red-500/20 border border-red-500 rounded px-2 py-1">
          <span className="font-offbit text-red-400 text-[0.625rem]">DISCONNECTED</span>
        </div>
      )}
      
      <div className="absolute flex flex-col gap-[0.75rem] z-10" style={{
        transform: `translateX(${Math.max(player1Position, player2Position) * 300}px)`
      }}>
        {/* Player 1 */}
        <div className="flex items-center gap-[0.5rem]">
          <div className="flex gap-[0.1875rem]">
            <Tick color={player1Performance >= 0 ? "#00FF00" : "#FF9999"} />
            <Tick color={player1Performance >= 0 ? "#00FF00" : "#FF9999"} />
            <Tick color={player1Performance >= 0 ? "#00FF00" : "#FF9999"} />
          </div>
          <div className="flex gap-[0.5rem] items-center">
            <UserPlayerDp
              imageUrl=""
              classNames="border-[1.83px] rounded-[0.3075rem] size-[2rem]"
            />
            <span className={`font-offbit font-[700] text-[0.875rem] leading-[100%] tracking-[0.04em] ${
              player1Performance >= 0 ? 'text-success-foreground' : 'text-loss-foreground'
            }`}>
              {player1Performance >= 0 ? '+' : ''}{player1Performance.toFixed(2)}%
            </span>
          </div>
        </div>
        
        {/* Player 2 */}
        <div className="flex items-center gap-[0.5rem]">
          <div className="flex gap-[0.1875rem]">
            <Tick color={player2Performance >= 0 ? "#00FF00" : "#FF9999"} />
            <Tick color={player2Performance >= 0 ? "#00FF00" : "#FF9999"} />
            <Tick color={player2Performance >= 0 ? "#00FF00" : "#FF9999"} />
          </div>
          <div className="flex gap-[0.5rem] items-center">
            <UserPlayerDp
              imageUrl=""
              classNames="border-[1.83px] rounded-[0.3075rem] size-[2rem]"
            />
            <span className={`font-offbit font-[700] text-[0.875rem] leading-[100%] tracking-[0.04em] ${
              player2Performance >= 0 ? 'text-success-foreground' : 'text-loss-foreground'
            }`}>
              {player2Performance >= 0 ? '+' : ''}{player2Performance.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
      
      <RaceDotGrid />
      <div className="bg-gray-850 h-full w-[2.0625rem] flex items-center justify-center rounded-tr-[1rem] rounded-br-[1rem]">
        <FinishFlag />
      </div>
    </div>
  );
};

export default RaceTrack;
