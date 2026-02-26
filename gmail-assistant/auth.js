const { authorize, paths } = require('./lib');

(async () => {
  try {
    await authorize();
    console.log('✅ Gmail OAuth complete.');
    console.log(`Token saved: ${paths.TOKEN_PATH}`);
  } catch (err) {
    console.error('❌ Gmail OAuth failed:', err.message);
    process.exit(1);
  }
})();
