// Prevent expo's winter runtime from loading during jest setup
// The __ExpoImportMetaRegistry lazy getter causes jest-runtime to throw
// because it's triggered outside of test code scope
if (typeof globalThis.__ExpoImportMetaRegistry === 'undefined') {
  Object.defineProperty(globalThis, '__ExpoImportMetaRegistry', {
    value: { registry: new Map() },
    configurable: true,
    writable: true,
  });
}
