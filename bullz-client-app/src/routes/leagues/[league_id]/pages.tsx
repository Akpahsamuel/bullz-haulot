import BullTrophy from "@/components/svg/bull-trophy";
import DefaultLeagueDp from "@/components/svg/default-league-dp";
import SuiLogo from "@/components/svg/sui.logo";
import Stat from "../components/league-item-stat";
import ClockIcon from "@/components/icons/clock.icon";
import LeaguesIcon from "@/components/icons/leagues.icon";
import TitleBar from "@/components/general/title-bar";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const EmptySpot = () => {
  return (
    <div
      className={cn(
        "bg-gray-800 border-[0.5px] border-dashed border-gray-300 flex flex-col items-center justify-center gap-[0.79rem] p-[0.5rem] w-[6rem] h-[5rem]",
      )}
      style={{
        boxShadow:
          "0px -8px 0px 0px #0000003D inset, 0px 8px 0px 0px #FFFFFF29 inset",
      }}
    >
      <span
        className={cn(
          "font-[700] text-[0.875rem] leading-[100%] text-gray-300",
        )}
      >
        EMPTY
      </span>
    </div>
  );
};

const LeagueDetail = () => {
  const navigate = useNavigate();
  return (
    <main className="px-[1rem] ">
      <TitleBar title="Leagues" onClick={() => navigate(-1)} />
      <div className="mt-[1.5rem]">
        <div className="bg-gray-900 py-[1.25rem] px-[1rem]">
          <div className="flex gap-[0.75rem]">
            <DefaultLeagueDp />
            <div>
              <span className="text-white font-[700] font-offbit text-[1.0625rem] leading-[100%] tracking-[0.04em]">
                MAJOR LEAGUE #2
              </span>
              <div className="flex items-center gap-[0.5rem] mt-[0.25rem]">
                <div className="flex items-baseline gap-[0.25rem]">
                  <SuiLogo
                    className="w-[1em] h-[1rem] rounded-full"
                    color="#FFFF00"
                  />
                  <span className="text-[1.0625rem] font-[700] leading-[100%] tracking-[0.04em] font-offbit text-gray-200">
                    0.7
                  </span>
                </div>
                <div className="flex items-end">
                  <BullTrophy className="size-[1.5rem]" />
                  <span className="text-[1.0625rem] font-[700] leading-[100%] tracking-[0.04em] font-offbit text-gray-200">
                    1500+
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center mt-[0.75rem]">
            <div className="flex items-center  gap-[0.5rem]">
              <Stat
                icon={<ClockIcon className="w-[1rem] h-[1rem] text-gray-300" />}
                value="5m"
              />
              <Stat
                icon={
                  <LeaguesIcon className="w-[1rem] h-[1rem] text-gray-300" />
                }
                value="0/10"
              />
              <Stat
                icon={
                  <SuiLogo className=" rounded-full w-[1rem] h-[1rem] text-gray-300" />
                }
                value="0.01"
              />
            </div>
            <span className="text-[1.0625rem] font-[700] leading-[100%] tracking-[0.04em] font-offbit text-gray-200">
              STARTS IN 3h
            </span>
          </div>
        </div>
        <div>
          <div className="flex flex-col justify-center items-center">
            <span className="font-offbit font-[700] text-[1.0625rem] leading-[100%] text-center tracking-[0.04em] text-gray-300">
              Waiting..
            </span>
            <p className="font-offbit font-[700] text-[0.875rem] leading-[100%] text-center tracking-[0.04em] text-gray-300">
              THE TOURNAMENT WILL START AUTOMATICALLY WHEN THE TIMER RUNS OUT.
              JOIN BELOW
            </p>
          </div>
          <div className="grid grid-cols-3 gap-[0.5rem] px-[2.4375rem] my-[2rem]">
            <EmptySpot />
            <EmptySpot />
            <EmptySpot />
            <EmptySpot />
            <EmptySpot />
            <EmptySpot />
          </div>
          <div className="flex gap-[1rem]">
            <Button className="w-[70%]">JOIN</Button>
            <Button variant={"secondary"}>SHARE</Button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default LeagueDetail;
