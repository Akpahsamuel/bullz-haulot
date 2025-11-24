import Header from "@/components/layout/header";
import NavBar from "@/components/layout/navbar";
import { cn } from "@/lib/utils";
import { useState } from "react";
import AlphaView from "./components/AlphaView";
import ShillerView from "./components/ShillersView";

type RankingMode = "SHILLERS" | "ALPHA";

const RankingPage = () => {
  const [activeMode, setActiveMode] = useState<RankingMode>("ALPHA");

  // const mockPlayers: PlayerRank[] = [
  //   {
  //     id: "1",
  //     avatar: "https://placekitten.com/100/100",
  //     name: "0xam9....283",
  //     trophyCount: 1394,
  //     points: 13.2,
  //   },
  //   {
  //     id: "2",
  //     avatar: "https://placekitten.com/100/100",
  //     name: "0xk1jg....101",
  //     trophyCount: 1394,
  //     points: 13.2,
  //   },
  //   {
  //     id: "3",
  //     avatar: "https://placekitten.com/100/100",
  //     name: "0xam9....283",
  //     trophyCount: 1394,
  //     points: 13.2,
  //   },
  //   // Add more players for the list
  //   ...Array.from({ length: 6 }, (_, i) => ({
  //     id: `${i + 4}`,
  //     avatar: "https://placekitten.com/100/100",
  //     name: "0xam9....283",
  //     trophyCount: 1394,
  //     points: 13.2,
  //     rank: i + 4,
  //   })),
  // ];

  return (
    <>
      <div className="h-dvh">
        <div className="h-12">
          <Header />
        </div>
        <div className="grid gap-4 px-6 py-4 overflow-x-hidden overflow-y-scroll">
          <div className="flex items-center gap-6">
            <p
              className={cn("font-offbit font-bold text-[34px] leading-[100%] tracking-[4%] uppercase text-gray-600", activeMode === "ALPHA" && "text-white")}
              onClick={() => setActiveMode("ALPHA")}
            >ALPHA</p>
            <p
              className={cn("font-offbit font-bold text-[34px] leading-[100%] tracking-[4%] uppercase text-gray-600", activeMode === "SHILLERS" && "text-white")}
              onClick={() => setActiveMode("SHILLERS")}
            >SHILLERS</p>
          </div>
          {activeMode === "ALPHA" ? <AlphaView /> : <ShillerView />}
        </div>
        <div className="h-16">
          <NavBar />
        </div>
      </div>
    </>
  );
};

export default RankingPage;

