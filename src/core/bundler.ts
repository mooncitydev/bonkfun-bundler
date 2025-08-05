import { Connection, Keypair, VersionedTransaction, TransactionInstruction, TransactionMessage, ComputeBudgetProgram } from "@solana/web3.js";
import base58 from "bs58";
import { EnvironmentConfig, getEnvironmentConfig } from "../config/environment";
import { COMPUTE_BUDGET, TRANSACTION_SETTINGS } from "../config/constants";
import { TokenService, WalletService, LookupTableService } from "../services";
import { executeJitoTx } from "../../executor/jito";
import { saveDataToFile, sleep } from "../../utils/utils";
import { generateVanityAddress } from "../../utils/vanity";

export class Bundler {
  private connection: Connection;
  private config: EnvironmentConfig;
  private tokenService: TokenService;
  private walletService: WalletService;
  private lookupTableService: LookupTableService;
  private mainKp: Keypair;
  private kps: Keypair[] = [];
  private transactions: VersionedTransaction[] = [];

  constructor() {
    this.config = getEnvironmentConfig();
    this.connection = new Connection(this.config.rpcEndpoint, {
      wsEndpoint: this.config.rpcWebsocketEndpoint,
      commitment: TRANSACTION_SETTINGS.COMMITMENT
    });
    
    this.mainKp = Keypair.fromSecretKey(base58.decode(this.config.privateKey));
    this.tokenService = new TokenService(this.connection, this.config);
    this.walletService = new WalletService(this.connection, this.config);
    this.lookupTableService = new LookupTableService(this.connection, this.config);
  }

  async run(): Promise<void> {
    try {
      console.log("Starting bundler...");
      console.log("Main wallet:", this.mainKp.publicKey.toBase58());

      // Create token metadata
      await this.tokenService.createBonkFunTokenMetadata();

      // Check main wallet balance
      const mainBal = await this.connection.getBalance(this.mainKp.publicKey);
      console.log((mainBal / 10 ** 9).toFixed(3), "SOL in main keypair");

      // Generate mint keypair
      let mintKp = this.generateMintKeypair();
      console.log("Mint address of token:", mintKp.publicKey.toBase58());
      saveDataToFile([base58.encode(mintKp.secretKey)], "mint.json");

      // Check if we have enough balance
      const minimumSolAmount = (this.config.swapAmount + 0.01) * this.config.distributionWalletNum + 0.05;
      if (mainBal / 10 ** 9 < minimumSolAmount) {
        console.log("Main wallet balance is not enough to run the bundler");
        console.log(`Please charge the wallet more than ${minimumSolAmount} SOL`);
        return;
      }

      // Distribute SOL to wallets
      console.log("Distributing SOL to wallets...");
      const result = await this.walletService.distributeSol(this.mainKp, this.config.distributionWalletNum);
      if (!result) {
        console.log("Distribution failed");
        return;
      }
      this.kps = result;

      // Create LUT
      console.log("Creating LUT started");
      const lutAddress = await this.lookupTableService.createLUT(this.mainKp);
      if (!lutAddress) {
        console.log("LUT creation failed");
        return;
      }
      console.log("LUT Address:", lutAddress.toBase58());
      saveDataToFile([lutAddress.toBase58()], "lut.json");
      
      await this.lookupTableService.addBonkAddressesToTable(lutAddress, mintKp.publicKey, this.kps, this.mainKp);

      // Create buy instructions
      const buyIxs: TransactionInstruction[] = [];
      for (let i = 0; i < this.config.distributionWalletNum; i++) {
        const ix = await this.tokenService.makeBuyIx(
          this.kps[i], 
          Math.floor(this.config.swapAmount * 10 ** 9), 
          i, 
          this.mainKp.publicKey, 
          mintKp.publicKey
        );
        buyIxs.push(...ix);
      }

      console.log("Buy instructions created:", buyIxs.length);

      // Verify lookup table is ready
      const lookupTable = (await this.connection.getAddressLookupTable(lutAddress)).value;
      if (!lookupTable) {
        console.log("Lookup table not ready");
        return;
      }
      console.log("Lookup table is ready, address:", lookupTable.key.toBase58());

      // Create token creation transaction
      const tokenCreationTx = await this.tokenService.createBonkTokenTx(this.connection, this.mainKp, mintKp);
      console.log("Token creation transaction created, size:", tokenCreationTx.serialize().length, "bytes");
      this.transactions.push(tokenCreationTx);

      // Execute token creation transaction
      console.log("Executing token creation transaction...");
      await this.executeBuyTransactions(buyIxs);

      console.log("Buy transactions created, total size:", this.transactions.reduce((acc, tx) => acc + tx.serialize().length, 0), "bytes");

      // Simulate transactions
      this.transactions.map(async (tx, i) => 
        console.log(i, " | ", tx.serialize().length, "bytes | \n", 
          (await this.connection.simulateTransaction(tx, { sigVerify: true })))
      );

      console.log("Executing transactions...");
      await executeJitoTx(this.transactions, this.mainKp, TRANSACTION_SETTINGS.COMMITMENT);
      await sleep(10000);

    } catch (error) {
      console.error("Bundler error:", error);
      throw error;
    }
  }

