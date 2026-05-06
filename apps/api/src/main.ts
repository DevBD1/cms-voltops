import express, { Request, Response } from 'express';
import * as dotenv from 'dotenv';
import { AppService } from './app.service';
// 1. SORUNUN ÇÖZÜMÜ: Kendi paketimizi içeri alıyoruz
import { stations } from '@voltops/db'; 
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const appService = new AppService();

// 2. SORUNUN ÇÖZÜMÜ: Veritabanı bağlantısını kuruyoruz
// .env dosyanızda DATABASE_URL tanımlı olmalı
const queryClient = postgres(process.env.DATABASE_URL as string);
const db = drizzle(queryClient);

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send(appService.getHello());
});

// YENİ: Gerçek veritabanından istasyonları çeken endpoint
app.get('/api/stations', async (req: Request, res: Response) => {
  try {
    // Drizzle ORM burada devreye giriyor
    const allStations = await db.select().from(stations);
    res.json(allStations);
  } catch (error) {
    console.error('Veritabanı hatası:', error);
    res.status(500).json({ error: 'İstasyonlar yüklenirken bir hata oluştu.' });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});