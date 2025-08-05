import { Connection, Keypair, PublicKey, VersionedTransaction, TransactionMessage, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { NATIVE_MINT, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { BN } from "bn.js";
import { openAsBlob } from "fs";
import { createImageMetadata, createBonkTokenMetadata } from "@metadata-ipfs/bonk.fun-ipfs";
import { getPdaLaunchpadConfigId, getPdaLaunchpadPoolId, getPdaLaunchpadVaultId, getPdaLaunchpadAuth, buyExactInInstruction, LaunchpadConfig, TxVersion, LAUNCHPAD_PROGRAM } from "@raydium-io/raydium-sdk-v2";
import { getATAAddress } from "@raydium-io/raydium-sdk-v2";
import { createAssociatedTokenAccountIdempotentInstruction, createSyncNativeInstruction, getAssociatedTokenAddress, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { EnvironmentConfig } from "../config/environment";
import { BONK_PLATFORM_ID, JITO_TIP_ACCOUNTS, COMPUTE_BUDGET, TRANSACTION_SETTINGS } from "../config/constants";
import { initSdk } from "../config/config";

export class TokenService {
  private connection: Connection;
  private config: EnvironmentConfig;

  constructor(connection: Connection, config: EnvironmentConfig) {
    this.connection = connection;
    this.config = config;
  }

  async createBonkFunTokenMetadata() {
    const imageInfo = {
      file: await openAsBlob(this.config.file),
    };
    let imageMetadata = await createImageMetadata(imageInfo);

    console.log("imageMetadata: ", imageMetadata);

    const tokenInfo = {
      name: this.config.tokenName,
      symbol: this.config.tokenSymbol,
      description: this.config.description,
      createdOn: "https://bonk.fun",
      platformId: "platformId",
      image: imageMetadata
    };

    let tokenMetadata = await createBonkTokenMetadata(tokenInfo);

    console.log("tokenMetadata", tokenMetadata);

    return tokenMetadata;
  }

  async createBonkTokenTx(mainKp: Keypair, mintKp: Keypair): Promise<VersionedTransaction> {
    try {
      const uri = await this.createBonkFunTokenMetadata();

      if (!uri) {
        throw new Error("Token metadata URI is undefined");
      }

      // Initialize SDK
      const raydium = await initSdk(mainKp.publicKey);

      // Get config info
      const configId = getPdaLaunchpadConfigId(LAUNCHPAD_PROGRAM, NATIVE_MINT, 0, 0).publicKey;
      const configData = await this.connection.getAccountInfo(configId);

      if (!configData) {
        throw new Error('Config not found');
      }

      const configInfo = LaunchpadConfig.decode(configData.data);
      const mintBInfo = await raydium.token.getTokenInfo(configInfo.mintB);

      // Set up transaction parameters
      const solBuyAmount = TRANSACTION_SETTINGS.SOL_BUY_AMOUNT;
      const buyAmount = new BN(solBuyAmount * 10 ** 9);
      const slippageAmount = TRANSACTION_SETTINGS.SLIPPAGE_AMOUNT;
      const slippage = new BN(slippageAmount * 100);

      // Create launchpad transaction
      const { transactions } = await raydium.launchpad.createLaunchpad({
        programId: LAUNCHPAD_PROGRAM,
        mintA: mintKp.publicKey,
        decimals: 6,
        name: this.config.tokenName,
        symbol: this.config.tokenSymbol,
        migrateType: 'amm',
        uri,
        configId,
        configInfo,
        mintBDecimals: mintBInfo.decimals,
        slippage,
        platformId: BONK_PLATFORM_ID,
        txVersion: TxVersion.LEGACY,
        buyAmount,
        feePayer: mainKp.publicKey,
        createOnly: true,
        extraSigners: [mintKp],
        computeBudgetConfig: {
          units: COMPUTE_BUDGET.HIGH_UNITS,
          microLamports: COMPUTE_BUDGET.HIGH_MICRO_LAMPORTS,
        }
      });

      let createIx = transactions[0].instructions;

      const jitoFeeWallet = new PublicKey(JITO_TIP_ACCOUNTS[Math.floor(JITO_TIP_ACCOUNTS.length * Math.random())]);
      console.log(`Selected Jito fee wallet: ${jitoFeeWallet.toBase58()}`);
      console.log(`Calculated fee: ${this.config.jitoFee * LAMPORTS_PER_SOL} SOL`);

      // Get latest blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      const ixs = transactions[0].instructions;
      ixs.push(
        SystemProgram.transfer({
          fromPubkey: mainKp.publicKey,
          toPubkey: jitoFeeWallet,
          lamports: Math.floor(this.config.jitoFee * 10 ** 9),
        }),
      );
      const messageV0 = new TransactionMessage({
        payerKey: mainKp.publicKey,
        recentBlockhash: blockhash,
        instructions: ixs
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);
      transaction.sign([mainKp, mintKp]);

      console.log("create token transaction simulate ==>", await this.connection.simulateTransaction(transaction, { sigVerify: true }));

      return transaction;
    } catch (error) {
      console.error("createTokenTx error:", error);
      throw error;
    }
  }

  async makeBuyIx(kp: Keypair, buyAmount: number, index: number, creator: PublicKey, mintAddress: PublicKey) {
    const buyInstruction: any[] = [];
    const lamports = buyAmount;
    
    const programId = LAUNCHPAD_PROGRAM;
    const configId = getPdaLaunchpadConfigId(programId, NATIVE_MINT, 0, 0).publicKey;
    const poolId = getPdaLaunchpadPoolId(programId, mintAddress, NATIVE_MINT).publicKey;
    
    const userTokenAccountA = getAssociatedTokenAddressSync(mintAddress, kp.publicKey);
    const userTokenAccountB = getAssociatedTokenAddressSync(NATIVE_MINT, kp.publicKey);
    
    // Get minimum rent for token accounts
    const rentExemptionAmount = await this.connection.getMinimumBalanceForRentExemption(165);
    
    // Check buyer's balance
    const buyerBalance = await this.connection.getBalance(kp.publicKey);
    const requiredBalance = rentExemptionAmount * 2 + lamports;

    if (buyerBalance < requiredBalance) {
      throw new Error(`Insufficient funds. Need ${requiredBalance / 1e9} SOL, have ${buyerBalance / 1e9} SOL`);
    }

    const vaultA = getPdaLaunchpadVaultId(programId, poolId, mintAddress).publicKey;
    const vaultB = getPdaLaunchpadVaultId(programId, poolId, NATIVE_MINT).publicKey;
    const shareATA = getATAAddress(kp.publicKey, NATIVE_MINT).publicKey;
    const authProgramId = getPdaLaunchpadAuth(programId).publicKey;
    const minmintAmount = new BN(TRANSACTION_SETTINGS.MIN_MINT_AMOUNT);

    const tokenAta = await getAssociatedTokenAddress(mintAddress, kp.publicKey);
    const wsolAta = await getAssociatedTokenAddress(NATIVE_MINT, kp.publicKey);

    buyInstruction.push(
      createAssociatedTokenAccountIdempotentInstruction(
        kp.publicKey,
        tokenAta,
        kp.publicKey,
        mintAddress
      ),
      createAssociatedTokenAccountIdempotentInstruction(
        kp.publicKey,
        wsolAta,
        kp.publicKey,
        NATIVE_MINT
      ),
      SystemProgram.transfer({
        fromPubkey: kp.publicKey,
        toPubkey: wsolAta,
        lamports
      }),
      createSyncNativeInstruction(wsolAta)
    );

    const instruction = buyExactInInstruction(
      programId,
      kp.publicKey,
      authProgramId,
      configId,
      BONK_PLATFORM_ID,
      poolId,
      userTokenAccountA,
      userTokenAccountB,
      vaultA,
      vaultB,
      mintAddress,
      NATIVE_MINT,
      TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      new BN(lamports),
      minmintAmount,
      new BN(TRANSACTION_SETTINGS.SLIPPAGE_BASIS_POINTS),
      shareATA,
    );

    buyInstruction.push(instruction);
    return buyInstruction;
  }
} 