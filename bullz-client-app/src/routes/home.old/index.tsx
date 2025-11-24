//@ts-nocheck
import NavWrapper from "@/components/layout/nav-wrapper";
import { Button } from "@/components/ui/button";
import { useDisclosure } from "@/lib/hooks/use-diclosure";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import SetHornBid from "./components/set-horn-bid";
import { useGetUserSquads } from "@/lib/hooks/use-squad-contract";
import { useGetUserBids } from "@/lib/hooks/use-create-bidding";
import { SquadResponseItem } from "../squad/api-services/types";
import AddNewSquadButton from "../squad.old/components/add-new-squad-button";
import Pitch from "../squad.old/components/pitch";
import SquadItem from "../squad.old/components/squad-item";
import { formationLayouts } from "../squad/constants";
import { FormationLayoutKey } from "../squad/types";
import { useNavigate } from "react-router";
import { useMemo, useEffect } from "react";
import { useGetPriceList } from "@/common-api-services/token-price.ts";

export interface HornForm {
  wager_amount: number;
  time_limit: number;
  squad: SquadResponseItem;
}

export default function Home() {
  const { data: userSquads, isLoading } = useGetUserSquads();
  const { data: userBids, isLoading: isLoadingBids } = useGetUserBids();
  const { data: priceList } = useGetPriceList();
  const navigate = useNavigate();

  // Helper function to find token data by player address
  const findTokenData = (playerAddress: string) => {
    if (!priceList || priceList.length === 0) {
      return null;
    }
    // Only match by address
    return priceList.find(token => token.coinAddress === playerAddress) || null;
  };

  // Convert SquadData[] to SquadResponse format for compatibility
  const squadData = useMemo(() => {
    if (!userSquads || userSquads.length === 0) {
      return { data: [] };
    }

    if (!priceList || priceList.length === 0) {
      return { data: [] };
    }

    const convertedSquads: SquadResponseItem[] = userSquads.map(squad => {
      // Use the actual formation from the squad data instead of hardcoding
      const formation = squad.formation as FormationLayoutKey;
      const layout = formationLayouts[formation] || formationLayouts.OneThreeTwoOne; // fallback
      
      // Map players to positions without multipliers
      const players = squad.players.slice(0, 7).map((playerName, index) => {
        const position = index + 1; // Simple position numbering
        
        // Find the token data using the findTokenData function
        const tokenData = findTokenData(playerName);
        
        return {
          id: `${squad.squad_id}-${position}`,
          name: playerName,
          position: position,
          squad_id: squad.squad_id.toString(),
          token_price_id: tokenData?.coinAddress || playerName,
          multiplier: 1.0, // Default multiplier
          imageUrl: tokenData?.imageUrl, // Add the token image URL
        };
      });

      return {
        squad: {
          id: squad.squad_id.toString(),
          name: squad.name,
          owner_id: squad.owner,
          wallet_address: squad.owner,
          formation: formation, // Use the actual formation
          total_value: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        players: players
      };
    });

    return { data: convertedSquads };
  }, [userSquads, priceList]); // Add priceList as dependency

  const form = useForm<HornForm>({
    defaultValues: {
      squad: {
        squad: {
          id: "",
          name: "",
          owner_id: "",
          wallet_address: "",
          formation: "OneThreeTwoOne",
          total_value: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        players: [],
      },
      wager_amount: 1,
      time_limit: 60, // 1 minute in seconds
    },
  });

  const { isOpen, onOpen, onClose } = useDisclosure();

  const squadWatch = useWatch({
    control: form.control,
    name: "squad",
  });

  // Auto-set the first squad when squads are loaded and no squad is currently selected
  useEffect(() => {
    if (squadData?.data && squadData.data.length > 0 && (!squadWatch?.squad?.id || squadWatch.squad.id === "")) {
      const firstSquad = squadData.data[0];
      form.setValue("squad", firstSquad);
    }
  }, [squadData?.data, squadWatch?.squad?.id, form]);

  // Initialize form when userSquads data becomes available
  useEffect(() => {
    if (userSquads && userSquads.length > 0 && (!squadWatch?.squad?.id || squadWatch.squad.id === "") && priceList && priceList.length > 0) {
      const firstSquad = userSquads[0];
      const formation = firstSquad.formation as FormationLayoutKey;
      
      // Map players to positions without multipliers
      const players = firstSquad.players.slice(0, 7).map((playerName, index) => {
        const position = index + 1; // Simple position numbering
        
        // Find the token data using the findTokenData function
        const tokenData = findTokenData(playerName);
        
        return {
          id: `${firstSquad.squad_id}-${position}`,
          name: playerName,
          position: position,
          squad_id: firstSquad.squad_id.toString(),
          token_price_id: tokenData?.coinAddress || playerName,
          multiplier: 1.0, // Default multiplier
          imageUrl: tokenData?.imageUrl,
        };
      });

      form.setValue("squad", {
        squad: {
          id: firstSquad.squad_id.toString(),
          name: firstSquad.name,
          owner_id: firstSquad.owner,
          wallet_address: firstSquad.owner,
          formation: formation,
          total_value: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        players: players
      });
    }
  }, [userSquads, squadWatch?.squad?.id, form, priceList]);

  const hasActiveBids = userBids && userBids.length > 0;

  const onSubmit = form.handleSubmit((data) => {
    // router.push("/session");
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="font-offbit text-white">Loading squads...</p>
      </div>
    );
  }

  return (
    <NavWrapper>
      <></>
      <FormProvider {...form}>
        <form
          id="submit-bid-form"
          className="flex flex-col justify-between "
          onSubmit={onSubmit}
        >
          <div className="flex max-w-[23.875rem] mx-auto items-center justify-between h-[3.5rem] w-full mb-[0.5625rem] bg-gray-850 p-[0.5rem] border border-gray-700">
            <div>
              <p className="font-offbit text-[1.375rem] font-[700] leading-[100%] mb-[0.25rem] capitalize">
                {squadWatch?.squad.name || "Select Squad"}
              </p>
              <span className="block text-gray-400 text-[0.875rem] font-[700] leading-[100%] tracking-[0.04em]">
                10% WIN RATE
              </span>
            </div>
            <Button
              type="button"
              className="h-[2.5rem] px-[1.5rem]"
              onClick={() => onOpen()}
              disabled={!squadWatch?.squad?.id}
            >
              PLAY NOW
            </Button>
          </div>

          {squadWatch && (
            <Pitch
              layout={
                formationLayouts[
                  squadWatch?.squad.formation as FormationLayoutKey
                ]
              }
              players={squadWatch?.players}
              onPlayerClick={(player) => {
                // Handle player click
              }}
              ctaLabel=""
            />
          )}

          <div
            style={{
              boxShadow: "0px 4px 0px 0px #FFFFFF29 inset",
            }}
            className="bg-gray-850  w-full px-[1.5rem] py-[1rem] "
          >
            <span className="text-gray-300 font-[700] font-offbit block text-[0.875rem] leading-[100%] mb-[0.5rem] ">
              YOUR BULLZ
            </span>
            <div className="flex items-center gap-[0.5rem] ">
              <div className="flex items-center gap-[0.5rem] w-min overflow-x-scroll ">
                {squadData?.data.map((squad, index) => (
                  <SquadItem
                    key={squad.squad.id}
                    onClick={() => {
                      form.setValue("squad", squad);
                    }}
                    team={squad}
                    selected={squadWatch?.squad.id === squad.squad.id}
                    life={userSquads?.[index]?.life}
                  />
                ))}
              </div>
              <AddNewSquadButton
                onClick={() => navigate("squad/new")}
                classNames="h-[6rem] w-[6rem]"
              />
            </div>
          </div>

          <SetHornBid isOpen={isOpen} onClose={onClose} />
        </form>
      </FormProvider>
    </NavWrapper>
  );
}
