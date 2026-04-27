// Simple lib API smoke test: exercise parseDiff from the built library
try {
  const lib = require('../dist/lib/index.js');
  const sampleDiff = `diff --git a/x.js b/x.js
--- a/x.js
+++ b/x.js
@@ -1,3 +1,4 @@
-const a = 1;
+const a = 2;
`;
  const parsed = lib.parseDiff(sampleDiff);
  console.log('LIB_PARSE_RESULT:', JSON.stringify(parsed, null, 2));
} catch (e) {
  console.error('LIB_API_TEST failed:', e);
}
