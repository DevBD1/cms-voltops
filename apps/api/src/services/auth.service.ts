import { createClient, User } from '@supabase/supabase-js';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/client';
import {
  connectorTypes,
  employees,
  userVehicles,
  users,
  vehicles,
} from '../db/schema';
import '../env';
import { HttpError } from '../utils/http';
import { logger } from '../utils/logger';

type AppUser = typeof users.$inferSelect;
type SignupIdentityMetadata = Pick<AppUser, 'phone' | 'tckn'>;

export interface AuthContext {
  token: string;
  supabaseUser: User;
  appUser: AppUser;
}

export interface AdminAuthContext extends AuthContext {
  employee: typeof employees.$inferSelect;
}

function parseBearerToken(authorization?: string): string {
  const [scheme, token] = authorization?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'Authorization bearer token is required');
  }

  return token;
}

function userNameFromAuthUser(
  user: User,
): Pick<AppUser, 'firstName' | 'lastName'> {
  const metadata = user.user_metadata ?? {};
  const fullName =
    typeof metadata.full_name === 'string' ? metadata.full_name.trim() : '';
  const firstName =
    typeof metadata.first_name === 'string' ? metadata.first_name.trim() : '';
  const lastName =
    typeof metadata.last_name === 'string' ? metadata.last_name.trim() : '';

  if (firstName || lastName) {
    return { firstName: firstName || 'User', lastName };
  }

  if (fullName) {
    const [first, ...rest] = fullName.split(/\s+/);
    return { firstName: first || 'User', lastName: rest.join(' ') };
  }

  return { firstName: user.email?.split('@')[0] || 'User', lastName: '' };
}

function optionalTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function signupIdentityFromAuthUser(user: User): SignupIdentityMetadata {
  const metadata = user.user_metadata ?? {};
  const phone =
    optionalTrimmedString(metadata.phone) ?? optionalTrimmedString(user.phone);
  const tckn = optionalTrimmedString(metadata.tckn);

  if (phone && phone.length > 30) {
    throw new HttpError(400, 'phone must be 30 characters or fewer');
  }

  if (tckn && !/^\d{11}$/.test(tckn)) {
    throw new HttpError(400, 'tckn must be exactly 11 digits');
  }

  return { phone, tckn };
}

function isUniqueViolation(error: unknown, constraintName: string): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    code?: unknown;
    constraint?: unknown;
    constraint_name?: unknown;
    message?: unknown;
  };

  return (
    candidate.code === '23505' &&
    (candidate.constraint === constraintName ||
      candidate.constraint_name === constraintName ||
      (typeof candidate.message === 'string' &&
        candidate.message.includes(constraintName)))
  );
}

export class AuthService {
  private readonly supabaseAuth;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabasePublishableKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required for API auth.',
      );
    }

    this.supabaseAuth = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async authenticate(
    authorization?: string,
    requestId?: string,
  ): Promise<AuthContext> {
    const token = parseBearerToken(authorization);
    const { data, error } = await this.supabaseAuth.auth.getUser(token);

    if (error || !data.user?.email) {
      throw new HttpError(401, 'Invalid Supabase auth token');
    }

    logger.debug('auth.supabase_user_verified', {
      requestId,
      authUserId: data.user.id,
    });

    return {
      token,
      supabaseUser: data.user,
      appUser: await this.findOrCreateUser(data.user, requestId),
    };
  }

  async authenticateAdmin(
    authorization?: string,
    requestId?: string,
  ): Promise<AdminAuthContext> {
    const auth = await this.authenticate(authorization, requestId);
    const [employee] = await db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.userId, auth.appUser.id),
          eq(employees.status, 'active'),
        ),
      );

    if (!employee) {
      throw new HttpError(403, 'Active employee access is required');
    }

    logger.debug('auth.admin_verified', {
      requestId,
      userId: auth.appUser.id,
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
    });

    return { ...auth, employee };
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
        connectorType: connectorTypes.vehicleLabel,
        connectorTypeCode: vehicles.connectorTypeCode,
      })
      .from(userVehicles)
      .innerJoin(
        vehicles,
        eq(userVehicles.vehiclePlateNumber, vehicles.plateNumber),
      )
      .innerJoin(
        connectorTypes,
        eq(vehicles.connectorTypeCode, connectorTypes.code),
      )
      .where(eq(userVehicles.userId, userId));

    return {
      user: this.toPublicUser(user),
      vehicles: ownedVehicles,
    };
  }

  private async findOrCreateUser(
    supabaseUser: User,
    requestId?: string,
  ): Promise<AppUser> {
    const [existingByAuthId] = await db
      .select()
      .from(users)
      .where(eq(users.authUserId, supabaseUser.id));

    if (existingByAuthId) {
      logger.debug('auth.app_user_found', {
        requestId,
        userId: existingByAuthId.id,
        authUserId: supabaseUser.id,
      });
      return existingByAuthId;
    }

    const signupIdentity = signupIdentityFromAuthUser(supabaseUser);
    const [existingByEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, supabaseUser.email!));

    if (existingByEmail) {
      const backfilledIdentity = {
        phone: existingByEmail.phone || signupIdentity.phone,
        tckn: existingByEmail.tckn || signupIdentity.tckn,
      };

      try {
        const [updated] = await db
          .update(users)
          .set({
            authUserId: supabaseUser.id,
            phone: backfilledIdentity.phone,
            tckn: backfilledIdentity.tckn,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingByEmail.id))
          .returning();

        logger.debug('auth.app_user_linked', {
          requestId,
          userId: updated.id,
          authUserId: supabaseUser.id,
        });
        return updated;
      } catch (error) {
        if (isUniqueViolation(error, 'users_phone_unique')) {
          throw new HttpError(409, 'phone is already linked to another user');
        }

        throw error;
      }
    }

    const name = userNameFromAuthUser(supabaseUser);

    try {
      const [created] = await db
        .insert(users)
        .values({
          authUserId: supabaseUser.id,
          firstName: name.firstName,
          lastName: name.lastName,
          email: supabaseUser.email!,
          phone: signupIdentity.phone,
          tckn: signupIdentity.tckn,
          passwordHash: null,
          isActive: true,
          termsOfService: new Date(),
        })
        .returning();

      logger.debug('auth.app_user_created', {
        requestId,
        userId: created.id,
        authUserId: supabaseUser.id,
      });
      return created;
    } catch (error) {
      if (isUniqueViolation(error, 'users_phone_unique')) {
        throw new HttpError(409, 'phone is already linked to another user');
      }

      throw error;
    }
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
