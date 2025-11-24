import { useMutation } from "@tanstack/react-query";
import { useCreateCompleteSquad } from "./use-squad-contract";
import { SquadForm } from "@/routes/squad/types";

export interface FullSquadCreationData {
  squadForm: SquadForm;
}


export const useFullSquadCreation = () => {
  const createCompleteSquadMutation = useCreateCompleteSquad();

  return useMutation({
    mutationKey: ["full-squad-creation"],
    mutationFn: async ({ squadForm }: FullSquadCreationData) => {
      try {
        const bassetSymbols = squadForm.players.map(player => player.name);
        const bassetQuantities = squadForm.players.map(player => player.multiplier || 1);
        
        const result = await createCompleteSquadMutation.mutateAsync({
          squadName: squadForm.name,
          bassetSymbols,
          formation: squadForm.formation,
          bassetQuantities,
        });
        
        return {
          result,
          squadForm,
        };
      } catch (error) {
        throw error;
      }
    },
  });
};

export const useSquadCreationStatus = () => {
  const createCompleteSquadMutation = useCreateCompleteSquad();
  const fullCreationMutation = useFullSquadCreation();

  return {
    isCreatingCompleteSquad: createCompleteSquadMutation.isPending,
    createCompleteSquadError: createCompleteSquadMutation.error,
    createCompleteSquadSuccess: createCompleteSquadMutation.isSuccess,
    
    isCreatingFull: fullCreationMutation.isPending,
    fullCreationError: fullCreationMutation.error,
    fullCreationSuccess: fullCreationMutation.isSuccess,
    
    isAnyLoading: createCompleteSquadMutation.isPending || fullCreationMutation.isPending,
    hasAnyError: createCompleteSquadMutation.isError || fullCreationMutation.isError,
    isAllSuccess: fullCreationMutation.isSuccess,
    
    isCreatingSquad: createCompleteSquadMutation.isPending,
    isAddingPlayers: false, 
    createSquadError: createCompleteSquadMutation.error,
    addPlayersError: null, 
    createSquadSuccess: createCompleteSquadMutation.isSuccess,
    addPlayersSuccess: createCompleteSquadMutation.isSuccess,
  };
}; 