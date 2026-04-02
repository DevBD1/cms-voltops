# VoltOps - Elektrikli Araç Şarj İstasyonları Ağı 
## Kod Katkıcıları
- Mehmet Burak Dorman, 251307120
- Batuhan Gürsoy, 251307098

## Rehberler
- [Proje esasları ve isterler.](https://drive.google.com/file/d/1jcksmv4zyBqe_OCeBH6PIrWcMghsqQz0/view?usp=sharing)
- [Veritabanı altyapısı nasıl kurulur?](https://docs.google.com/document/d/1c47XBCKIk8ppzKcUsIegOYBHHvTmLNGhnPMATkqBlZs/edit?usp=sharing)

## Proje Özeti
VoltOps, elektrikli araç şarj istasyonlarının temel operasyonlarını dijital ortamda yönetmek amacıyla tasarlanan ilişkisel veri tabanı odaklı bir projedir. Projenin temel amacı; kullanıcılar, çalışanlar, şarj istasyonları, istasyonlara bağlı soketler, şarj oturumları, fişler, bakım kayıtları ve destek talepleri gibi temel varlıkları tek bir sistem altında düzenli ve ilişkili bir şekilde modellemektir.

Bu proje kapsamında gerçek hayatta karşılaşılabilecek temel ihtiyaçlar dikkate alınmıştır. Sistemde kullanıcıların şarj oturumu başlatabilmesi, her istasyonda birden fazla soketin bulunabilmesi, gerçekleşen oturumlara ait fişlerin oluşturulabilmesi, bakım işlemlerinin kayıt altına alınabilmesi ve kullanıcı destek taleplerinin takip edilebilmesi amaçlanmıştır. Böylece hem operasyonel süreçlerin hem de kullanıcıyla ilgili süreçlerin veritabanı düzeyinde yönetilebilir hale getirilmesi hedeflenmiştir.

VoltOps projesinde veriler ilişkisel veri tabanı mantığına uygun şekilde tablolar arasında bağlantılar kurularak modellenmektedir. Bu yapı sayesinde veri tekrarının azaltılması, veri bütünlüğünün korunması ve farklı varlıklar arasındaki ilişkilerin açık bir biçimde gösterilmesi amaçlanmaktadır. Proje, veri tabanı tasarımı, varlık-ilişki modeli oluşturma ve temel sistem analizi gibi ders kapsamında kazanılması hedeflenen becerileri uygulamalı olarak göstermektedir.

Sonuç olarak VoltOps, elektrikli araç şarj istasyonu yönetimi senaryosu üzerinden hazırlanmış, gerçek dünyaya yakın fakat ders kapsamına uygun ölçekte tutulmuş bir veri tabanı projesidir. Proje ile hem ilişkisel veri tabanı tasarımının temel prensipleri uygulanmakta hem de operasyonel bir sistemin veri yapısı anlaşılır ve düzenli bir biçimde ortaya konulmaktadır.

## Geliştirme Ortamı
MVP düzeyinde stack böyledir:
- PostgreSQL: ana DB
- Node.js Express: API
- Drizzle: ORM, config and SQL migrations
- pgAdmin: veritabanı için GUI aracı
- Redis: cache / rate limit / queue yarvis
- Nginx: reverse proxy
- Docker Compose: lokal orkestrasyon
- Dozzle: log görüntüleme

## Projenin Yüklenmesi ve Çalıştırılması
pnpm monorepo with:
- `voltops/database`: PostgreSQL + TimescaleDB (Docker Compose)
- `voltops/api`: Node.js Express
- `voltops/web`: React (Vite)
- `voltops/mobile`: React Native Expo

### Ön Gereklilikler
- Node.js 20+
- pnpm 9+
- Docker + Docker Compose

### Install

Proje dizininde terminalden çalıştır:
```bash
pnpm install
```

#### Run all dev services via Turbo

```bash
pnpm dev
```

#### Run individual services

Database:
```bash
pnpm --filter @voltops/database db:up
pnpm --filter @voltops/database db:logs
pnpm --filter @voltops/database db:down
```

API:
```bash
cd voltops/api
pnpm --filter @voltops/api dev
```

Web:
```bash
pnpm --filter @voltops/web dev
```
