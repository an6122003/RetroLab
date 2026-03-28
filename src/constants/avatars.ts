/**
 * Pre-defined avatar set — served as static assets from /avatars/.
 * No Supabase Storage needed — zero upload attack surface, zero egress cost.
 *
 * To add more, just add a new entry here and drop the file in /public/avatars/.
 */

export interface AvatarOption {
  id: string;
  label: string;
  src: string;
  /** Emoji fallback for loading states */
  emoji: string;
}

export const AVATARS: AvatarOption[] = [
  { id: 'avatar-01', label: 'Robot',       src: '/avatars/avatar-01.svg', emoji: '🤖' },
  { id: 'avatar-02', label: 'Astronaut',   src: '/avatars/avatar-02.svg', emoji: '🧑‍🚀' },
  { id: 'avatar-03', label: 'Cat',         src: '/avatars/avatar-03.svg', emoji: '🐱' },
  { id: 'avatar-04', label: 'Fox',         src: '/avatars/avatar-04.svg', emoji: '🦊' },
  { id: 'avatar-05', label: 'Ghost',       src: '/avatars/avatar-05.svg', emoji: '👻' },
  { id: 'avatar-06', label: 'Alien',       src: '/avatars/avatar-06.svg', emoji: '👽' },
  { id: 'avatar-07', label: 'Wizard',      src: '/avatars/avatar-07.svg', emoji: '🧙' },
  { id: 'avatar-08', label: 'Ninja',       src: '/avatars/avatar-08.svg', emoji: '🥷' },
  { id: 'avatar-09', label: 'Panda',       src: '/avatars/avatar-09.svg', emoji: '🐼' },
  { id: 'avatar-10', label: 'Unicorn',     src: '/avatars/avatar-10.svg', emoji: '🦄' },
  { id: 'avatar-11', label: 'Dragon',      src: '/avatars/avatar-11.svg', emoji: '🐉' },
  { id: 'avatar-12', label: 'Octopus',     src: '/avatars/avatar-12.svg', emoji: '🐙' },
  // ── 2D Avatars ──
  { id: 'avatar-2d-01', label: 'Robot 2D',     src: '/avatars-2d/avatar-01.svg', emoji: '🤖' },
  { id: 'avatar-2d-02', label: 'Astronaut 2D', src: '/avatars-2d/avatar-02.svg', emoji: '🧑‍🚀' },
  { id: 'avatar-2d-03', label: 'Cat 2D',       src: '/avatars-2d/avatar-03.svg', emoji: '🐱' },
  { id: 'avatar-2d-04', label: 'Fox 2D',       src: '/avatars-2d/avatar-04.svg', emoji: '🦊' },
  { id: 'avatar-2d-05', label: 'Ghost 2D',     src: '/avatars-2d/avatar-05.svg', emoji: '👻' },
  { id: 'avatar-2d-06', label: 'Alien 2D',     src: '/avatars-2d/avatar-06.svg', emoji: '👽' },
  { id: 'avatar-2d-07', label: 'Wizard 2D',    src: '/avatars-2d/avatar-07.svg', emoji: '🧙' },
  { id: 'avatar-2d-08', label: 'Ninja 2D',     src: '/avatars-2d/avatar-08.svg', emoji: '🥷' },
  { id: 'avatar-2d-09', label: 'Panda 2D',     src: '/avatars-2d/avatar-09.svg', emoji: '🐼' },
  { id: 'avatar-2d-10', label: 'Unicorn 2D',   src: '/avatars-2d/avatar-10.svg', emoji: '🦄' },
  { id: 'avatar-2d-11', label: 'Dragon 2D',    src: '/avatars-2d/avatar-11.svg', emoji: '🐉' },
  { id: 'avatar-2d-12', label: 'Octopus 2D',   src: '/avatars-2d/avatar-12.svg', emoji: '🐙' },
];

/** Look up an avatar by its id. Falls back to the first avatar. */
export function getAvatar(avatarId: string): AvatarOption {
  return AVATARS.find((a) => a.id === avatarId) ?? AVATARS[0];
}

/** Default avatar id for new accounts */
export const DEFAULT_AVATAR_ID = 'avatar-01';
