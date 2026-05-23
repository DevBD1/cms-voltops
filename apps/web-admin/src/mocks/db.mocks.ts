// src/mocks/db.mocks.ts
import { 
  Station, 
  ChargingSession, 
  Invoice, 
  MaintenanceRecord, 
  SupportTicket,
  User
} from '../types/db.types';

// Sistem Kullanıcıları
export const MOCK_USERS: User[] = [
  { id: "usr_101", email: "ahmet.yilmaz@mail.com", fullName: "Ahmet Yılmaz", role: "CUSTOMER", createdAt: "2026-01-15T10:00:00Z" },
  { id: "usr_102", email: "mehmet.demir@voltops.com", fullName: "Mehmet Demir", role: "TECHNICIAN", createdAt: "2025-11-01T08:30:00Z" },
  { id: "usr_103", email: "canan.tekin@voltops.com", fullName: "Canan Tekin", role: "CUSTOMER", createdAt: "2026-03-10T14:15:00Z" }
];

// Fiziksel Donanım ve Topoloji Dağılımı (Stations -> Devices -> Sockets)
export const MOCK_STATIONS: Station[] = [
  {
    id: "st_01",
    name: "VoltOps Bursa Merkez Hub",
    code: "TR-16-NIL-01",
    status: "ACTIVE",
    city: "Bursa",
    district: "Nilüfer",
    address: "İhsaniye Mah. Barbaros Cad. No:12",
    latitude: 40.2215,
    longitude: 28.9622,
    devices: [
      {
        id: "dev_01",
        stationId: "st_01",
        serialNumber: "VOP-TX-180A",
        model: "HyperCharge DC 180kW",
        firmwareVersion: "v2.4.1",
        status: "ONLINE",
        sockets: [
          { id: "sock_01", deviceId: "dev_01", socketNumber: 1, type: "DC_CCS2", powerKw: 120, status: "CHARGING", currentSessionId: "sess_001" },
          { id: "sock_02", deviceId: "dev_01", socketNumber: 2, type: "DC_CCS2", powerKw: 60, status: "AVAILABLE" }
        ]
      },
      {
        id: "dev_02",
        stationId: "st_01",
        serialNumber: "VOP-AC-022B",
        model: "EcoCharge AC 22kW",
        firmwareVersion: "v1.9.8",
        status: "ONLINE",
        sockets: [
          { id: "sock_03", deviceId: "dev_02", socketNumber: 1, type: "AC_TYPE2", powerKw: 22, status: "AVAILABLE" },
          { id: "sock_04", deviceId: "dev_02", socketNumber: 2, type: "AC_TYPE2", powerKw: 22, status: "RESERVED" }
        ]
      }
    ]
  },
  {
    id: "st_02",
    name: "Görükle Kampüs İstasyonu",
    code: "TR-16-GUK-02",
    status: "ACTIVE",
    city: "Bursa",
    district: "Nilüfer",
    address: "Uludağ Üniversitesi Görükle Kampüsü",
    latitude: 40.2180,
    longitude: 28.8250,
    devices: [
      {
        id: "dev_03",
        stationId: "st_02",
        serialNumber: "VOP-TX-300W",
        model: "UltraCharge DC 300kW",
        firmwareVersion: "v3.0.1",
        status: "MAINTENANCE",
        sockets: [
          { id: "sock_05", deviceId: "dev_03", socketNumber: 1, type: "DC_CCS2", powerKw: 150, status: "FAULTY" },
          { id: "sock_06", deviceId: "dev_03", socketNumber: 2, type: "DC_CHADEMO", powerKw: 150, status: "FAULTY" }
        ]
      }
    ]
  },
  {
    id: "st_03",
    name: "Kocaeli Umuttepe Dağıtım Hub",
    code: "TR-41-IZM-01",
    status: "ACTIVE",
    city: "Kocaeli",
    district: "İzmit",
    address: "Umuttepe Kampüsü, Kabaoğlu Mah.",
    latitude: 40.8210,
    longitude: 29.9241,
    devices: [
      {
        id: "dev_04",
        stationId: "st_03",
        serialNumber: "VOP-TX-120X",
        model: "HyperCharge DC 120kW",
        firmwareVersion: "v2.3.9",
        status: "ONLINE",
        sockets: [
          { id: "sock_07", deviceId: "dev_04", socketNumber: 1, type: "DC_CCS2", powerKw: 90, status: "CHARGING", currentSessionId: "sess_002" },
          { id: "sock_08", deviceId: "dev_04", socketNumber: 2, type: "AC_TYPE2", powerKw: 22, status: "AVAILABLE" }
        ]
      }
    ]
  }
];

// Aktif ve Geçmiş Şarj Seansları (TimescaleDB uyumlu kronolojik veri)
export const MOCK_SESSIONS: ChargingSession[] = [
  {
    id: "sess_001",
    socketId: "sock_01",
    userId: "usr_101",
    userFullName: "Ahmet Yılmaz",
    stationName: "VoltOps Bursa Merkez Hub",
    startTime: "2026-05-16T10:15:00Z",
    totalKwh: 34.5,
    totalAmount: 258.75,
    status: "ACTIVE"
  },
  {
    id: "sess_002",
    socketId: "sock_07",
    userId: "usr_103",
    userFullName: "Canan Tekin",
    stationName: "Kocaeli Umuttepe Dağıtım Hub",
    startTime: "2026-05-16T11:00:00Z",
    totalKwh: 12.2,
    totalAmount: 91.50,
    status: "ACTIVE"
  },
  {
    id: "sess_000",
    socketId: "sock_02",
    userId: "usr_101",
    userFullName: "Ahmet Yılmaz",
    stationName: "VoltOps Bursa Merkez Hub",
    startTime: "2026-05-15T14:00:00Z",
    endTime: "2026-05-15T14:45:00Z",
    totalKwh: 45.0,
    totalAmount: 337.50,
    status: "COMPLETED"
  }
];

// Oturumlara Bağlı Fişler / Faturalar
export const MOCK_INVOICES: Invoice[] = [
  {
    id: "inv_4412",
    sessionId: "sess_000",
    invoiceNumber: "VOP202605150001",
    amount: 337.50,
    tax: 61.36,
    issuedAt: "2026-05-15T14:50:00Z",
    paymentMethod: "CREDIT_CARD"
  }
];

// Cihaz Bakım Kayıtları
export const MOCK_MAINTENANCE: MaintenanceRecord[] = [
  {
    id: "maint_01",
    deviceId: "dev_03",
    deviceSerialNumber: "VOP-TX-300W",
    technicianName: "Mehmet Demir",
    description: "Sıcaklık sensörü aşırı ısınma uyarısı verdi. Güç modülü kontrol edilecek.",
    status: "OPEN",
    createdAt: "2026-05-16T08:11:45Z"
  }
];

// Kullanıcı Destek Talepleri
export const MOCK_TICKETS: SupportTicket[] = [
  {
    id: "tkt_551",
    userId: "usr_101",
    userFullName: "Ahmet Yılmaz",
    subject: "QR Kod Okuma Hatası",
    description: "Görükle istasyonundaki DC cihazın ekranındaki QR kod tarayıcı tarafından korumalı cam çizildiği için okunamıyor.",
    status: "OPEN",
    priority: "MEDIUM",
    createdAt: "2026-05-16T09:30:00Z"
  }
];