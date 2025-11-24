import PlusIcon from "@/components/icons/plus.icon";
import { cn } from "@/lib/utils";
import { ClassNameValue } from "tailwind-merge";

interface Props {
  onClick: (pos: number) => void;
  multiplier: number;
  pos: number;
  classNames?: ClassNameValue;
}

const EmptyPlayerButton = (props: Props) => {
  return (
    <div className="flex flex-col-reverse items-center justify-center ">
      <div
        key={props.pos}
        style={{
          boxShadow:
            "0px -8px 0px 0px #0000003D inset, 0px 8px 0px 0px #FFFFFF29 inset, 0px 12px 20px 0px #00000066",
        }}
        className={cn(
          "w-[5.5rem] h-[5.5rem] rounded-full bg-white cursor-pointer border-[4.4px] border-gray-100 flex items-center justify-center ",
          props.classNames
        )}
        onClick={() => props.onClick && props.onClick(props.pos)}
      >
        <PlusIcon color="#474766" />
      </div>
    </div>
  );
};

export default EmptyPlayerButton;
