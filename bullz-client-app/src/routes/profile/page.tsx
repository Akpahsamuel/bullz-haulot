import { Button } from "@/components/ui/button";
import { useDisclosure } from "@/lib/hooks/use-diclosure";
import { useAppStore } from "@/lib/store/app-store";
import useAuth from "@/lib/hooks/use-auth";
import CopyIcon from "@/components/icons/copy.icon";
import DepositForm from "./components/deposit-form";
import WithdrawalForm from "./components/withdrawal-form";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { useState } from "react";
import CheckMarkIcon from "@/components/icons/check-mark.icon";
import { Link, useNavigate } from "react-router";
import { useCurrentAccount } from "@mysten/dapp-kit";
import ChevronLeft from "@/components/icons/chevron-right";
import SentimentComponent from "@/components/general/sentimentComponent";
import React from "react";
import ActionModal from "@/components/general/modals/action-modal";
import QuestionIcon from "@/components/icons/question.icon";
import { cn } from "@/lib/utils";
import FlameIcon from "@/components/icons/flame.icon";
import AlphaIcon from "@/components/icons/alpha.icon";
import ShillIcon from "@/components/icons/shill.icon";
import SquadIcon from "@/components/icons/squad.icon";

type Streak = {
  day: number
  status: 'logged' | 'missed' | ''
}

