// Every glyph module beyond the base table (glyphs.mjs), in the order they are added.
import * as cyrillic from "./cyrillic.mjs";
import * as greek from "./greek.mjs";
import * as latin from "./latin.mjs";
import * as latinext from "./latinext.mjs";
import * as scripts from "./scripts.mjs";
import * as symbols from "./symbols.mjs";

export const SCRIPT_MODULES = [latin, cyrillic, greek, latinext, symbols, scripts];
