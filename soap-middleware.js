// soap-middleware.js
// Basit bir SOAP proxy middleware
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const morgan = require('morgan');
const winston = require('winston');

// Loglama konfigürasyonu
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Uygulama konfigürasyonu
const config = {
  // Hedef Intellect SOAP servisi
  targetUrl: process.env.TARGET_URL || 'http://test12.probizyazilim.com/Intellect/ExecuteTransaction.asmx',
  // SOAP endpoint yolu
  soapEndpoint: '/Intellect/ExecuteTransaction.asmx',
  // HTTP portu
  port: process.env.PORT || 3000
};

const app = express();

// HTTP isteklerini logla
app.use(morgan('combined'));

// Raw body parser, SOAP XML'i işlemek için
app.use(express.raw({
  type: ['text/xml', 'application/soap+xml'],
  limit: '5mb'
}));

// Ana SOAP endpoint'i
app.post(config.soapEndpoint, async (req, res) => {
  const startTime = Date.now();
  const requestId = Date.now().toString();
  
  logger.info(`[${requestId}] Yeni SOAP isteği alındı`);
  
  try {
    // İsteği logla
    const requestBody = req.body.toString('utf-8');
    logger.debug(`[${requestId}] İstek gövdesi: ${requestBody}`);
    
    // SOAPAction başlığını alma
    const soapAction = req.headers['soapaction'] || '';
    logger.debug(`[${requestId}] SOAPAction: ${soapAction}`);
    
    // SOAP içeriği doğrudan iletiliyor, CDATA işlenmesi gerekmez
    // Ancak talep edilirse CDATA işleme kodu eklenebilir
    let processedBody = requestBody;
    
    // İleri işleme gerekiyorsa burada yapılabilir
    // Örnek: XML içeriğini nesneye dönüştürme, içeriğe ek bilgi ekleme vb.
    
    // İsteği hedef sunucuya yönlendir
    logger.info(`[${requestId}] İstek ${config.targetUrl} adresine yönlendiriliyor`);
    
    // Intellect'e özel - XML içeriğini application/x-www-form-urlencoded olarak gönder
    // İçeriği Request parametresine yerleştir
    const response = await axios.post(config.targetUrl, 
      new URLSearchParams({ 'Request': processedBody }), 
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'SOAPAction': soapAction
        },
        responseType: 'text',
        timeout: 30000 // 30 saniye zaman aşımı
      });
    
    // Yanıtı logla
    logger.info(`[${requestId}] Hedef sunucudan ${response.status} yanıtı alındı`);
    logger.debug(`[${requestId}] Yanıt gövdesi: ${response.data}`);
    
    // Yanıtı istemciye gönder
    res.status(response.status);
    res.set('Content-Type', 'text/xml; charset=utf-8');
    res.send(response.data);
    
    // İşlem süresini logla
    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] İşlem tamamlandı, süre: ${duration}ms`);
    
  } catch (error) {
    logger.error(`[${requestId}] Hata oluştu: ${error.message}`);
    
    if (error.response) {
      logger.error(`[${requestId}] Yanıt durumu: ${error.response.status}`);
      logger.error(`[${requestId}] Yanıt gövdesi: ${error.response.data}`);
      
      // Hata yanıtını istemciye gönder
      res.status(error.response.status);
      res.set('Content-Type', 'text/xml; charset=utf-8');
      res.send(error.response.data);
    } else {
      // Genel hata yanıtı
      const errorResponse = `
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <soap:Fault>
              <faultcode>soap:Server</faultcode>
              <faultstring>${error.message}</faultstring>
              <detail>Middleware bağlantı hatası</detail>
            </soap:Fault>
          </soap:Body>
        </soap:Envelope>
      `;
      
      res.status(500);
      res.set('Content-Type', 'text/xml; charset=utf-8');
      res.send(errorResponse);
    }
    
    // İşlem süresini logla
    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] Hata ile tamamlandı, süre: ${duration}ms`);
  }
});

// WSDL dosyası isteği için endpoint
app.get(`${config.soapEndpoint}?wsdl`, (req, res) => {
  // WSDL dosyasını oku ve gönder
  const wsdlPath = path.join(__dirname, 'service.wsdl');
  
  if (fs.existsSync(wsdlPath)) {
    logger.info('WSDL dosyası istendi ve gönderildi');
    res.type('application/xml');
    res.sendFile(wsdlPath);
  } else {
    // WSDL dosyası yoksa hedef servisten al
    logger.info('Lokal WSDL dosyası bulunamadı, hedef servisten isteniyor');
    axios.get(`${config.targetUrl}?wsdl`)
      .then(response => {
        res.type('application/xml');
        res.send(response.data);
      })
      .catch(error => {
        logger.error(`WSDL alınamadı: ${error.message}`);
        res.status(404).send('WSDL bulunamadı');
      });
  }
});

// Durum kontrolü için basit bir endpoint
app.get('/status', (req, res) => {
  res.json({
    status: 'up',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Sunucuyu başlat
app.listen(config.port, () => {
  logger.info(`SOAP Middleware ${config.port} portunda başlatıldı`);
  logger.info(`Hedef URL: ${config.targetUrl}`);
  logger.info(`SOAP Endpoint: ${config.soapEndpoint}`);
});

// Beklenmedik hatalar için işleyici
process.on('uncaughtException', (error) => {
  logger.error(`Beklenmedik hata: ${error.message}`);
  logger.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`İşlenmeyen Promise reddi: ${reason}`);
});