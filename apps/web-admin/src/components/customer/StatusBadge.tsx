import type {
  DeviceStatus,
  MaintenanceStatus,
  SessionStatus,
  SocketStatus,
  StationStatus,
  TicketStatus,
  UserRole,
} from '../../types/db.types';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  danger: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400',
  neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

function Badge({ label, variant }: { label: string; variant: BadgeVariant }) {
  return (
    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${VARIANT_CLASSES[variant]}`}>
      {label}
    </span>
  );
}

const SESSION_LABELS: Record<SessionStatus, { label: string; variant: BadgeVariant }> = {
  ACTIVE: { label: 'Aktif', variant: 'warning' },
  COMPLETED: { label: 'Tamamlandı', variant: 'success' },
  FAILED: { label: 'Başarısız', variant: 'danger' },
};

const SOCKET_LABELS: Record<SocketStatus, { label: string; variant: BadgeVariant }> = {
  AVAILABLE: { label: 'Müsait', variant: 'success' },
  CHARGING: { label: 'Şarjda', variant: 'warning' },
  FAULTY: { label: 'Arızalı', variant: 'danger' },
  RESERVED: { label: 'Rezerve', variant: 'neutral' },
};

const STATION_LABELS: Record<StationStatus, { label: string; variant: BadgeVariant }> = {
  ACTIVE: { label: 'Aktif', variant: 'success' },
  INACTIVE: { label: 'Pasif', variant: 'neutral' },
};

const TICKET_LABELS: Record<TicketStatus, { label: string; variant: BadgeVariant }> = {
  OPEN: { label: 'Açık', variant: 'warning' },
  IN_PROGRESS: { label: 'İşlemde', variant: 'warning' },
  CLOSED: { label: 'Kapalı', variant: 'neutral' },
};

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  const { label, variant } = SESSION_LABELS[status];
  return <Badge label={label} variant={variant} />;
}

export function SocketStatusBadge({ status }: { status: SocketStatus }) {
  const { label, variant } = SOCKET_LABELS[status];
  return <Badge label={label} variant={variant} />;
}

export function StationStatusBadge({ status }: { status: StationStatus }) {
  const { label, variant } = STATION_LABELS[status];
  return <Badge label={label} variant={variant} />;
}

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const { label, variant } = TICKET_LABELS[status];
  return <Badge label={label} variant={variant} />;
}

const DEVICE_LABELS: Record<DeviceStatus, { label: string; variant: BadgeVariant }> = {
  ONLINE: { label: 'Çevrimiçi', variant: 'success' },
  OFFLINE: { label: 'Çevrimdışı', variant: 'danger' },
  MAINTENANCE: { label: 'Bakımda', variant: 'warning' },
};

const MAINTENANCE_LABELS: Record<MaintenanceStatus, { label: string; variant: BadgeVariant }> = {
  OPEN: { label: 'Açık', variant: 'warning' },
  IN_PROGRESS: { label: 'Devam ediyor', variant: 'warning' },
  RESOLVED: { label: 'Çözüldü', variant: 'success' },
};

const ROLE_LABELS: Record<UserRole, { label: string; variant: BadgeVariant }> = {
  ADMIN: { label: 'Yönetici', variant: 'neutral' },
  OPERATOR: { label: 'Operatör', variant: 'neutral' },
  TECHNICIAN: { label: 'Teknisyen', variant: 'neutral' },
  CUSTOMER: { label: 'Müşteri', variant: 'neutral' },
};

const PRIORITY_LABELS: Record<'LOW' | 'MEDIUM' | 'CRITICAL', { label: string; variant: BadgeVariant }> = {
  LOW: { label: 'Düşük', variant: 'neutral' },
  MEDIUM: { label: 'Orta', variant: 'warning' },
  CRITICAL: { label: 'Kritik', variant: 'danger' },
};

export function DeviceStatusBadge({ status }: { status: DeviceStatus }) {
  const { label, variant } = DEVICE_LABELS[status];
  return <Badge label={label} variant={variant} />;
}

export function MaintenanceStatusBadge({ status }: { status: MaintenanceStatus }) {
  const { label, variant } = MAINTENANCE_LABELS[status];
  return <Badge label={label} variant={variant} />;
}

export function UserRoleBadge({ role }: { role: UserRole }) {
  const { label, variant } = ROLE_LABELS[role];
  return <Badge label={label} variant={variant} />;
}

export function TicketPriorityBadge({ priority }: { priority: 'LOW' | 'MEDIUM' | 'CRITICAL' }) {
  const { label, variant } = PRIORITY_LABELS[priority];
  return <Badge label={label} variant={variant} />;
}
