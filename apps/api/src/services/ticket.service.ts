import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { stations, tickets, users } from '../db/schema';
import { HttpError } from '../utils/http';

type Ticket = typeof tickets.$inferSelect;

export class TicketService {
  async listTickets(filters?: { userId?: number; status?: string }) {
    const ticketRows = await db.select().from(tickets);

    return ticketRows
      .filter((ticket) => (filters?.userId ? ticket.userId === filters.userId : true))
      .filter((ticket) => (filters?.status ? ticket.status === filters.status : true));
  }

  async createTicket(input: {
    userId: number;
    stationCode?: string | null;
    sessionId?: number | null;
    title: string;
    description: string;
    priority?: Ticket['priority'];
  }): Promise<Ticket> {
    if (!(await this.userExists(input.userId))) {
      throw new HttpError(404, 'User not found');
    }

    if (input.stationCode && !(await this.stationExists(input.stationCode))) {
      throw new HttpError(404, 'Station not found');
    }

    if (!input.title?.trim()) {
      throw new HttpError(400, 'title is required');
    }

    if (!input.description?.trim()) {
      throw new HttpError(400, 'description is required');
    }

    const [ticket] = await db
      .insert(tickets)
      .values({
        userId: input.userId,
        stationCode: input.stationCode ?? null,
        sessionId: input.sessionId ?? null,
        title: input.title.trim(),
        description: input.description.trim(),
        priority: input.priority ?? 'normal',
        status: 'open',
      })
      .returning();

    return ticket;
  }

  async updateTicket(
    ticketId: number,
    input: Partial<Pick<Ticket, 'assignedEmployeeId' | 'priority' | 'status'>>,
  ): Promise<Ticket> {
    const [ticket] = await db
      .update(tickets)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(tickets.id, ticketId))
      .returning();

    if (!ticket) {
      throw new HttpError(404, 'Ticket not found');
    }

    return ticket;
  }

  private async userExists(userId: number): Promise<boolean> {
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
    return Boolean(user);
  }

  private async stationExists(stationCode: string): Promise<boolean> {
    const [station] = await db.select({ stationCode: stations.stationCode }).from(stations).where(eq(stations.stationCode, stationCode));
    return Boolean(station);
  }
}
