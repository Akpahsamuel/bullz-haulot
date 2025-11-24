import { Button } from "@/components/ui/button"
import Pitch, { Multiplier, Postition } from "./pitch"
import { Link, useNavigate } from "react-router"
import UnlockIcon from "@/components/icons/unlock.icon"
import SquadIcon from "@/components/icons/squad.icon"
import React from "react"
import BottomSheet from "@/components/general/bottom-sheet"
import { formationLayouts } from "../constants"
import { useDisclosure } from "@/lib/hooks/use-diclosure"
import { SquadData } from "@/lib/hooks/use-squad-contract"
import { IPlayer } from "../types"
import { useVaults } from "@/hooks/useVaults"

interface FilledSquadProps {
    userSquads: SquadData[];
}

const FilledSquad = ({ userSquads }: FilledSquadProps) => {
    const [showLockModal, setShowLockModal] = React.useState(false)
    const navigate = useNavigate();
    const {
        onOpen,
    } = useDisclosure<{ focusedPosition: [Postition, Multiplier] }>();
    

    const { data: vaults } = useVaults();
    const vaultMap = React.useMemo(() => {
        if (!vaults) return new Map();
        return new Map(vaults.map(vault => [vault.symbol, vault]));
    }, [vaults]);

    
    const currentSquad = userSquads[0];
    const isLocked = currentSquad?.locked || false;

   
    const getFormationLayout = (formation: string) => {
        switch (formation) {
            case "OneThreeTwoOne":
                return formationLayouts.OneThreeTwoOne;
            case "OneTwoThreeOne":
                return formationLayouts.OneTwoThreeOne;
            case "OneTwoTwoTwo":
                return formationLayouts.OneTwoTwoTwo;
            case "OneThreeOneTwo":
                return formationLayouts.OneThreeOneTwo;
            case "OneTwoOneThree":
                return formationLayouts.OneTwoOneThree;
            default:
                return formationLayouts.OneThreeOneTwo; 
        }
    };

    const layout = getFormationLayout(currentSquad?.formation || "OneThreeOneTwo");


    const convertToPlayers = (squad: SquadData): IPlayer[] => {
        if (!squad.players || squad.players.length === 0) return [];
        
        return squad.players.map((playerSymbol, index) => {
            const position = index + 1; 
            const multiplier = layout.flat().find(([pos]) => pos === position)?.[1] || 1.0;
            const vault = vaultMap.get(playerSymbol);
            
            return {
                position,
                multiplier,
                name: playerSymbol,
                token_price_id: playerSymbol,
                imageUrl: vault?.imageUrl,
                allocated_value: 1, 
            };
        });
    };

    const players = convertToPlayers(currentSquad);

    return (
        <>
            <div className="grid gap-6 p-6">
                <div className="flex items-center justify-center gap-1">
                    <UnlockIcon />
                    <p className="font-offbit font-bold text-[17px] leading-[100%] tracking-[4%] uppercase text-gray-300">
                        {currentSquad?.name || "Squad"} - {isLocked ? "Locked" : "Active"}
                    </p>
                    <button className="font-offbit font-bold text-[17px] leading-[100%] tracking-[4%] uppercase underline" >Learn More</button>
                </div>
                <div className="px-4 py-2 bg-gray-700" style={{
                    backgroundImage: "linear-gradient(to left, #000019, #00000000, #000019)"
                }}>
                    <div className="flex items-center justify-center gap-1 mb-2">
                        <SquadIcon height={16} width={16} />
                        <p className="font-offbit font-bold text-[14px] leading-[100%] tracking-[4%] uppercase text-gray-300">Squad points</p>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <p className="font-offbit font-bold text-[32px] leading-[100%] tracking-[4%] uppercase ">1,923</p>
                        <p className="font-offbit font-bold text-[32px] leading-[100%] tracking-[4%] uppercase text-gray-300">PTS</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 w-full">
                    <Button 
                        className="w-1/2" 
                        onClick={() => {
                            if (isLocked) {
                                setShowLockModal(true);
                            } else if (currentSquad?.squad_id) {
                                navigate(`/squad/edit/${String(currentSquad.squad_id)}`);
                            }
                        }}
                        disabled={isLocked || !currentSquad?.squad_id}
                    >
                        Edit squad
                    </Button>
                    <Link to={"/ranking"} className="w-1/2">
                        <Button className="bg-gray-700 border-gray-700 w-full">Ranking</Button>
                    </Link>
                </div>
            </div>
            <div>
                <Pitch
                    layout={layout}
                    players={players}
                    onPlayerClick={(player) => {
                        onOpen({
                            data: {
                                focusedPosition: [player.position, player.multiplier],
                            },
                        });
                    }}
                    onEmptyPlayerClick={(pos) => {
                        onOpen({ data: { focusedPosition: pos } });
                    }}
                    ctaLabel="Proceed"
                />
            </div>
            <BottomSheet isOpen={showLockModal} onClose={() => setShowLockModal(false)}>
                <div className="grid gap-6">
                    <p className="font-offbit font-bold leading-[100%] tracking-[4%] text-[22px] uppercase text-center">squad locked</p>
                    <p className="font-offbit font-bold leading-[100%] tracking-[4%] text-[17px] uppercase text-center text-[#9898B3]">Your squad is locked for the current competition. changes you make will only apply to the next competition</p>
                    <div className="grid gap-2">
                        <p className="font-offbit font-bold leading-[100%] tracking-[4%] text-[17px] uppercase text-center text-[#9898B3]">next competition starts…</p>
                        <div className="flex items-center justify-center gap-1">
                            <div
                                className="size-12 bg-white relative"
                                style={{ boxShadow: "0px -4px 0px 0px #0000003D inset,  0px 4px 0px 0px #FFFFFF29 inset" }}
                            >
                                <p className="font-offbit font-bold text-black leading-[100%] tracking-[4%] text-[17px] absolute inset left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">00</p>
                            </div>
                            <p>:</p>
                            <div
                                className="size-12 bg-white relative"
                                style={{ boxShadow: "0px -4px 0px 0px #0000003D inset,  0px 4px 0px 0px #FFFFFF29 inset" }}
                            >
                                <p className="font-offbit font-bold text-black leading-[100%] tracking-[4%] text-[17px] absolute inset left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">22</p>
                            </div>
                            <p>:</p>
                            <div
                                className="size-12 bg-white relative"
                                style={{ boxShadow: "0px -4px 0px 0px #0000003D inset,  0px 4px 0px 0px #FFFFFF29 inset" }}
                            >
                                <p className="font-offbit font-bold text-black leading-[100%] tracking-[4%] text-[17px] absolute inset left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">55</p>
                            </div>
                            <p>:</p>
                            <div
                                className="size-12 bg-white relative"
                                style={{ boxShadow: "0px -4px 0px 0px #0000003D inset,  0px 4px 0px 0px #FFFFFF29 inset" }}
                            >
                                <p className="font-offbit font-bold text-black leading-[100%] tracking-[4%] text-[17px] absolute inset left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">23</p>
                            </div>
                        </div>
                    </div>
                    <Button onClick={() => setShowLockModal(false)}>okay</Button>
                </div>
            </BottomSheet>
        </>
    )
}

export default FilledSquad