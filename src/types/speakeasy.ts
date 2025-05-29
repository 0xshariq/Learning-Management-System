declare module "speakeasy" {
  export interface TotpOptions {
    secret: string;
    encoding?: "ascii" | "hex" | "base32";
    token?: string;
    window?: number;
  }

  export function totp(options: TotpOptions): string;
  export namespace totp {
    function verify(options: TotpOptions): boolean;
  }

  // Add other speakeasy exports as needed
  const _default: {
    totp: typeof totp;
  };
  export default _default;
}