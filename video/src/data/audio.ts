/**
 * Musikbädden. Lägg en fil i video/public/music/ och peka ut den här —
 * t.ex. "music/bed.mp3". Är den undefined renderas videon utan musik.
 *
 * Hämta spåret från en tjänst där licensen tillåter användning på TikTok:
 * Epidemic Sound, Artlist, Uppbeat eller YouTube Audio Library. Ladda inte ner
 * musik från Spotify eller YouTube — det är inte licensierat för det här.
 *
 * Om du hellre lägger på ett trending sound i TikTok-appen: låt den vara
 * undefined. Appens ljud ger bättre spridning, men då kan du inte ha
 * speakerrösten i samma video utan att mixa i CapCut först.
 */
export const MUSIC_TRACK: string | undefined = undefined;

/**
 * Nivå på musiken under rösten. 0,08–0,12 är rimligt — musiken ska höras,
 * inte konkurrera. Kör du utan speaker kan du gå upp mot 0,25.
 */
export const MUSIC_VOLUME = 0.1;

/** Toning in och ut, i bildrutor. */
export const MUSIC_FADE = 30;
