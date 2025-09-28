// Global teardown for Playwright tests
async function globalTeardown() {
  console.log('🧹 Running global teardown...');

  try {
    // Clean up any temporary files or resources
    // Add any cleanup logic here if needed

    console.log('✅ Global teardown completed successfully');
  } catch (error) {
    console.error('❌ Global teardown failed:', error.message);
  }
}

export default globalTeardown;