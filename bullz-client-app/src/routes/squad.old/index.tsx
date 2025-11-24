// import CreateBullModal from "@/components/general/modals/create-bull-modal";
// import NotificationModal from "@/components/general/modals/notify";
// import PriceList from "@/components/general/token/price-list";
// import NavWrapper from "@/components/layout/nav-wrapper";
// import { useDisclosure } from "@/lib/hooks/use-diclosure";
// import { NotificationStatus } from "@/lib/hooks/use-notifications-modal";
// import {   useGetUserSquads } from "@/lib/hooks/use-squad-contract";
// import { useCurrentAccount } from "@mysten/dapp-kit";
// import { useGetPriceList } from "@/common-api-services/token-price.ts";
// import { useAppStore } from "@/lib/store/app-store";

// import { useEffect, useState, useMemo } from "react";
// import { useNavigate } from "react-router";
// import AddNewSquadButton from "./components/add-new-squad-button";
// import SquadItem from "./components/squad-item";
// import Pitch from "./components/pitch";
// import { SquadResponseItem } from "./api-services/types";
// import { formationLayouts } from "../squad/constants";
// import { FormationLayoutKey } from "../squad/types";

// const SquadPage = () => {
//   const { onOpen, onClose, isOpen } = useDisclosure();
//   const {
//     onOpen: openNotification,
//     isOpen: notificationIsOpen,
//     onClose: closeNotification,
//     disclosedData: notificationStatus,
//   } = useDisclosure<NotificationStatus>();
//   const [isCreating] = useState(false);
//   const [selectedSquadId, setSelectedSquadId] = useState<number | null>(null);
//   const navigate = useNavigate();
//   const {
//     isOpen: guideIsOpen,
//     onClose: closeGuide,
//     onOpen: openGuide,
//   } = useDisclosure();

//   const currentAccount = useCurrentAccount();
//   const { address: zkLoginAddress } = useAppStore();
//   // const { data: feeData, isLoading: isLoadingFee } = useGetSquadCreationFee();
//   // const { data: canCreate, isLoading: isCheckingBalance } = useCanCreateSquad();
//   const { data: userSquads, isLoading: isLoadingSquads, error: squadsError } = useGetUserSquads();
//   const { data: priceList } = useGetPriceList(); // ← Now using Aftermath SDK for coin metadata and images
  
//   // Support both wallet and zkLogin
//   const userAddress = currentAccount?.address || zkLoginAddress;

//   const convertedSquads: SquadResponseItem[] = useMemo(() => {
//     if (!userSquads) return [];
    
//     return userSquads.map(squad => {
//       const formation = squad.formation as FormationLayoutKey;
//       const layout = formationLayouts[formation] || formationLayouts.OneThreeTwoOne;
//       const allPositions: [number, number][] = layout.flat().map(posArray => [posArray[0], posArray[1]] as [number, number]);
      
//       const players = squad.players.slice(0, 7).map((playerName, index) => {
//         const [position, multiplier] = allPositions[index] || [index + 1, 1.0];
//         const tokenData = priceList?.find(token => 
//           token.coinAddress === playerName
//         );
        
//         return {
//           id: `${squad.squad_id}-${position}`,
//           name: playerName,
//           position: position,
//           squad_id: squad.squad_id.toString(),
//           token_price_id: tokenData?.coinAddress || playerName,
//           multiplier: multiplier,
//           imageUrl: tokenData?.imageUrl || undefined,
//         };
//       });

//       return {
//         squad: {
//           id: squad.squad_id.toString(),
//           name: squad.name,
//           owner_id: squad.owner,
//           wallet_address: squad.owner,
//           formation: formation,
//           total_value: 0,
//           created_at: new Date().toISOString(),
//           updated_at: new Date().toISOString(),
//         },
//         players: players
//       };
//     });
//   }, [userSquads, priceList]);

//   const selectedSquad = convertedSquads.find(squad => Number(squad.squad.id) === selectedSquadId);

//   const handleAddButtonClick = () => {
//     onClose();
//     if (!canCreate) {
//       openNotification({ data: "error" });
//     } else {
//       openNotification({ data: "success" });
//     }
//   };

//   useEffect(() => {
//     if (window && !localStorage.getItem("understood-how-to-play")) {
//       openGuide();
//     }
//   }, []);

//   const isLoading = isLoadingFee || isCheckingBalance;
//   const displayFee = feeData ? feeData.feeInSui.toFixed(3) : "...";
  
//   // Allow button for both wallet and zkLogin users
//   const shouldDisableCreation = isLoading || !canCreate || !userAddress;

//   return (
//     <NavWrapper>
//       <>
//         <div className="flex flex-col h-full justify-between relative">
//           {selectedSquad ? (
//             <div className="flex-1 flex flex-col items-center justify-center px-[1.5rem]">
//               <div className="mb-4">
//                 <h2 className="text-white font-offbit text-[1.375rem] font-[700] text-center mb-2">
//                   {selectedSquad.squad.name}
//                 </h2>
                
//                 <div className="bg-gray-800 rounded-lg p-4 mb-4">
//                   <div className="flex items-center justify-center gap-4 mb-3">
//                     <div className="text-center">
//                       <p className="text-gray-400 text-sm">SQUAD LIFE</p>
//                       <p className="text-white font-offbit font-[700] text-xl">
//                         {(() => {
//                           const lifeVal = userSquads?.find(s => s.squad_id.toString() === selectedSquad.squad.id)?.life;
//                           const life = lifeVal ?? 0;
//                           return `${life} / 5`;
//                         })()}
//                       </p>
//                     </div>
//                     <div className="flex items-center gap-1">
//                       {Array.from({ length: 5 }, (_, index) => {
//                         const lifeVal = userSquads?.find(s => s.squad_id.toString() === selectedSquad.squad.id)?.life;
//                         const currentLife = lifeVal ?? 0;
//                         const isActive = index < currentLife;
//                         const color = currentLife >= 4 ? 'bg-green-500' : currentLife === 3 ? 'bg-yellow-400' : 'bg-red-500';
//                         return (
//                           <div 
//                             key={index}
//                             className={`w-3 h-6 rounded ${isActive ? color : 'bg-gray-600'}`}
//                           />
//                         );
//                       })}
//                     </div>
//                   </div>
                  
