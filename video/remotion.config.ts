import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// TikTok laddar ändå om till sin egen bitrate — CRF 18 är gott nog och håller
// filerna små nog att ladda upp från mobil.
Config.setCrf(18);
