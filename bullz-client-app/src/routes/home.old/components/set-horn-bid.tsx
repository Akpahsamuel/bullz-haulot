"use client";

import GameController from "@/components/icons/game-controller";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import BullHornBid from "./bull-horn-bid";
import FreeHornBid from "./free-horn-bid";
import LockedHorns from "./locked-horns";
import BottomSheet from "@/components/general/bottom-sheet";
import { useCreateBid, useGetUserBids } from "@/lib/hooks/use-create-bidding";
import { HornForm } from "../index";

interface SetHornBidProps {
  isOpen: boolean;
  onClose: () => void;
}

const SetHornBid = (props: SetHornBidProps) => {
  const formContext = useFormContext<HornForm>();
  const createBid = useCreateBid();
  const { refetch: refetchUserBids } = useGetUserBids();
  
  const squadWatch = useWatch({ control: formContext.control, name: "squad" });
  const wagerAmountWatch = useWatch({
    control: formContext.control,
    name: "wager_amount",
  });
  const timeLimitWatch = useWatch({
    control: formContext.control,
    name: "time_limit",
  });

  const [isLocked, setIsLocked] = useState(false);
  const [currentTab, setCurrentTab] = useState("bull-run");

  const handleLockHorns = async () => {
    try {
      if (!squadWatch?.squad?.id) {
        alert("Please select a squad first!");
        return;
      }

      if (currentTab === "bull-run") {
        // Bull-run mode: Create actual bid with wager
        if (!wagerAmountWatch || !timeLimitWatch) {
          alert("Please set wager amount and time limit!");
          return;
        }

        // Convert time from seconds to milliseconds (the form stores time in seconds)
        const timeInMilliseconds = timeLimitWatch * 1000;
        
        // Convert SUI to MIST (1 SUI = 1,000,000,000 MIST)
        const bidAmountInMist = wagerAmountWatch * 1_000_000_000;

        await createBid.mutateAsync({
          squadId: Number(squadWatch.squad.id),
          bidAmount: bidAmountInMist, // Pass MIST amount to contract
          duration: timeInMilliseconds, // Pass milliseconds to contract
        });
        
        // Refetch user bids to update the tracking
        await refetchUserBids();
      } else {
        // Free-run mode: Just simulate locking without real bid
      }
      
      setIsLocked(true);
    } catch (error) {
      alert("Failed to create bid. Please try again.");
    }
  };

  return (
    <>
      <BottomSheet isOpen={props.isOpen} onClose={props.onClose}>
        <div>
          <div className="space-y-[1rem] flex flex-col items-center">
            <GameController />
            <p className="font-offbit text-white text-[1.375rem] font-[700] leading-[100%] tracking-[0.04em]">
              LOCK HORNS
            </p>
          </div>
          {!isLocked && (
            <>
              <Tabs
                defaultValue="bull-run"
                value={currentTab}
                onValueChange={setCurrentTab}
                className="w-full mx-auto mt-[1rem]"
              >
                <TabsList className="bg-gray-850 mx-auto w-full">
                  <TabsTrigger
                    className="font-offbit rounded-none text-[1.0625rem] font-[700] leading-[100%] tracking-[0.04em] text-center"
                    value="bull-run"
                  >
                    BULL-RUN
                  </TabsTrigger>
                  <TabsTrigger
                    className="font-offbit rounded-none text-[1.0625rem] font-[700] leading-[100%] tracking-[0.04em] text-center"
                    value="free-run"
                  >
                    FREE-RUN
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="bull-run" className="px-0">
                  <BullHornBid />
                </TabsContent>
                <TabsContent value="free-run" className="px-0">
                  <FreeHornBid />
                </TabsContent>
              </Tabs>
              <div className="w-full space-y-[1rem] mt-[1rem] ">
                <Button
                  type="button"
                  className="w-full text-[1.0625rem] cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleLockHorns();
                  }}
                  disabled={createBid.isPending}
                  style={{ pointerEvents: 'auto' }}
                >
                  {createBid.isPending ? "CREATING BID..." : "LOCK HORNS"}
                </Button>
                
                <Button
                  type="button"
                  className="w-full text-[1.0625rem]"
                  variant={"secondary"}
                  onClick={props.onClose}
                >
                  CANCEL
                </Button>
              </div>
            </>
          )}
          {isLocked && (
            <LockedHorns 
              onCancel={() => {
                setIsLocked(false);
                props.onClose();
              }} 
              squadId={squadWatch?.squad?.id ? Number(squadWatch.squad.id) : undefined}
            />
          )}
        </div>
      </BottomSheet>
    </>
  );
};

export default SetHornBid;