//                   <div className="text-center">
//                     {(() => {
//                       const lifeVal = userSquads?.find(s => s.squad_id.toString() === selectedSquad.squad.id)?.life;
//                       const squadLife = lifeVal ?? 0;
//                       const deathTime = userSquads?.find(s => s.squad_id.toString() === selectedSquad.squad.id)?.death_time;
                      
//                       if (squadLife === 0) {
//                         return (
//                           <div className="text-red-400">
//                             <p className="font-[700] text-sm">SQUAD DEFEATED</p>
//                             {deathTime && (
//                               <p className="text-xs">
//                                 Defeated: {new Date(deathTime).toLocaleDateString()}
//                               </p>
//                             )}
//                           </div>
//                         );
//                       } else if (squadLife === 3) {
//                         return (
//                           <p className="text-yellow-400 font-[700] text-sm">
//                             ⚠️ SQUAD IN DANGER
//                           </p>
//                         );
//                       } else if (squadLife <= 2) {
//                         return (
//                           <p className="text-red-400 font-[700] text-sm">
//                             ❗ SQUAD CRITICAL
//                           </p>
//                         );
//                       } else {
//                         return (
//                           <p className="text-green-400 font-[700] text-sm">
//                             ✅ SQUAD HEALTHY
//                           </p>
//                         );
//                       }
//                     })()}
//                   </div>
//                 </div>
                
//                 <p className="text-gray-400 text-center text-sm">
//                   Click "Edit Squad" to modify players or "Back" to return
//                 </p>
//               </div>
              
//               <Pitch
//                 layout={formationLayouts[selectedSquad.squad.formation as FormationLayoutKey]}
//                 players={selectedSquad.players}
//                 onPlayerClick={() => {
//                   // Handle player click
//                 }}
//                 ctaLabel="Edit Squad"
//                 ctaOnClick={() => navigate(`/squad/edit/${selectedSquad.squad.id}`)}
//               />
              
//               <div className="mt-4">
//                 <button
//                   onClick={() => setSelectedSquadId(null)}
//                   className="text-gray-400 hover:text-white transition-colors"
//                 >
//                   ← Back to squads
//                 </button>
//               </div>
//             </div>
//           ) : (
//             <div className="h-[70dvh] overflow-y-scroll px-[1.5rem]">
//               <PriceList />
//             </div>
//           )}

//           <div
//             style={{
//               boxShadow: "0px 4px 0px 0px #FFFFFF29 inset",
//             }}
//             className="bg-gray-850 min-h-[9.5rem] w-full p-[1.5rem] py-0 flex flex-col justify-center"
//           >
//             <span className="text-gray-300 font-[700] block text-[0.875rem] leading-[100%] mb-[0.5rem]">
//               YOUR BULLZ
//             </span>
            
//             {isLoadingSquads ? (
//               <div className="flex items-center">
//                 <span className="text-gray-400 text-sm">Loading squads...</span>
//               </div>
//             ) : squadsError ? (
//               <div className="flex items-center">
//                 <span className="text-red-400 text-sm">Error loading squads</span>
//               </div>
//             ) : convertedSquads.length > 0 ? (
//               <div className="flex items-center gap-[0.5rem] overflow-x-auto">
//                 <div className="flex items-center gap-[0.5rem]">
//                   {convertedSquads.map((squad, index) => (
//                     <SquadItem
//                       key={squad.squad.id}
//                       onClick={() => {
//                         setSelectedSquadId(Number(squad.squad.id));
//                       }}
//                       team={squad}
//                       selected={selectedSquadId === Number(squad.squad.id)}
//                       life={userSquads?.[index]?.life}
//                     />
//                   ))}
//                 </div>
//                 <AddNewSquadButton onClick={onOpen} disabled={shouldDisableCreation} />
//               </div>
//             ) : (
//               <div className="flex items-center">
//                 <AddNewSquadButton onClick={onOpen} disabled={shouldDisableCreation} />
//               </div>
//             )}
//           </div>
//         </div>

//         <CreateBullModal
//           isOpen={isOpen}
//           onClose={onClose}
//           onCreate={handleAddButtonClick}
//           cost={parseFloat(displayFee)}
//           isCreating={isCreating}
//         />

//         <NotificationModal
//           // @ts-expect-error - -
//           status={notificationStatus}
//           title={
//             notificationStatus === "success"
//               ? "BULL CREATED"
//               : "INSUFFICIENT BALANCE"
//           }
//           description={
//             notificationStatus === "success"
//               ? "NOW CHOOSE TOKENS TO MAKE UP YOUR BULL, THEN LOCK HORNS WITH OTHER PLAYERS TO START WINNING"
//               : `YOU NEED AT LEAST ${displayFee} SUI IN YOUR WALLET TO CREATE A BULL. FUND YOUR WALLET AND TRY AGAIN`
//           }
//           onClose={() => closeNotification()}
//           buttonLabel={notificationStatus === "success" ? "LET'S GO!" : "CLOSE"}
//           onButtonClick={() => {
//             closeNotification();
//             if (notificationStatus === "success") navigate("/squad/new");
//           }}
//           isOpen={notificationIsOpen}
//         />
//       </>
//     </NavWrapper>
//   );
// };

// export default SquadPage;
