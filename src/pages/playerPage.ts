import { arenaToGeekPlayerNames } from "..";
import { log } from "../util";

export const attachToPlayerPage = async () => {
  showBggAliasOnProfile();
};

const showBggAliasOnProfile = () => {
  log("showBggAliasOnProfile");
  let playerHeader = document.querySelector("#player_header")!;

  log(playerHeader);
  const arenaName = playerHeader
    .querySelector("#player_name")!
    .textContent!.trimEnd();
  log(arenaName);

  const input = document.createElement("input");
  input.value = getGeekAliasForArenaPlayer(arenaName);
  input.addEventListener("keyup", (e: any) => {
    setGeekAliasForArenaPlayer(arenaName, e.target?.value);
  });

  const label = document.createElement("strong");
  label.textContent = "BGG Alias: ";

  const cell = document.createElement("div");
  cell.appendChild(label);
  cell.appendChild(input);
  playerHeader.appendChild(cell);
};

const setGeekAliasForArenaPlayer = (
  arenaPlayerName: string,
  geekAlias: string
) => {
  arenaToGeekPlayerNames[arenaPlayerName] = geekAlias.trim();
  log(arenaToGeekPlayerNames);
  GM_setValue("arenaToGeekPlayerNames", JSON.stringify(arenaToGeekPlayerNames));
};

export const getGeekAliasForArenaPlayer = (arenaPlayerName: string) => {
  if (arenaToGeekPlayerNames[arenaPlayerName]) {
    return arenaToGeekPlayerNames[arenaPlayerName];
  }
  return arenaPlayerName;
};
