import { retrieveEnvVariable } from "../../utils/utils";

export interface EnvironmentConfig {
  // RPC Configuration
  rpcEndpoint: string;
  rpcWebsocketEndpoint: string;
  privateKey: string;
  
  // Token Configuration
  tokenName: string;
  tokenSymbol: string;
  tokenShowName: string;
  tokenCreateOn: string;
  description: string;
  file: string;
  vanityMode: boolean;
  
  // Trading Configuration
  swapAmount: number;
  distributionWalletNum: number;
  jitoFee: number;
  
  // Social Links
  twitter: string;
  telegram: string;
  website: string;
  
  // Buyer Configuration
  buyerWallet: string;
  buyerAmount: number;
}

export const getEnvironmentConfig = (): EnvironmentConfig => ({
  // RPC Configuration
  rpcEndpoint: retrieveEnvVariable('RPC_ENDPOINT'),
  rpcWebsocketEndpoint: retrieveEnvVariable('RPC_WEBSOCKET_ENDPOINT'),
  privateKey: retrieveEnvVariable('PRIVATE_KEY'),
  
  // Token Configuration
  tokenName: retrieveEnvVariable('TOKEN_NAME'),
  tokenSymbol: retrieveEnvVariable('TOKEN_SYMBOL'),
  tokenShowName: retrieveEnvVariable('TOKEN_SHOW_NAME'),
  tokenCreateOn: retrieveEnvVariable('TOKEN_CREATE_ON'),
  description: retrieveEnvVariable('DESCRIPTION'),
  file: retrieveEnvVariable('FILE'),
  vanityMode: retrieveEnvVariable('VANITY_MODE') === "true",
  
  // Trading Configuration
  swapAmount: Number(retrieveEnvVariable('SWAP_AMOUNT')),
  distributionWalletNum: Number(retrieveEnvVariable('DISTRIBUTION_WALLETNUM')),
  jitoFee: Number(retrieveEnvVariable('JITO_FEE')),
  
  // Social Links
  twitter: retrieveEnvVariable('TWITTER'),
  telegram: retrieveEnvVariable('TELEGRAM'),
  website: retrieveEnvVariable('WEBSITE'),
  
  // Buyer Configuration
  buyerWallet: retrieveEnvVariable('BUYER_WALLET'),
  buyerAmount: Number(retrieveEnvVariable('BUYER_AMOUNT')),
}); 