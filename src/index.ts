import { Bundler } from './core';

async function main() {
  try {
    const bundler = new Bundler();
    await bundler.run();
  } catch (error) {
    console.error('Application error:', error);
    process.exit(1);
  }
}

main(); 