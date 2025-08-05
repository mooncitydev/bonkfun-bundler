import { Connection, Keypair, SystemProgram, TransactionInstruction, VersionedTransaction, TransactionMessage, ComputeBudgetProgram } from "@solana/web3.js";
import { EnvironmentConfig } from "../config/environment";
import { COMPUTE_BUDGET } from "../config/constants";
import { saveDataToFile } from "../../utils/utils";
import { execute } from "../../executor/legacy";
import base58 from "bs58";

export class WalletService {
  private connection: Connection;
  private config: EnvironmentConfig;

  constructor(connection: Connection, config: EnvironmentConfig) {
    this.connection = connection;
    this.config = config;
  }

  async distributeSol(mainKp: Keypair, distributionNum: number): Promise<Keypair[] | null> {
    try {
      const sendSolTx: TransactionInstruction[] = [];
      sendSolTx.push(
        ComputeBudgetProgram.setComputeUnitLimit({ units: COMPUTE_BUDGET.DEFAULT_UNITS }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: COMPUTE_BUDGET.DEFAULT_MICRO_LAMPORTS })
      );
      
      const mainSolBal = await this.connection.getBalance(mainKp.publicKey);
      if (mainSolBal <= 4 * 10 ** 6) {
        console.log("Main wallet balance is not enough");
        return null;
      }
      
      let solAmount = Math.floor((this.config.swapAmount + 0.01) * 10 ** 9);
      const kps: Keypair[] = [];

      for (let i = 0; i < distributionNum; i++) {
        const wallet = Keypair.generate();
        kps.push(wallet);

        sendSolTx.push(
          SystemProgram.transfer({
            fromPubkey: mainKp.publicKey,
            toPubkey: wallet.publicKey,
            lamports: solAmount
          })
        );
      }

      try {
        saveDataToFile(kps.map(kp => base58.encode(kp.secretKey)));
      } catch (error) {
        console.error("Failed to save wallet data:", error);
      }

      let index = 0;
      while (true) {
        try {
          if (index > 5) {
            console.log("Error in distribution");
            return null;
          }
          
          const latestBlockhash = await this.connection.getLatestBlockhash();
          const messageV0 = new TransactionMessage({
            payerKey: mainKp.publicKey,
            recentBlockhash: latestBlockhash.blockhash,
            instructions: sendSolTx,
          }).compileToV0Message();
          
          const transaction = new VersionedTransaction(messageV0);
          transaction.sign([mainKp]);
          
          let txSig = await execute(transaction, latestBlockhash, 1);

          if (txSig) {
            const distributeTx = txSig ? `https://solscan.io/tx/${txSig}` : '';
            console.log("SOL distributed ", distributeTx);
            break;
          }
          index++;
        } catch (error) {
          console.error("Distribution attempt failed:", error);
          index++;
        }
      }
      
      console.log("Success in distribution");
      return kps;
    } catch (error) {
      console.log(`Failed to transfer SOL`, error);
      return null;
    }
  }

  generateVanityAddress(prefix: string): { keypair: Keypair; pubkey: string } {
    // This would need to be implemented based on your vanity address generation logic
    // For now, returning a regular keypair
    const keypair = Keypair.generate();
    return {
      keypair,
      pubkey: keypair.publicKey.toBase58()
    };
  }
} 