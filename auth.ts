import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import dbConnect from './lib/mongodb';
import User from './lib/models/User';
import bcrypt from 'bcryptjs';

export const { handlers: { GET, POST }, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        await dbConnect();
        
        const user = await User.findOne({ email: credentials.email });
        if (!user || !user.password) return null;
        
        const passwordsMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        
        if (passwordsMatch) {
          // Any object returned will be saved in `user` property of the JWT
          return { id: user._id.toString(), email: user.email, name: user.name };
        }
        
        return null;
      }
    })
  ],
  session: { strategy: 'jwt' }
});
