import { PublicKey } from "@solana/web3.js";

// Program IDs
export const PUMP_PROGRAM = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
export const BONK_PLATFORM_ID = new PublicKey("FfYek5vEz23cMkWsdJwG2oa6EphsvXSHrGpdALN4g6W1");

// Global mint address
export const GLOBAL_MINT = new PublicKey("p89evAyzjd9fphjJx7G3RFA48sbZdpGEppRcfRNpump");

// Jito tip accounts
export const JITO_TIP_ACCOUNTS = [
  'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
  'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
  '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
  '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
  'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
  'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
  'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
  'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
];

// Compute budget settings
export const COMPUTE_BUDGET = {
  DEFAULT_UNITS: 1_000_000,
  DEFAULT_MICRO_LAMPORTS: 200_000,
  HIGH_UNITS: 5_000_000,
  HIGH_MICRO_LAMPORTS: 20_000,
  LUT_UNITS: 50_000,
  LUT_MICRO_LAMPORTS: 500_000,
} as const;

// Transaction settings
export const TRANSACTION_SETTINGS = {
  COMMITMENT: "confirmed" as const,
  SOL_BUY_AMOUNT: 0.01,
  SLIPPAGE_AMOUNT: 0.1,
  SLIPPAGE_BASIS_POINTS: 10000,
  MIN_MINT_AMOUNT: 1,
} as const;

// Lookup table settings
export const LUT_SETTINGS = {
  WAIT_TIME_MS: 15000,
  EXTEND_WAIT_TIME_MS: 10000,
  MAX_RETRIES: 5,
} as const; 