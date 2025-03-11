FROM node:18-alpine

WORKDIR /app

# Bağımlılıkları kopyala ve yükle
COPY package*.json ./
RUN npm ci --only=production

# Uygulama dosyalarını kopyala
COPY . .

# Uygulamayı çalıştır
EXPOSE 3000
CMD ["node", "soap-middleware.js"]