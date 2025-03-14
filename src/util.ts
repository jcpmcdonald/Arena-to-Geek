export const log = (...data: any[]) => {
  if (process.env.NODE_ENV === "development") {
    // c-spell:disable-next-line
    console.log(...data);
  }
};

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const waitForElementToDisplay = async (
  selector: string,
  time: number
) => {
  let element = document.querySelector(selector);
  while (element === null) {
    await sleep(time);
    element = document.querySelector(selector);
  }
  return Promise.resolve();
};
