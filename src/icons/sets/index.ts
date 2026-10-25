import { set as data } from "./data";
import { set as dev } from "./dev";
import { set as everyday } from "./everyday";
import { set as media } from "./media";
import { set as security } from "./security";
import { set as ui } from "./ui";

/** Every set file, by file name; src/icons/index.ts merges them into the categories. */
export const iconSets = { ui, data, dev, security, media, everyday };
