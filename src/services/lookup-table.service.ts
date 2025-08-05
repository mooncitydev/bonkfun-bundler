import { Connection, Keypair, PublicKey, AddressLookupTableProgram, ComputeBudgetProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { NATIVE_MINT, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { SystemProgram } from "@solana/web3.js";
import { getPdaLaunchpadConfigId, getPdaLaunchpadPoolId, getPdaLaunchpadVaultId, getPdaLaunchpadAuth, LaunchpadConfig, LAUNCHPAD_PROGRAM } from "@raydium-io/raydium-sdk-v2";
import { getATAAddress } from "@raydium-io/raydium-sdk-v2";
import { EnvironmentConfig } from "../config/environment";
import { BONK_PLATFORM_ID, COMPUTE_BUDGET, LUT_SETTINGS } from "../config/constants";
import { createAndSendV0Tx } from "../../executor/legacy";
import { sleep } from "../../utils/utils";

export class LookupTableService {
  private connection: Connection;
  private config: EnvironmentConfig;

  constructor(connection: Connection, config: EnvironmentConfig) {
    this.connection = connection;
    this.config = config;
  }

  async createLUT(mainKp: Keypair): Promise<PublicKey | null> {
    let i = 0;
    while (true) {
      if (i > LUT_SETTINGS.MAX_RETRIES) {
        console.log("LUT creation failed, Exiting...");
        return null;
      }
      
      const slot = await this.connection.getSlot("confirmed");
      try {
        const [lookupTableInst, lookupTableAddress] =
          AddressLookupTableProgram.createLookupTable({
            authority: mainKp.publicKey,
            payer: mainKp.publicKey,
            recentSlot: slot,
          });

        console.log("Lookup Table Address:", lookupTableAddress.toBase58());

        const result = await createAndSendV0Tx([
          ComputeBudgetProgram.setComputeUnitLimit({ units: COMPUTE_BUDGET.LUT_UNITS }),
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: COMPUTE_BUDGET.LUT_MICRO_LAMPORTS }),
          lookupTableInst
        ], mainKp, this.connection);

        if (!result) {
          throw new Error("Lut creation error");
        }

        console.log("Lookup Table Address created successfully!");
        console.log("Please wait for about 15 seconds...");
        await sleep(LUT_SETTINGS.WAIT_TIME_MS);

        return lookupTableAddress;
      } catch (err) {
        console.log("Retrying to create Lookuptable until it is created...");
        i++;
      }
    }
  }

  async addBonkAddressesToTable(lutAddress: PublicKey, mint: PublicKey, walletKPs: Keypair[], mainKp: Keypair): Promise<void> {
    const walletPKs: PublicKey[] = walletKPs.map(wallet => wallet.publicKey);
    
    try {
      const configId = getPdaLaunchpadConfigId(LAUNCHPAD_PROGRAM, NATIVE_MINT, 0, 0).publicKey;
      const configData = await this.connection.getAccountInfo(configId);
      if (!configData) {
        throw new Error('Config not found');
      }
      const configInfo = LaunchpadConfig.decode(configData.data);
      const platformId = new PublicKey("4Bu96XjU84XjPDSpveTVf6LYGCkfW5FK7SNkREWcEfV4");
      const poolId = getPdaLaunchpadPoolId(LAUNCHPAD_PROGRAM, mint, NATIVE_MINT).publicKey;
      const vaultA = getPdaLaunchpadVaultId(LAUNCHPAD_PROGRAM, poolId, mint).publicKey;
      const vaultB = getPdaLaunchpadVaultId(LAUNCHPAD_PROGRAM, poolId, NATIVE_MINT).publicKey;
      const userTokenAccountB = getAssociatedTokenAddressSync(NATIVE_MINT, mainKp.publicKey);
      const shareATA = getATAAddress(mainKp.publicKey, NATIVE_MINT, TOKEN_PROGRAM_ID).publicKey;
      const authProgramId = getPdaLaunchpadAuth(LAUNCHPAD_PROGRAM).publicKey;

      // Step 1 - Adding bundler wallets
      await this.extendLookupTable(lutAddress, walletPKs, mainKp, "wallet addresses");
      await sleep(LUT_SETTINGS.EXTEND_WAIT_TIME_MS);

      // Step 2 - Adding wallets' token ata
      const baseAtas: PublicKey[] = [];
      for (const wallet of walletKPs) {
        const baseAta = getAssociatedTokenAddressSync(mint, wallet.publicKey);
        baseAtas.push(baseAta);
      }
      console.log("Base atas address num to extend: ", baseAtas.length);
      await this.extendLookupTable(lutAddress, baseAtas, mainKp, "base ata addresses");
      await sleep(LUT_SETTINGS.EXTEND_WAIT_TIME_MS);

      // Step 3 - Adding wallets' wsol accounts
      const wsolAccs: PublicKey[] = [];
      for (const wallet of walletKPs) {
        const wsolAcc = getAssociatedTokenAddressSync(NATIVE_MINT, wallet.publicKey);
        wsolAccs.push(wsolAcc);
      }
      console.log("Wsol Account address num to extend: ", wsolAccs.length);
      await this.extendLookupTable(lutAddress, wsolAccs, mainKp, "wsol account addresses");
      await sleep(LUT_SETTINGS.EXTEND_WAIT_TIME_MS);

      // Step 4 - Adding main wallet and static keys
      const staticAddresses = [
        mainKp.publicKey, mint, LAUNCHPAD_PROGRAM, SystemProgram.programId, 
        TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, SystemProgram.programId, 
        SYSVAR_RENT_PUBKEY, ComputeBudgetProgram.programId, configId, platformId, 
        poolId, vaultA, vaultB, userTokenAccountB, shareATA, authProgramId
      ];
      await this.extendLookupTable(lutAddress, staticAddresses, mainKp, "main wallet and static addresses");
      await sleep(LUT_SETTINGS.EXTEND_WAIT_TIME_MS);
      
      console.log("Lookup Table Address extended successfully!");
      console.log(`Lookup Table Entries: https://explorer.solana.com/address/${lutAddress.toString()}/entries`);
    } catch (err) {
      console.log("There is an error in adding addresses in LUT. Please retry it.");
      throw err;
    }
  }

  private async extendLookupTable(lutAddress: PublicKey, addresses: PublicKey[], mainKp: Keypair, description: string): Promise<void> {
    let i = 0;
    while (true) {
      if (i > LUT_SETTINGS.MAX_RETRIES) {
        console.log("Extending LUT failed, Exiting...");
        throw new Error(`Failed to extend LUT with ${description}`);
      }

      const addAddressesInstruction = AddressLookupTableProgram.extendLookupTable({
        payer: mainKp.publicKey,
        authority: mainKp.publicKey,
        lookupTable: lutAddress,
        addresses: addresses,
      });
      
      const result = await createAndSendV0Tx([
        ComputeBudgetProgram.setComputeUnitLimit({ units: COMPUTE_BUDGET.LUT_UNITS }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: COMPUTE_BUDGET.LUT_MICRO_LAMPORTS }),
        addAddressesInstruction
      ], mainKp, this.connection);
      
      if (result) {
        console.log(`Successfully added ${description}.`);
        break;
      } else {
        console.log(`Trying again with ${description}`);
        i++;
      }
    }
  }
} 