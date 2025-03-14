import { shouldActuallyRecord } from ".";
import { Player } from "./types";
import { log } from "./util";

interface GlobalUserInfos {
  game_list: GameInfo[];
}

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

  // if (arenaGameNameToBggId[gameName] && arenaGameNameToBggId[gameName] !== "") {
  //   return arenaGameNameToBggId[gameName];
  // }

  // return new Promise((resolve, reject) => {
  //   GM.xmlHttpRequest({
  //     method: "GET",
  //     url: `https://boardgamegeek.com/xmlapi2/search?type=boardgame&exact=1&query=${gameName}`,
  //     headers: {
  //       "Content-Type": "application/json",
  //     },
  //     onload: function (response) {
  //       try {
  //         const parser = new DOMParser();
  //         const xmlDoc = parser.parseFromString(
  //           response.responseText,
  //           "text/xml"
  //         );
  //         const bggId = xmlDoc
  //           .querySelector("item")!
  //           .attributes.getNamedItem("id")!.value;
  //         setBggIdForGame(gameName, bggId);
  //         resolve(bggId);
  //       } catch (e) {
  //         let bggId = prompt(
  //           "Could not find BGG ID for " +
  //             gameName +
  //             ". Please provide it manually."
  //         );
  //         if (bggId != null) {
  //           setBggIdForGame(gameName, bggId);
  //           resolve(bggId);
  //         } else {
  //           reject();
  //         }
  //       }
  //     },
  //     onerror: function () {
  //       reject();
  //     },
  //   });
  // });
};

type Play = {
  date: Date;
  length: string;
  players: Player[];
  incomplete: boolean;
  objectid: number;
  comments: string;
};

export const recordBGGPlay = async (play: Play) => {
  const playDate = `${play.date.getFullYear()}-${String(
    play.date.getMonth() + 1
  ).padStart(2, "0")}-${String(play.date.getDate()).padStart(2, "0")}`;

  let playData = {
    date: play.date.toISOString(), // "2021-11-01T12:34:00.000Z",
    playdate: playDate, // "2021-11-01",
    length: play.length, // "22",
    players: play.players,
    incomplete: play.incomplete,
    objecttype: "thing",
    objectid: play.objectid, // The BGG ID of the game
    comments: play.comments,
    location: "BoardGameArena",
    ajax: 1,
    action: "save",
  };

  if (!shouldActuallyRecord) {
    log("Not actually recording play", playData);
    // btnCell.innerHTML = "Not actually<br/>Recorded";
    return;
  }

  log("Recording play:", playData);
  const response = await GM.xmlHttpRequest({
    method: "POST",
    url: "https://boardgamegeek.com/geekplay.php",
    headers: {
      "Content-Type": "application/json",
    },
    data: JSON.stringify(playData),
  });

  log(response.response);
  const data = JSON.parse(response.response);
  let correctedLinkToBGG = data.html.replace(
    /\"\/plays/,
    "http://boardgamegeek.com/plays"
  );

  return correctedLinkToBGG;
};

export const getBGGPlays = async (start: Date, end: Date) => {
  // Plays
  // Request plays logged by a particular user or for a particular item.
  // Base URI: /xmlapi2/plays?parameters
  // Parameter	Description
  // username=NAME	Name of the player you want to request play information for. Data is returned in backwards-chronological form. You must include either a username or an id and type to get results.
  // id=NNN	Id number of the item you want to request play information for. Data is returned in backwards-chronological form.
  // type=TYPE	Type of the item you want to request play information for. Valid types include:
  //    thing
  //    family
  // mindate=YYYY-MM-DD	Returns only plays of the specified date or later.
  // maxdate=YYYY-MM-DD	Returns only plays of the specified date or earlier.
  // subtype=TYPE	Limits play results to the specified TYPE; boardgame is the default. Valid types include:
  //    boardgame
  //    boardgameexpansion
  //    boardgameaccessory
  //    boardgameintegration
  //    boardgamecompilation
  //    boardgameimplementation
  //    rpg
  //    rpgitem
  //    videogame
  // page=NNN	The page of information to request. Page size is 100 records.

  await GM.xmlHttpRequest({
    method: "GET",
    url: `https://boardgamegeek.com/xmlapi2/plays?username=jcpmcdonald&type=thing&mindate=${
      start.toISOString().split("T")[0]
    }&maxdate=${end.toISOString().split("T")[0]}`,
    headers: {
      "Content-Type": "application/json",
    },
    onload: function (response) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(response.responseText, "text/xml");
      log(xmlDoc);
    },
  });
};

// gameInfo ={
//   "id": 1887,
//   "name": "catanck",
//   "display_name_en": "Catan",
//   "version": "240320-1539",
//   "status": "alpha",
//   "group": 14757879,
//   "media": {
//       "icon": {
//           "default": "1694005652"
//       },
//       "banner": {
//           "default": "1694005341"
//       },
//       "title": {
//           "en": "1694005476"
//       },
//       "box": {
//           "en": "1694005121"
//       }
//   },
//   "premium": false,
//   "locked": true,
//   "weight": 0,
//   "priority": 0,
//   "games_played": 670,
//   "aliases": [],
//   "tags": [
//       [
//           2,
//           0
//       ]
//   ],
//   "published_on": "2023-11-14",
//   "alpha_on": "2023-09-15 17:46:59",
//   "beta_on": null,
//   "player_numbers": [
//       3,
//       4
//   ],
//   "average_duration": 60,
//   "has_tutorial": false,
//   "bgg_id": 13,
//   "is_ranking_disabled": false,
//   "league_number": 6,
//   "arena_num_players": 0,
//   "default_num_players": 4,
//   "realtime": "yes",
//   "turnbased": "yes",
//   "is_in_players_group": false,
//   "reco": null,
//   "role": null,
//   "favorite": false,
//   "last_options": null,
//   "last_table_id": null,
//   "prefs_string": "",
//   "last_prefs_string": "",
//   "saved_prefs_strings": [],
//   "watched": false,
//   "translated": 99.9,
//   "last_played": null,
//   "player_rank": 0,
//   "player_arena_points": 0
// }

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
