# Intellect SOAP Proxy Middleware

Bu proje, iki Intellect sistemi arasında SOAP XML verilerini yönlendiren bir middleware uygulamasıdır. EGT3 sisteminden gelen SOAP isteklerini test12.probizyazilim.com'a HTTP POST formatında iletir.

## Özellikler

- EGT3 ile test12.probizyazilim.com arasında otomatik veri aktarımı
- SOAP isteklerini HTTP POST formatına dönüştürme
- XML verilerinin uygun formatta çıkarılması ve işlenmesi
- Kapsamlı hata işleme ve loglama
- Otomatik başlama ve sürekli çalışma (arka planda servis olarak)

## Teknik Detaylar

Middleware aşağıdaki işlem akışını gerçekleştirir:

1. **İstek Alımı**: EGT3'ten SOAP formatında XML alır
2. **İstek İşleme**: XML içinden `<Request>` etiketleri arasındaki veriyi çıkarır
3. **Format Dönüşümü**: XML verisini HTTP POST formatına dönüştürür
4. **İstek Yönlendirme**: Veriyi test12.probizyazilim.com'a gönderir
5. **Yanıt İşleme**: Alınan yanıtı SOAP formatına çevirir
6. **Yanıt Gönderme**: EGT3'e SOAP yanıtını iletir

## Kurulum

### Gereksinimler

- Node.js 14.0 veya üstü
- npm veya yarn

### Yerel Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Uygulamayı başlat
npm start
```

### Render.com Üzerinde Dağıtım

1. Render.com hesabınızda yeni bir Web Servisi oluşturun
2. GitHub/GitLab reponuzu bağlayın
3. Aşağıdaki ayarları yapın:
   - **Name**: Intellect-SOAP-Proxy (veya istediğiniz bir isim)
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node soap-middleware.js`
4. Çevre değişkenlerini ayarlayın:
   - `TARGET_URL`: `http://test12.probizyazilim.com/Intellect/ExecuteTransaction.asmx/ExecuteTransaction`
5. "Create Web Service" butonuna tıklayın

## Kullanım

Middleware, EGT3 sisteminden gelen SOAP isteklerini aşağıdaki endpoint'te bekler:

```
https://[sizin-render-url].onrender.com/Intellect/ExecuteTransaction.asmx
```

EGT3 sistemindeki "AktarmaAdresi" alanına bu URL'i ekleyebilirsiniz.

## Hata Giderme

Yaygın hatalar ve çözümleri:

### 415 Unsupported Media Type

Bu hata, istek formatının desteklenmediğini gösterir. Middleware bu hatayı otomatik olarak ele alır ve doğru formatta (HTTP POST) istek gönderir.

### 500 Internal Server Error

Hedef sunucudan kaynaklanan bir hatadır. Logları inceleyerek hatanın detaylarını görebilirsiniz.

## Loglar

Middleware, tüm işlemleri detaylı olarak loglar. Render.com'da "Logs" sekmesinden bu logları görüntüleyebilirsiniz.

Örnek log:

```
[1741684992263] Yeni SOAP isteği alındı
[1741684992263] İstek HTTP POST formatında http://test12.probizyazilim.com/Intellect/ExecuteTransaction.asmx/ExecuteTransaction adresine yönlendiriliyor
[1741684992263] Hedef sunucudan 200 yanıtı alındı
[1741684992263] İşlem tamamlandı, süre: 405ms
```

## Durum Kontrolü

Middleware'in çalışıp çalışmadığını kontrol etmek için:

```
https://[sizin-render-url].onrender.com/status
```

Bu endpoint, middleware'in durumu, çalışma süresi ve hedef URL bilgilerini JSON formatında döndürür.

## Lisans

MIT
