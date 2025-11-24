import ClockIcon from "@/components/icons/clock.icon";
import LeaguesIcon from "@/components/icons/leagues.icon";
import BullTrophy from "@/components/svg/bull-trophy";
import DefaultLeagueDp from "@/components/svg/default-league-dp";
import SuiLogo from "@/components/svg/sui.logo";
import Stat from "./league-item-stat";

const LeagueItem = () => {
  return (
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
            icon={<LeaguesIcon className="w-[1rem] h-[1rem] text-gray-300" />}
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
  );
};

export default LeagueItem;
