import UserPlayerDp from "@/components/general/user-player-dp";
import SuiLogo from "@/components/svg/sui.logo";

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
    </div>
  );
};

const LiveHornItem = ({
  hornAmount,
  hornTime,
}: {
  hornAmount: string;
  hornTime: string;
}) => {
  return (
    <div className="flex items-center justify-between w-full py-[1.5rem] px-[0.5rem] border-b border-[#1F1F33]">
      <Player />
      <div className="w-full">
        <div className="flex justify-center gap-[0.25rem] items-start">
          <SuiLogo className="w-[1.25rem] h-[1.25rem] rounded-full" />
          <span className="text-[1.375rem] font-[700] font-offbit tracking-[0.04em] leading-[100%]">
            {hornAmount}
          </span>
        </div>
        <div className="font-[700] w-full text-center flex items-center justify-center h-[2.25rem]  bg-gradient-to-l from-[#000019] via-[#1F1F33] to-[#000019]">
          {hornTime}
        </div>
      </div>
      <Player />
    </div>
  );
};
export default LiveHornItem;
