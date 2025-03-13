import { getGeekAliasForArenaPlayer } from ".";
import { Player } from "./types";

export const parsePlayers = (playersCell: any) => {
  const playerCells = playersCell.querySelectorAll("div .simple-score-entry");
  const players: Player[] = [];
  [...playerCells].forEach((playerCell, i) => {
    const player = {
      rank: playerCell.querySelector("div .rank").textContent,
      name: getGeekAliasForArenaPlayer(
        playerCell.querySelector("div a").textContent
      ),
      username: getGeekUsername(playerCell.querySelector("div a").textContent),
      score: playerCell.querySelector("div .score").textContent,
      win: false,
    };
    player.win = player.rank === "1st";
    players.push(player);
  });

  return players;
};

const getGeekUsername = (arenaPlayerName: string) => {
  // TODO: Lookup BGG usernames
  if (arenaPlayerName === "jcpmcdonald") {
    return "jcpmcdonald";
  }
  return "";
};
