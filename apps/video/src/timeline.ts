// Scene start frames at 30 fps. Total 897 frames = 29.9 s (under the 30 s demo limit).
// Matches the beats in VOICEOVER.md.
export const FPS = 30;

export const T = {
  intro: 0, // province outline draws itself
  quake: 105, // M7.8 epicentre, seismic rings, map shake
  clouds: 210, // cloud deck rolls in, optical pass is blocked
  radar: 330, // NISAR pass, radar swath revealed beneath cloud
  slides: 510, // clouds clear, 305 possible landslides bloom outward
  app: 675, // map docks into the app UI, data families cycle
  title: 780, // closing title card
  credits: 840, // challenge and team members
  end: 897,
} as const;
