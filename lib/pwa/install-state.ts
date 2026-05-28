export type PwaDisplayState = "installable" | "installed" | "offline" | "hidden";

export type PwaDisplayInput = {
  online: boolean;
  installed: boolean;
  canInstall: boolean;
};

export function getPwaDisplayState(input: PwaDisplayInput): PwaDisplayState {
  if (!input.online) {
    return "offline";
  }

  if (input.canInstall) {
    return "installable";
  }

  if (input.installed) {
    return "installed";
  }

  return "hidden";
}
