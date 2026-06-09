# Universal Docker image — Fly.io, o'z VPS yoki boshqa platforma uchun.
FROM node:20-alpine

WORKDIR /app

# Avval faqat manifest fayllar — qatlam keshini saqlash uchun
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Qolgan kod (backend, RAG indeks, data)
COPY . .

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["node", "server.js"]
