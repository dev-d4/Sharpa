import { VIDEO } from "../theme";

/**
 * Skärminspelningen som spelas i telefonramen, relativt video/public/.
 * Sätt till undefined för att rendera platshållaren i stället.
 */
export const PORTFOLIO_SCREENCAST: string | undefined = "screencasts/portfoljanalys.mp4";

/**
 * Var i inspelningen klippet startar, i bildrutor. Nuvarande inspelning har
 * sökningen gjord vid åtta sekunder — då hinner resultatkortet och knappen
 * "Analysera hela din portfölj" synas inom scenens sex sekunder.
 */
export const PORTFOLIO_SCREENCAST_START = 8 * VIDEO.fps;