  private generateMintKeypair(): Keypair {
    if (this.config.vanityMode) {
      const { keypair, pubkey } = generateVanityAddress("bonk");
      console.log(`Keypair generated with "bonk" ending: ${pubkey}`);
      return keypair;
    }
    return Keypair.generate();
  }

  private async executeBuyTransactions(buyIxs: TransactionInstruction[]): Promise<void> {
    for (let i = 0; i < Math.ceil(this.config.distributionWalletNum / 5); i++) {
      const latestBlockhash = await this.connection.getLatestBlockhash();
      if (!latestBlockhash) {
        console.log("Failed to get latest blockhash");
        return;
      }
      
      console.log("Latest blockhash:", latestBlockhash.blockhash);
      const instructions: TransactionInstruction[] = [
        ComputeBudgetProgram.setComputeUnitLimit({ units: COMPUTE_BUDGET.DEFAULT_UNITS }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: COMPUTE_BUDGET.DEFAULT_MICRO_LAMPORTS }),
      ];

      for (let j = 0; j < 5; j++) {
        const index = i * 5 + j;
        if (this.kps[index]) {
          instructions.push(
            buyIxs[index * 5], 
            buyIxs[index * 5 + 1], 
            buyIxs[index * 5 + 2], 
            buyIxs[index * 5 + 3], 
            buyIxs[index * 5 + 4]
          );
        }
      }

      console.log("fee payer kps[i * 5].publicKey", this.kps[i * 5]?.publicKey?.toBase58());
      instructions.map(ix => ix.keys.map(k => 
        console.log("Key:", k.pubkey.toBase58(), " | Signer:", k.isSigner, " | Writable:", k.isWritable)
      ));

      console.log("Instructions length:", instructions.length);
      console.log("Instructions:", instructions);

      const msg = new TransactionMessage({
        payerKey: this.kps[i * 5].publicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions
      }).compileToV0Message();

      console.log("Transaction message created, size:", msg.serialize().length, "bytes");

      const tx = new VersionedTransaction(msg);
      console.log("Transaction created, size:", tx.serialize().length, "bytes");
      
      for (let j = 0; j < 5; j++) {
        const index = i * 5 + j;
        const kp = this.kps[index];
        console.log("index", index, " | Keypair public key:", kp?.publicKey?.toBase58());
        if (kp) {
          console.log("Signing transaction with keypair:", kp.publicKey.toBase58());
          tx.sign([kp]);
          console.log("Transaction signed with keypair:", kp.publicKey.toBase58());
        } else {
          console.log("No keypair found at index", index);
        }
      }
      
      this.transactions.push(tx);
      console.log("Transaction created, size:", tx.serialize().length, "bytes");
    }
  }
} 