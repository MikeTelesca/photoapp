import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        twoFactorCode: { label: "Authenticator code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(credentials.password as string, user.password);
        if (!isValid) return null;

        // Check 2FA if enabled
        if (user.twoFactorEnabled && user.twoFactorSecret) {
          const code = (credentials as Record<string, string>).twoFactorCode;
          if (!code) {
            // Signal to the login page that a 2FA code is needed
            throw new Error("2FA_REQUIRED");
          }
          const OTPAuth = await import("otpauth");
          const totp = new OTPAuth.TOTP({
            issuer: "ATH Editor",
            secret: OTPAuth.Secret.fromBase32(user.twoFactorSecret),
            digits: 6,
            period: 30,
          });
          const delta = totp.validate({ token: code.trim(), window: 1 });
          if (delta === null) {
            // Try backup codes fallback
            let backupMatchedIndex = -1;
            let backupList: string[] = [];
            if (user.twoFactorBackupCodes) {
              try {
                backupList = JSON.parse(user.twoFactorBackupCodes);
              } catch {
                backupList = [];
              }
              for (let i = 0; i < backupList.length; i++) {
                // Compare user input to each stored bcrypt hash
                // eslint-disable-next-line no-await-in-loop
                const ok = await bcrypt.compare(code.trim(), backupList[i]);
                if (ok) {
                  backupMatchedIndex = i;
                  break;
                }
              }
            }
            if (backupMatchedIndex === -1) {
              throw new Error("Invalid 2FA code");
            }
            // Consume the used backup code
            const remaining = backupList.filter((_, idx) => idx !== backupMatchedIndex);
            await prisma.user.update({
              where: { id: user.id },
              data: {
                twoFactorBackupCodes:
                  remaining.length > 0 ? JSON.stringify(remaining) : null,
              },
            });
          }
        }

        // Record login attempt
        try {
          await prisma.loginRecord.create({
            data: { userId: user.id },
          });
        } catch (err) {
          console.error("[login-record] failed:", err);
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
});
