https://x.com/0xmooncity

# Bonkfun Bundler

A Solana token bundler/launcher for creating and distributing tokens on the Bonk.fun platform.

## 🏗️ Project Structure

```
Bonkfun-Bundler/
├── src/                          # Main source code
│   ├── config/                   # Configuration management
│   │   ├── environment.ts        # Environment variables
│   │   ├── constants.ts          # Static constants
│   │   ├── config.ts            # SDK configuration
│   │   └── index.ts             # Config exports
│   ├── services/                 # Business logic services
│   │   ├── token.service.ts      # Token operations
│   │   ├── wallet.service.ts     # Wallet management
│   │   ├── lookup-table.service.ts # LUT operations
│   │   └── index.ts             # Service exports
│   ├── core/                     # Core application logic
│   │   ├── bundler.ts           # Main bundler class
│   │   └── index.ts             # Core exports
│   └── index.ts                 # Application entry point
├── executor/                     # Transaction execution
│   ├── jito.ts                  # Jito MEV execution
│   └── legacy.ts                # Legacy transaction execution
├── utils/                        # Utility functions
│   ├── utils.ts                 # General utilities
│   ├── logger.ts                # Logging utilities
│   ├── swapOnlyAmm.ts          # AMM swap utilities
│   ├── vanity.ts               # Vanity address generation
│   └── index.ts                # Utility exports
├── constants/                    # Legacy constants (deprecated)
├── image/                       # Token images
├── executor/                    # Transaction executors
└── [legacy files]              # Original entry points
```

## 🚀 Features

- **Token Creation**: Create tokens with metadata on Bonk.fun
- **Wallet Distribution**: Distribute SOL to multiple wallets
- **Lookup Table Management**: Create and extend lookup tables for efficient transactions
- **Transaction Bundling**: Bundle multiple buy transactions for MEV protection
- **Vanity Address Support**: Generate vanity addresses with custom prefixes
- **Jito MEV Integration**: Execute transactions through Jito for better MEV protection

## 📦 Installation

```bash
npm install
```

## ⚙️ Configuration

Create a `.env` file with the following variables:

```env
# RPC Configuration
RPC_ENDPOINT=your_rpc_endpoint
RPC_WEBSOCKET_ENDPOINT=your_websocket_endpoint
PRIVATE_KEY=your_private_key

# Token Configuration
TOKEN_NAME=Your Token Name
TOKEN_SYMBOL=SYMBOL
TOKEN_SHOW_NAME=Display Name
TOKEN_CREATE_ON=https://bonk.fun
DESCRIPTION=Token description
FILE=path/to/token/image.jpg
VANITY_MODE=false

# Trading Configuration
SWAP_AMOUNT=0.1
DISTRIBUTION_WALLETNUM=10
JITO_FEE=0.001

# Social Links
TWITTER=https://twitter.com/yourhandle
TELEGRAM=https://t.me/yourchannel
WEBSITE=https://yourwebsite.com

# Buyer Configuration
BUYER_WALLET=your_buyer_wallet
BUYER_AMOUNT=0.1
```

## 🎯 Usage

### Main Bundler
```bash
npm start
```

### Single Wallet Bundle
```bash
npm run single
```

### Close Lookup Table
```bash
npm run close
```

### Gather Data
```bash
npm run gather
```

### Check Status
```bash
npm run status
```

### Run Tests
```bash
npm run test
```

## 🏛️ Architecture

### Services

#### TokenService
Handles all token-related operations:
- Token metadata creation
- Token transaction creation
- Buy instruction generation

#### WalletService
Manages wallet operations:
- SOL distribution to multiple wallets
- Vanity address generation
- Wallet keypair management

#### LookupTableService
Handles lookup table operations:
- LUT creation
- Address extension
- LUT management

### Core Bundler
The main orchestrator that:
1. Initializes all services
2. Manages the token creation process
3. Handles wallet distribution
4. Creates and extends lookup tables
5. Bundles and executes transactions

## 🔧 Development

### Adding New Features

1. **Create a new service** in `src/services/`
2. **Add configuration** in `src/config/` if needed
3. **Update the bundler** in `src/core/bundler.ts`
4. **Add tests** for new functionality

### Code Style

- Use TypeScript for all new code
- Follow the existing service pattern
- Use dependency injection for services
- Keep configuration centralized

## 📝 Scripts

- `npm start`: Run the main bundler
- `npm run single`: Run single wallet bundle
- `npm run close`: Close lookup table
- `npm run gather`: Gather data
- `npm run status`: Check status
- `npm run test`: Run tests

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

