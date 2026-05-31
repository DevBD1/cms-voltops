import { createClient, User } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { userVehicles, users, vehicles } from '../db/schema';
import '../env';
import { HttpError } from '../utils/http';
import { logger } from '../utils/logger';

type AppUser = typeof users.$inferSelect;

export interface AuthContext {
  token: string;
  supabaseUser: User;
  appUser: AppUser;
}

function parseBearerToken(authorization?: string): string {
  const [scheme, token] = authorization?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'Authorization bearer token is required');
  }

  return token;
}

function userNameFromAuthUser(user: User): Pick<AppUser, 'firstName' | 'lastName'> {
  const metadata = user.user_metadata ?? {};
  const fullName = typeof metadata.full_name === 'string' ? metadata.full_name.trim() : '';
  const firstName = typeof metadata.first_name === 'string' ? metadata.first_name.trim() : '';
  const lastName = typeof metadata.last_name === 'string' ? metadata.last_name.trim() : '';

  if (firstName || lastName) {
    return { firstName: firstName || 'User', lastName };
  }

  if (fullName) {
    const [first, ...rest] = fullName.split(/\s+/);
    return { firstName: first || 'User', lastName: rest.join(' ') };
  }

  return { firstName: user.email?.split('@')[0] || 'User', lastName: '' };
}

export class AuthService {
  private readonly supabaseAuth;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabasePublishableKey) {
      throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required for API auth.');
    }

    this.supabaseAuth = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async authenticate(authorization?: string, requestId?: string): Promise<AuthContext> {
    const token = parseBearerToken(authorization);
    const { data, error } = await this.supabaseAuth.auth.getUser(token);

    if (error || !data.user?.email) {
      throw new HttpError(401, 'Invalid Supabase auth token');
    }

    logger.debug('auth.supabase_user_verified', { requestId, authUserId: data.user.id });

    return {
      token,
      supabaseUser: data.user,
      appUser: await this.findOrCreateUser(data.user, requestId),
    };
  }

  async getProfile(userId: number) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    const ownedVehicles = await db
      .select({
        id: userVehicles.id,
        relationshipType: userVehicles.relationshipType,
        isPrimary: userVehicles.isPrimary,
        plateNumber: vehicles.plateNumber,
        connectorType: vehicles.connectorType,
      })
      .from(userVehicles)
      .innerJoin(vehicles, eq(userVehicles.vehiclePlateNumber, vehicles.plateNumber))
      .where(eq(userVehicles.userId, userId));

    return {
      user: this.toPublicUser(user),
      vehicles: ownedVehicles,
    };
  }

  private async findOrCreateUser(supabaseUser: User, requestId?: string): Promise<AppUser> {
    const [existingByAuthId] = await db.select().from(users).where(eq(users.authUserId, supabaseUser.id));

    if (existingByAuthId) {
      logger.debug('auth.app_user_found', { requestId, userId: existingByAuthId.id, authUserId: supabaseUser.id });
      return existingByAuthId;
    }

    const [existingByEmail] = await db.select().from(users).where(eq(users.email, supabaseUser.email!));

    if (existingByEmail) {
      const [updated] = await db
        .update(users)
        .set({
          authUserId: supabaseUser.id,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingByEmail.id))
        .returning();

      logger.debug('auth.app_user_linked', { requestId, userId: updated.id, authUserId: supabaseUser.id });
      return updated;
    }

    const name = userNameFromAuthUser(supabaseUser);
    const [created] = await db
      .insert(users)
      .values({
        authUserId: supabaseUser.id,
        firstName: name.firstName,
        lastName: name.lastName,
        email: supabaseUser.email!,
        phone: supabaseUser.phone || null,
        passwordHash: null,
        isActive: true,
        termsOfService: new Date(),
      })
      .returning();

    logger.debug('auth.app_user_created', { requestId, userId: created.id, authUserId: supabaseUser.id });
    return created;
  }

  private toPublicUser(user: AppUser) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
