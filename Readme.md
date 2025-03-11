# SOAP Proxy Middleware

Bu proje, iki Intellect sistemi arasında SOAP isteklerini yönlendiren basit bir middleware uygulamasıdır. EGT3 sisteminden gelen SOAP isteklerini test12.probizyazilim.com'a iletir.

## Özellikler

- Otomatik SOAP isteği dinleme ve yönlendirme
- Tüm istekleri ve yanıtları loglama
- Hata takibi ve raporlama
- CDATA içeren XML'leri işleme
- Durum kontrolü için sağlık endpoint'i

## Kurulum

### Gereksinimler

- Node.js 14 veya daha yeni bir sürüm
- npm veya yarn

### Yükleme

```bash
# Repoyu klonlayın
git clone [repo_url]
cd soap-proxy-middleware

# Bağımlılıkları yükleyin
npm install
```

### Yapılandırma

Middleware'i yapılandırmak için aşağıdaki ortam değişkenlerini kullanabilirsiniz:

- `PORT`: Uygulamanın çalışacağı port (varsayılan: 3000)
- `TARGET_URL`: Hedef Intellect SOAP servisi URL'i (varsayılan: test12.probizyazilim.com)

### Çalıştırma

```bash
# Normal çalıştırma
npm start

# Geliştirme modunda çalıştırma (otomatik yeniden başlatma)
npm run dev
```

## Docker ile Çalıştırma

```bash
# Docker image'ını oluştur
docker build -t soap-middleware .

# Çalıştır
docker run -p 3000:3000 -e TARGET_URL=http://test12.probizyazilim.com/Intellect/ExecuteTransaction.asmx soap-middleware
```

### Docker Compose ile Çalıştırma

```bash
docker-compose up -d
```

## Kullanım

Middleware'in SOAP endpoint'i şudur:
```
http://localhost:3000/Intellect/ExecuteTransaction.asmx
```

WSDL belgesine buradan erişebilirsiniz:
```
http://localhost:3000/Intellect/ExecuteTransaction.asmx?wsdl
```

Servisin durumunu kontrol etmek için:
```
http://localhost:3000/status
```

## Loglar

Loglar `combined.log` ve `error.log` dosyalarında saklanır. Ayrıca konsola da yazılır.

## Sorun Giderme

En yaygın sorunlar ve çözümleri:

1. **Bağlantı Hatası**: Hedef URL'in doğru ve erişilebilir olduğundan emin olun.
2. **SOAP İstek Formatı**: İstek formatının hedef sistemin beklediği formatta olduğundan emin olun.
3. **Zaman Aşımı Sorunları**: Bağlantı zaman aşımı varsayılan olarak 30 saniyedir. Gerekirse kodu düzenleyerek değiştirebilirsiniz.