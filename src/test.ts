#!/usr/bin/env bun
import { runMockTests } from './mock/index.js';

// Run all mock tests
runMockTests().catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});
