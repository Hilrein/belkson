# Neon + Belkson

Каталог (товары + валюта) хранится в **Neon PostgreSQL**.  
Изменения в `/admin` видны **всем** посетителям сайта.

## 1. Создать БД в Neon

1. [console.neon.tech](https://console.neon.tech) → New Project  
2. Copy **connection string** (pooled / serverless recommended)  
3. SQL Editor → вставить содержимое `db/schema.sql` → Run  

## 2. Локально

```bash
cd Belkson
cp .env.example .env
# в .env:
# DATABASE_URL=postgresql://...@ep-....neon.tech/neondb?sslmode=require

npm run db:seed    # разово: проверка БД + currency (товары только из админки)
npm run dev        # сайт + API на одном порту :5173
```

Товары **не** зашиты в код — только Neon. Добавляйте через `/admin`.

API в dev поднимается **внутри Vite** (плагин в `vite.config.ts`).  
Отдельно `npm run dev:api` не нужен — только если хотите API на :3001.

## 3. Vercel

1. Импортировать репозиторий `Belkson`  
2. Environment Variables → `DATABASE_URL` = Neon URI  
3. Deploy  

API: `api/index.ts` (Hono) → `/api/*`  
Фронт: Vite `dist/`  

## API

| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/catalog` | товары + currency |
| POST | `/api/products` | создать |
| PUT | `/api/products/:id` | обновить |
| DELETE | `/api/products/:id` | удалить |
| PUT | `/api/settings/currency` | валюта сайта |

## Важно

- `DATABASE_URL` **никогда** не класть в клиентский код  
- Для продакшена добавьте авторизацию на `/admin` и запись в API  
