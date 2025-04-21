// Simple type definition for require.context
declare function requireContext(
  directory: string, 
  useSubdirectories: boolean, 
  regExp: RegExp
): {
  keys(): string[];
  <T>(id: string): T;
};

declare module NodeJS {
  interface Require {
    context: typeof requireContext;
  }
}
