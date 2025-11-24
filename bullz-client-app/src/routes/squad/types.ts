import { formationLayouts } from "./constants";

export interface IPlayer {
  multiplier: number;
  name: string;
  position: number;
  token_price_id: string;
  imageUrl?: string; 
  allocated_value?: number; 
}
export type FormationLayoutKey = keyof typeof formationLayouts;
export interface SquadForm {
  name: string;
  formation: FormationLayoutKey;
  players: IPlayer[];
}
