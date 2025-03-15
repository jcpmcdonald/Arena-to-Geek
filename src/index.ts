import { log } from "./util";
import { attachToGamesHistoryPage } from "./pages/gamesHistoryPage";
import { attachToPlayerPage } from "./pages/playerPage";

// Memory
export const arenaToGeekPlayerNames: { [key: string]: string } = JSON.parse(
  GM_getValue("arenaToGeekPlayerNames", "{}")
);
export const alreadyRecordedTables: { [key: string]: string } = JSON.parse(
  GM_getValue("alreadyRecordedTables", "{}")
);
// export const arenaGameNameToBggId: { [key: string]: string } = JSON.parse(
//   GM_getValue("arenaGameNameToBggId", "{}")
// );

export const DEBUG = true;
export const shouldActuallyRecord = false;

// export const setBggIdForGame = (arenaGameName: string, bggId: string) => {
//   arenaGameNameToBggId[arenaGameName] = bggId.trim();
//   GM_setValue("arenaGameNameToBggId", JSON.stringify(arenaGameNameToBggId));
// };

// To clear out a specific play, clear it with this:
const forgetTableAsRecorded = (tableNumber: string) => {
  tableNumber = tableNumber.replace(/^#/, "");
  delete alreadyRecordedTables[tableNumber];
  GM_setValue("alreadyRecordedTables", JSON.stringify(alreadyRecordedTables));
};

async function locationChanged(location: string) {
  // const location = window.location.href;
  if (location.startsWith("https://boardgamearena.com/gamestats")) {
    attachToGamesHistoryPage();
  } else if (location.startsWith("https://boardgamearena.com/player")) {
    attachToPlayerPage();
  }
}

async function main() {
  "use strict";

  (() => {
    let oldPushState = history.pushState;
    history.pushState = function pushState() {
      // @ts-expect-error
      let ret = oldPushState.apply(this, arguments);
      // window.dispatchEvent(new Event("pushstate"));
      window.dispatchEvent(new Event("locationchange"));
      return ret;
    };

    let oldReplaceState = history.replaceState;
    history.replaceState = function replaceState() {
      // @ts-expect-error
      let ret = oldReplaceState.apply(this, arguments);
      // window.dispatchEvent(new Event("replacestate"));
      window.dispatchEvent(new Event("locationchange"));
      return ret;
    };

    window.addEventListener("popstate", () => {
      window.dispatchEvent(new Event("locationchange"));
    });
  })();

  window.addEventListener("locationchange", function () {
    log("location changed!", window.location.href);
    locationChanged(window.location.href);
  });

  // Only works in chrome
  // window.navigation.addEventListener("navigate", (event) => {
  //   console.log("location changed!");
  // });

  // Initial run
  locationChanged(window.location.href);
}

main();
