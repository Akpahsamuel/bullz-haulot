import Bullfy from "@/components/svg/bullfy";
import { SquadResponseItem } from "../../squad/api-services/types";
import { cn } from "@/lib/utils";

interface SquadItemProps {
  onClick: () => void;
  team: SquadResponseItem;
  selected: boolean;
  life?: number;
}

const SquadItem = (props: SquadItemProps) => {
  const squadLife = props.life ?? 0; // Leave at 0 if missing
  const maxLife = 5;

  const color = squadLife >= 4 ? "bg-[#00FF00]" : squadLife === 3 ? "bg-yellow-400" : "bg-red-500";
  
  const lifeIndicators = Array.from({ length: maxLife }, (_, index) => {
    const isActive = index < squadLife;
    return (
      <span 
        key={index}
        className={cn(
          "h-[0.5rem] w-[0.125rem]",
          isActive ? color : "bg-gray-500"
        )} 
      />
    );
  });

  return (
    <>
      <div
        onClick={props.onClick}
        style={{
          boxShadow:
            "0px -8px 0px 0px #0000003D inset, 0px 8px 0px 0px #FFFFFF29 inset",
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-[0.5rem]  cursor-pointer w-[6rem] h-[6rem] py-[0.75rem]",
          {
            "bg-gray-600": props.selected,
            "bg-gray-800": !props.selected,
          }
        )}
      >
        <Bullfy width={20} height={20} />
        <span className="text-white block text-[0.875rem] font-[700] font-offbit leading-[100%] tracking-[0.04em] uppercase">
          {props.team.squad.name}
        </span>
        <div className="flex flex-col gap-[0.5rem] items-center w-[5.685rem]">
          <div className="gap-[0.25rem] flex">
            <span className="text-[0.875rem] font-[700] font-offbit leading-[100%] tracking-[0.04em] uppercase text-white">
              LIFE: {squadLife}
            </span>
          </div>
          <div className="flex items-center gap-[0.125rem]">
            {lifeIndicators}
          </div>
        </div>
      </div>
    </>
  );
};

export default SquadItem;