const ProfilePage = () => {
  const { address } = useAppStore();
  const { user, signout } = useAuth();
  const currentAccount = useCurrentAccount();
  const navigate = useNavigate();

  // Get address from multiple sources (wallet connection, app store, or auth user)
  const walletAddress = currentAccount?.address || address || user?.wallet_address || "";
  const [textToCopy] = useState<string>(walletAddress);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {

    await signout();

    navigate("/login", { replace: true });
  };
  const {
    onOpen: openDepositDrawer,
    isOpen: depositDrawerIsOpen,
    onClose: closeDepositDrawer,
  } = useDisclosure();

  const {
    onOpen: openWithdrawalDrawer,
    isOpen: withdrawalDrawerIsOpen,
    onClose: closeWithdrawalDrawer,
  } = useDisclosure();


  const [recover, setRecover] = React.useState(false)
  const [show, setShow] = React.useState(false)

  const streaks: Array<Streak> = [
    {
      day: 30,
      status: ''
    },
    {
      day: 29,
      status: ''
    },
    {
      day: 28,
      status: ''
    },
    {
      day: 27,
      status: ''
    },
    {
      day: 26,
      status: ''
    },
    {
      day: 25,
      status: ''
    },
    {
      day: 24,
      status: ''
    },
    {
      day: 23,
      status: ''
    },
    {
      day: 22,
      status: 'logged'
    },
    {
      day: 21,
      status: 'logged'
    },
    {
      day: 20,
      status: 'logged'
    },
    {
      day: 19,
      status: 'logged'
    },
    {
      day: 18,
      status: 'logged'
    },
    {
      day: 17,
      status: 'logged'
    },
    {
      day: 16,
      status: 'logged'
    },
    {
      day: 15,
      status: 'logged'
    },
    {
      day: 14,
      status: 'missed'
    },
    {
      day: 13,
      status: 'missed'
    },
    {
      day: 12,
      status: 'logged'
    },
    {
      day: 11,
      status: 'logged'
    },
    {
      day: 10,
      status: 'logged'
    },
    {
      day: 9,
      status: 'logged'
    },
    {
      day: 8,
      status: 'logged'
    },
    {
      day: 7,
      status: 'logged'
    },
    {
      day: 6,
      status: 'logged'
    },
    {
      day: 5,
      status: 'logged'
    },
    {
      day: 4,
      status: 'logged'
    },
    {
      day: 3,
      status: 'logged'
    },
    {
      day: 2,
      status: 'logged'
    },
    {
      day: 1,
      status: 'logged'
    },
  ]

  return (
    <>
      <div className="h-dvh">
        <div className="grid grid-cols-3 px-6 py-2 items-center justify-center h-12">
          <Link to={"/"} className="size-5">
            <ChevronLeft />
          </Link>
          <p className="font-offbit text-title-md uppercase font-bold text-center">Profile</p>
          <div className="ml-auto" onClick={handleLogout}>
            <p className="text-title-md text-[#FF9999] uppercase font-bold">Log out</p>
          </div>
        </div>
        <div className="p-6 h-[calc(100dvh-3rem)] overflow-x-hidden overflow-y-scroll">
          <div className="grid gap-4">
            <div className="flex gap-4">
              <div className="flex flex-col items-center gap-4">
                <div className="size-24 rounded-2xl bg-gray-700 border-4 border-white"></div>
                <p className="font-offbit text-body-sm uppercase font-bold text-gray-200">tap to change</p>
              </div>
              <div className="flex items-start flex-col gap-3">
                <div className="flex justify-center gap-2">
                  <span className="font-offbit font-bold text-heading-sm">
                    {walletAddress?.slice(0, 5)}....{walletAddress?.slice(-3)}
                  </span>
                  <CopyToClipboard text={textToCopy} onCopy={handleCopy}>
                    {copied ? (
                      <CheckMarkIcon className="size-[1.5rem] text-green-400" />
                    ) : (
                      <CopyIcon color={"#9898B3"} />
                    )}
                  </CopyToClipboard>
                </div>
                <div className="flex flex-col gap-1">
                  <SentimentComponent
                    fillPercentage={40}
                    fillColor="#00FFA1"
                    bgColor="#32324D"
                    containerWidth={210}
                    barHeight={24}
                    barWidth={3.65} />
                  <div className="flex items-center w-full gap-1">
                    <p className="font-offbit text-body-md font-bold text-gray-400 uppercase">skill</p>
                    <div className="size-4 bg-gray-400"></div>
                    <p className="font-offbit text-body-md font-bold  uppercase">legend</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="px-2 py-1 border-[0.5px] border-gray-600 bg-gray-850 flex items-center gap-1 justify-center max-w-fit">
                    <div className="size-4 bg-gray-400"></div>
                    <p className="font-offbit text-body-md uppercase font-bold">50</p>
                    <p className="font-offbit text-body-md uppercase font-bold text-gray-400">portfolio pts</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="px-2 py-1 border-[0.5px] border-gray-600 bg-gray-850 flex items-center gap-1 justify-center">
                      <AlphaIcon />
                      <p className="font-offbit text-body-md uppercase font-bold">100</p>
                      <p className="font-offbit text-body-md uppercase font-bold text-gray-400">alpha pts</p>
                    </div>
                    <div className="px-2 py-1 border-[0.5px] border-gray-600 bg-gray-850 flex items-center gap-1 justify-center">
                      <ShillIcon />
                      <p className="font-offbit text-body-md uppercase font-bold">50</p>
                      <p className="font-offbit text-body-md uppercase font-bold text-gray-400">shill pts</p>
                    </div>
                  </div>
                  <div className="px-2 py-1 border-[0.5px] border-gray-600 bg-gray-850 flex items-center gap-1 justify-center max-w-fit">
                    <FlameIcon />
                    <p className="font-offbit text-body-md uppercase font-bold">7D</p>
                    <p className="font-offbit text-body-md uppercase font-bold text-gray-400">login streak</p>
                  </div>
                </div>
              </div>
            </div>
            <Link to={"/notifications"} className="bg-gray-800 px-4 py-3 grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 justify-center mr-auto">
                <div className="size-4 bg-gray-400"></div>
                <p className="font-offbit text-body-md font-bold uppercase">notifications</p>
              </div>
              <ChevronLeft className="rotate-180 ml-auto" />
            </Link>
            <div className="bg-gray-800 px-4 py-3 grid gap-2">
              <div className="flex items-center gap-1">
                <SquadIcon />
                <p className="font-offbit text-title-sm uppercase font-bold text-gray-300">wallet balance</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-gray-400"></div>
                <p className="font-offbit text-heading-md font-bold uppercase">1,394</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => openDepositDrawer()}>Fund</Button>
                <Button className="bg-gray-700 border-gray-700" onClick={() => openWithdrawalDrawer()}>Withdraw</Button>
              </div>
            </div>
            <div className="bg-gray-800 px-4 py-3 grid gap-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <SquadIcon />
                  <p className="font-offbit text-title-sm uppercase font-bold text-gray-300">squad value</p>
                </div>
                <Button className="bg-gray-700 border-gray-700">View</Button>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-offbit text-heading-md font-bold uppercase">1,394</p>
                <p className="font-offbit text-title-lg font-bold uppercase text-gray-300">PTS</p>
              </div>
            </div>
            <div className="bg-gray-850 grid gap-5 px-4 py-5">
              <div className="flex items-center gap-2">
                <FlameIcon />
                <h1 className="font-offbit font-bold text-body-lg uppercase">8 Days login streak</h1>
              </div>
              <p className="font-offbit font-bold text-body-md uppercase text-gray-300">earn shill points every day you login. click on<br /> any missed check-in day to buy it back and<br /> restore your streak.</p>
              <div className={cn("grid grid-cols-10 gap-1 h-[calc(4rem+0.25rem)] overflow-hidden", show && "h-min")}>
                {streaks.map((el, idx) => (
                  <div
                    key={idx}
                    className={cn("size-8 grid place-content-center", el.status === 'logged' ? "bg-[#00B200] " : el.status === 'missed' ? "bg-[#E50000]" : "bg-gray-800 ")}
                    onClick={() => {
                      if (el.status === 'missed') {
                        setRecover(true)
                      }
                    }}
                  >
                    <p className={cn("font-offbit font-bold text-body-md uppercase", el.status !== '' ? "text-white" : "text-gray-500")}>{el.day}</p>
                  </div>
                ))}
              </div>
              <button className="font-offbit font-bold text-body-md underline uppercase text-gray-200" onClick={() => setShow(!show)}>{show ? "Show less" : "show more"}</button>
            </div>
            <div className="grid gap-4 py-5">
              <p className="font-offbit text-title-sm font-bold uppercase text-gray-300">Previous competitions</p>
              <div className="grid gap-2">
                <div className="bg-gray-850 px-4 py-3 grid grid-cols-2">
                  <div className="flex items-center gap-1">
                    <div className="size-4 bg-gray-400"></div>
                    <p className="font-offbit font-bold uppercase text-body-md">gameweek 1</p>
                  </div>
                  <div className="flex items-center gap-1 ml-auto">
                    <p className="font-offbit font-bold uppercase text-body-md">1,394</p>
                    <p className="font-offbit font-bold uppercase text-body-md text-gray-300">pts</p>
                  </div>
                </div>
              </div>
            </div>

            {/* <div className="flex items-center gap-[1rem]">
            <UserPlayerDp imageUrl="/public/images/weird-nft.jpg" />
            <div>
              <div className="flex items-center gap-[0.5rem] ">

              </div>
              <div className="flex items-center gap-[1.0625rem] font-[700] my-[0.25rem]">
                <div className="flex items-baseline">
                  <BullTrophy width={24} height={24} />
                  <span className="text-[1.375rem] leading-[100%] tracking-[0.04em] font-offbit">
                    1,454
                  </span>
                </div>
                <div className="flex items-baseline gap-[1.5px]">
                  <CrownIcon
                    className="w-[1.375rem] h-[1.125rem]"
                    color="#FFFF00"
                  />
                  <span className="text-[1.375rem] leading-[100%] tracking-[0.04em] font-offbit">
                    7
                  </span>
                </div>
              </div>
              <span className="text-font-subtext font-[700] text-[0.875rem] leading-[100%] tracking-[0.04em] font-offbit">
                TAP TO CHANGE PICTURE
              </span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-[1rem] mt-[2rem]">
            <Button
              variant={"secondary"}
              className="w-1/2"
              onClick={() => openWithdrawalDrawer()}
            >
              WITHDRAW
            </Button>
            <Button
              variant={"secondary"}
              className="w-1/2"
              onClick={() => openDepositDrawer()}
            >
              DEPOSIT
            </Button>
          </div> */}
            {/* <div className="mt-[2rem]">
            <span className="font-offbit font-[700] text-[1.0625rem] leading-[100%] text-gray-300 tracking-[0.04em] uppercase mb-[1rem] block ">
              Horns you've locked
            </span>
            <Tabs defaultValue="live" className="w-full mx-auto ">
              <TabsList className="bg-gray-850 mx-auto w-full">
                <TabsTrigger
                  className="font-offbit rounded-none text-[1.0625rem] font-[700] leading-[100%] tracking-[0.04em] text-center"
                  value="live"
                >
                  LIVE (999+)
                </TabsTrigger>
                <TabsTrigger
                  className="font-offbit rounded-none text-[1.0625rem] font-[700] leading-[100%] tracking-[0.04em] text-center"
                  value="won"
                >
                  WON (12)
                </TabsTrigger>
                <TabsTrigger
                  className="font-offbit rounded-none text-[1.0625rem] font-[700] leading-[100%] tracking-[0.04em] text-center"
                  value="lost"
                >
                  LOST (8)
                </TabsTrigger>
              </TabsList>

              <TabsContent value="live" className="px-0">
                <div className="gap-1">
                  <LiveHornItem hornAmount="30" hornTime="60s" />
                  <LiveHornItem hornAmount="30" hornTime="60s" />
                </div>
              </TabsContent>

              <TabsContent value="won" className="px-0">
                <></>
              </TabsContent>

              <TabsContent value="lost" className="px-0">
                <></>
              </TabsContent>
            </Tabs>
          </div> */}
          </div>

          <DepositForm
            isOpen={depositDrawerIsOpen}
            onClose={closeDepositDrawer}
            onOpen={() => openDepositDrawer()}
          />

          <WithdrawalForm
            isOpen={withdrawalDrawerIsOpen}
            onClose={closeWithdrawalDrawer}
            onOpen={() => openWithdrawalDrawer()}
          />

          <ActionModal isOpen={recover} onClose={() => setRecover(false)}>
            <div className="grid gap-4">
              <QuestionIcon className="mx-auto" />
              <h1 className="text-center uppercase font-bold font-offbit text-[22px] leading-[100%] tracking-[4%]">Recover Streak</h1>
              <p className="text-center uppercase font-bold font-offbit text-[17px] leading-[100%] tracking-[4%] text-[#9898B3]">Your streak broke! use 1 usdc to restore it and recover rewards for that day.</p>
              <Button className="w-full">Recover with 1 usdc</Button>
              <Button className="w-full bg-gray-700 border-gray-700" onClick={() => setRecover(false)}>Cancel</Button>
            </div>
          </ActionModal>
        </div>
      </div >
    </>
  );
};

export default ProfilePage;
