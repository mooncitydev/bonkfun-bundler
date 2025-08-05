# Migration Guide

This guide helps you migrate from the old codebase structure to the new restructured version.

## 🏗️ What Changed

### Old Structure
```
├── index.ts                    # Main entry point
├── src/
│   ├── main.ts                # All logic in one file
│   ├── config.ts              # SDK config
│   └── types.ts               # Type definitions
├── constants/
│   ├── constants.ts           # All constants
│   └── index.ts
├── utils/
│   ├── utils.ts               # All utilities
│   └── index.ts
└── executor/
    ├── jito.ts
    └── legacy.ts
```

### New Structure
```
├── src/
│   ├── index.ts               # New main entry point
│   ├── config/                # Configuration management
│   │   ├── environment.ts     # Environment variables
│   │   ├── constants.ts       # Static constants
│   │   ├── config.ts         # SDK configuration
│   │   └── index.ts
│   ├── services/              # Business logic services
│   │   ├── token.service.ts   # Token operations
│   │   ├── wallet.service.ts  # Wallet management
│   │   ├── lookup-table.service.ts
│   │   └── index.ts
│   └── core/                  # Core application logic
│       ├── bundler.ts         # Main bundler class
│       └── index.ts
```

## 🔄 Migration Steps

### 1. Update Entry Point

**Old:**
```bash
npm start  # runs index.ts
```

**New:**
```bash
npm start  # runs src/index.ts
```

### 2. Environment Variables

The environment variable handling is now centralized in `src/config/environment.ts`. All environment variables are now typed and validated.

### 3. Constants

Constants are now organized in `src/config/constants.ts` with better categorization:
- Program IDs
- Compute budget settings
- Transaction settings
- Lookup table settings

### 4. Services

The main logic has been split into focused services:

#### TokenService
Handles all token-related operations:
- `createBonkFunTokenMetadata()`
- `createBonkTokenTx()`
- `makeBuyIx()`

#### WalletService
Manages wallet operations:
- `distributeSol()`
- `generateVanityAddress()`

#### LookupTableService
Handles LUT operations:
- `createLUT()`
- `addBonkAddressesToTable()`

### 5. Core Bundler

The main orchestration logic is now in `src/core/bundler.ts` as the `Bundler` class.

## 🚀 Benefits of the New Structure

### 1. **Separation of Concerns**
- Each service has a single responsibility
- Configuration is centralized and typed
- Business logic is separated from infrastructure

### 2. **Better Maintainability**
- Easier to test individual components
- Clear dependencies between modules
- TypeScript interfaces for better type safety

### 3. **Extensibility**
- Easy to add new services
- Configuration can be extended without breaking changes
- Clear patterns for adding new features

### 4. **Developer Experience**
- Better IDE support with TypeScript
- Clear file organization
- Comprehensive documentation

## 🔧 Configuration Updates

### Environment Variables
All environment variables are now validated and typed. The `getEnvironmentConfig()` function provides a single source of truth for all configuration.

### Constants
Constants are now organized by category and use `as const` for better type inference.

## 🧪 Testing

The new structure makes it easier to test individual components:

```typescript
// Test a service in isolation
const tokenService = new TokenService(connection, config);
const metadata = await tokenService.createBonkFunTokenMetadata();
```

## 📝 Breaking Changes

### 1. Import Paths
If you were importing from the old structure, you'll need to update import paths:

**Old:**
```typescript
import { createBonkTokenTx } from './src/main';
```

**New:**
```typescript
import { TokenService } from './src/services';
```

### 2. Configuration Access
**Old:**
```typescript
import { RPC_ENDPOINT, SWAP_AMOUNT } from './constants';
```

**New:**
```typescript
import { getEnvironmentConfig } from './src/config';
const config = getEnvironmentConfig();
// Use config.rpcEndpoint, config.swapAmount
```

## 🆘 Need Help?

If you encounter issues during migration:

1. Check the new `src/index.ts` for the main entry point
2. Review the service interfaces in `src/services/`
3. Update your imports to use the new structure
4. Ensure your environment variables are properly set

## 🔄 Rollback

If you need to rollback to the old structure:

1. Keep the old files (they're still there)
2. Update `package.json` scripts to point to the old entry points
3. Use the old import paths

The old structure is still functional and can be used alongside the new structure during transition. 