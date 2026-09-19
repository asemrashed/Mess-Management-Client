import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function isJwtExpired(jwt: string | undefined, skewMs = 30_000) {
  if (!jwt) return true;
  try {
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString());
    return typeof payload.exp !== "number" || payload.exp * 1000 < Date.now() + skewMs;
  } catch {
    return true;
  }
}

/**
 * Two sign-in paths, both converging on the same backend-issued JWT pair:
 *
 * 1. Google — NextAuth runs the OAuth dance, then we exchange the resulting Google
 *    id_token with `POST /auth/google` on the backend (which independently verifies it
 *    against Google) for our own access/refresh JWTs.
 * 2. Credentials (manual email/password) — the `authorize()` callback below calls
 *    `POST /auth/login` directly and returns the resulting user + JWTs; the `jwt`
 *    callback then just copies them onto the token, same as the Google path.
 *
 * Either way, every API call after sign-in uses the backend's own JWT
 * (`session.apiAccessToken`), never a Google token or NextAuth's session cookie — so the
 * backend stays a fully independent, statelessly-authenticated service.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      // No `prompt` — reuse Google's existing browser session so returning users
      // are not sent through "Verify it's you" on every visit.
    }),
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const res = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: credentials.email, password: credentials.password }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error?.message || "Invalid email or password");
        }

        const data = await res.json();
        // Smuggle the backend tokens through the NextAuth "user" object; the jwt()
        // callback below picks them up on this same sign-in pass.
        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          image: data.user.image,
          apiAccessToken: data.accessToken,
          apiRefreshToken: data.refreshToken,
          apiUser: data.user,
        } as any;
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account, user }) {
      // Path 1: Google — exchange the id_token with the backend.
      if (account?.provider === "google") {
        if (!account.id_token) {
          throw new Error("Google did not return an ID token");
        }
        const res = await fetch(`${API_URL}/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: account.id_token }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error?.message || "Could not complete Google sign-in");
        }
        const data = await res.json();
        token.apiAccessToken = data.accessToken;
        token.apiRefreshToken = data.refreshToken;
        token.apiUser = data.user;
        delete token.apiError;
      }

      // Path 2: Credentials — authorize() already talked to the backend; just copy the tokens over.
      if (user && (user as any).apiAccessToken) {
        token.apiAccessToken = (user as any).apiAccessToken;
        token.apiRefreshToken = (user as any).apiRefreshToken;
        token.apiUser = (user as any).apiUser;
        delete token.apiError;
      }

      if (token.apiRefreshToken && isJwtExpired(token.apiAccessToken as string | undefined)) {
        try {
          const res = await fetch(`${API_URL}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: token.apiRefreshToken }),
          });
          if (res.ok) {
            const data = await res.json();
            token.apiAccessToken = data.accessToken;
          } else {
            delete token.apiAccessToken;
            delete token.apiRefreshToken;
          }
        } catch {
          // Keep the existing refresh token — a transient network error should not
          // force the user back through Google sign-in.
        }
      }

      return token;
    },
    async session({ session, token }) {
      (session as any).apiAccessToken = token.apiAccessToken;
      (session as any).apiUser = token.apiUser;
      (session as any).apiError = token.apiError;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
