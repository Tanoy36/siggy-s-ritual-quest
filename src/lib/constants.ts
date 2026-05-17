export const RITUAL_CHAIN = {
  id: 1979,
  hex: "0x7BB",
  name: "Ritual",
  rpcUrl: "https://rpc.ritualfoundation.org",
  explorer: "https://explorer.ritualfoundation.org",
  symbol: "RITUAL",
} as const;

export const ADMIN_USERNAME = "ritualnetriddlequest";
export const ADMIN_PASSWORD = "ritual78989#@";
export const ADMIN_SESSION_KEY = "siggy-admin-session-v1";

export const avatarUrlFor = (seed: string) =>
  `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear&backgroundColor=8b5cf6,06b6d4,ec4899`;
