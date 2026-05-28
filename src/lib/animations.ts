// Lottie animations played during pack opening. SWAP these URLs to taste —
// browse https://lottiefiles.com (search "treasure", "burst", "card pack",
// "fireworks", "star burst"), click an animation, hit Download → dotLottie,
// copy the resulting `lottie.host/<id>/<name>.lottie` URL and paste here.
//
// The CDN responds with HTTP 200 to any client; no API key needed.
// Each entry can also be `null` to skip that animation.

export type AnimationSlots = {
  // Plays during the "anticipation" stage (1.5s). Should loop. Suggested:
  // floating treasure chest, glowing pack, mystery box.
  anticipation: string | null;
  // Plays during the "burst" stage (0.6s). Suggested: explosion, light burst,
  // confetti burst, fireworks single shot.
  burst: string | null;
  // Plays as a background ambient effect on the reveal screen when at least
  // one legendary pulled. Suggested: cosmic stars, golden particles, aurora.
  legendaryAmbient: string | null;
};

// Defaults are LottieFiles community samples — replace with your own picks.
export const ANIMATIONS: AnimationSlots = {
  anticipation: "https://lottie.host/4db68bbd-31f6-4cd8-84eb-189de081159a/IGmMCqhzpt.lottie",
  burst: "https://lottie.host/4db68bbd-31f6-4cd8-84eb-189de081159a/IGmMCqhzpt.lottie",
  legendaryAmbient: null,
};
