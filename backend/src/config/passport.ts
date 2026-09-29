import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from './env.js';
import { query } from './db.js';

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    callbackURL: env.GOOGLE_CALLBACK_URL,
  }, async (_accessToken, _refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) return done(new Error('Google account has no email'));
      const result = await query<{ id: string; name: string; email: string; avatar_url: string | null }>(
        `INSERT INTO users (google_id, name, email, avatar_url)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (google_id) DO UPDATE SET name=EXCLUDED.name, email=EXCLUDED.email, avatar_url=EXCLUDED.avatar_url
         RETURNING id, name, email, avatar_url`,
        [profile.id, profile.displayName || email, email, profile.photos?.[0]?.value ?? null],
      );
      done(null, result.rows[0]);
    } catch (error) { done(error as Error); }
  }));
}

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: string, done) => {
  try {
    const result = await query(`SELECT id, name, email, avatar_url FROM users WHERE id=$1`, [id]);
    done(null, result.rows[0] ?? false);
  } catch (error) { done(error); }
});

export default passport;
