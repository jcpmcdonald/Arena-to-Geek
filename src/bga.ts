import { log } from "./util";

type GameInfo = {
  id: number;
  name: string;
  display_name_en: string;
  version: string;
  status: string;
  group: number;
  media: {
    icon: { default: string };
    banner: { default: string };
    title: { en: string };
    box: { en: string };
  };
  premium: boolean;
  locked: boolean;
  weight: number;
  priority: number;
  games_played: number;
  aliases: string[];
  tags: [number, number][];
  published_on: string;
  alpha_on: string;
  beta_on: string;
  player_numbers: number[];
  average_duration: number;
  has_tutorial: boolean;
  bgg_id: number;
  is_ranking_disabled: boolean;
  league_number: number;
  arena_num_players: number;
  default_num_players: number;
  realtime: string;
  turnbased: string;
  is_in_players_group: boolean;
  reco: string;
  role: string;
  favorite: boolean;
  last_options: string;
  last_table_id: string;
  prefs_string: string;
  last_prefs_string: string;
  saved_prefs_strings: string[];
  watched: boolean;
  translated: number;
  last_played: string;
  player_rank: number;
  player_arena_points: number;
};

interface GlobalUserInfos {
  game_list: GameInfo[];
}

// BGA Defines a global variable with the game list
declare global {
  const globalUserInfos: GlobalUserInfos;
}

export const getBGGId = async (gameName: string): Promise<number> => {
  const game = globalUserInfos.game_list.find(
    (game: GameInfo) => game.display_name_en === gameName
  );
  if (!game) {
    log("Could not find game", game);
    return 0;
  }
  return game.bgg_id;
};
