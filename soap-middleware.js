// soap-middleware.js
// SOAPAction ve Content-Type düzeltilmiş SOAP proxy middleware
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const morgan = require('morgan');
const winston = require('winston');

// Loglama konfigürasyonu
const logger = winston.createLogger({
  level: 'debug', // Daha detaylı log için debug seviyesine çıkarıldı
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Uygulama konfigürasyonu
const config = {
  // Hedef Intellect SOAP servisi
  targetUrl: process.env.TARGET_URL || 'http://test12.probizyazilim.com/Intellect/ExecuteTransaction.asmx',
  // HTTP portu - Render tarafından sağlanan PORT değişkenini kullan
  port: process.env.PORT || 3000,
  // Doğru SOAPAction - test12.probizyazilim.com için gerekli değer
  soapAction: '"http://tempuri.org/Intellect/ExecuteTransaction/ExecuteTransaction"'
};

const app = express();

// Tüm gelen istekleri logla
app.use(morgan('combined'));

// Raw body parser, SOAP XML'i işlemek için
app.use(express.raw({
  type: ['text/*', 'application/*'],
  limit: '5mb'
}));

// URL-encoded parser
app.use(express.urlencoded({ extended: true }));

// JSON parser
app.use(express.json());

// Kök dizin için basit bir yanıt
app.get('/', (req, res) => {
  logger.info('Kök dizine istek geldi');
  res.send('SOAP Proxy Middleware aktif. /Intellect/ExecuteTransaction.asmx adresine SOAP isteklerinizi gönderin.');
});

// Ana SOAP endpoint'i
app.post('/Intellect/ExecuteTransaction.asmx', async (req, res) => {
  const startTime = Date.now();
  const requestId = Date.now().toString();
  
  logger.info(`[${requestId}] Yeni SOAP isteği alındı`);
  logger.info(`[${requestId}] Content-Type: ${req.headers['content-type']}`);
  
  try {
    // İsteği logla
    let requestBody = '';
    if (Buffer.isBuffer(req.body)) {
      requestBody = req.body.toString('utf-8');
    } else if (typeof req.body === 'object') {
      requestBody = JSON.stringify(req.body);
    } else {
      requestBody = req.body;
    }
    
    logger.debug(`[${requestId}] İstek gövdesi: ${requestBody}`);
    
    // SOAPAction başlığını alma - ama hedef sunucuya gönderirken yapılandırma dosyasındaki değeri kullan
    const clientSoapAction = req.headers['soapaction'] || '';
    logger.debug(`[${requestId}] Client SOAPAction: ${clientSoapAction}`);
    logger.debug(`[${requestId}] Kullanılacak SOAPAction: ${config.soapAction}`);

    // Request XML'den içeriği çıkartma
    let xmlContent = requestBody;
    try {
      // <Request> ... </Request> içindeki veriyi çıkartmaya çalış
      const requestTagMatch = /<Request>(.*?)<\/Request>/s.exec(xmlContent);
      if (requestTagMatch && requestTagMatch[1]) {
        xmlContent = requestTagMatch[1].trim();
        // XML entity'lerini decode et (&lt; -> <, &gt; -> >, vb.)
        xmlContent = xmlContent.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
        logger.debug(`[${requestId}] Çıkartılan Request içeriği: ${xmlContent}`);
      }
    } catch (e) {
      logger.warn(`[${requestId}] XML içeriği çıkartılamadı: ${e.message}`);
    }
    
    // İsteği doğrudan hedef sunucuya yönlendir
    logger.info(`[${requestId}] İstek ${config.targetUrl} adresine yönlendiriliyor`);
    
    // Farklı format türlerini dene - ilk olarak XML formatında dene
    try {
      logger.info(`[${requestId}] XML formatında istek deneniyor`);
      const response = await axios.post(config.targetUrl, xmlContent, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': config.soapAction
        },
        responseType: 'text',
        timeout: 30000
      });
      
      // Yanıtı logla
      logger.info(`[${requestId}] Hedef sunucudan ${response.status} yanıtı alındı (XML)`);
      logger.debug(`[${requestId}] Yanıt gövdesi: ${response.data}`);
      
      // Yanıtı istemciye gönder
      res.status(response.status);
      res.set('Content-Type', 'text/xml; charset=utf-8');
      res.send(response.data);
      
      // İşlem süresini logla
      const duration = Date.now() - startTime;
      logger.info(`[${requestId}] İşlem tamamlandı, süre: ${duration}ms`);
      return;
    } catch (xmlError) {
      logger.warn(`[${requestId}] XML formatında istek başarısız: ${xmlError.message}`);
      
      // XML başarısız olursa form-urlencoded dene
      try {
        logger.info(`[${requestId}] Form-urlencoded formatında istek deneniyor`);
        const formResponse = await axios.post(config.targetUrl, 
          new URLSearchParams({ 'Request': xmlContent }), 
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'SOAPAction': config.soapAction
            },
            responseType: 'text',
            timeout: 30000
          });
        
        // Yanıtı logla
        logger.info(`[${requestId}] Hedef sunucudan ${formResponse.status} yanıtı alındı (Form)`);
        logger.debug(`[${requestId}] Yanıt gövdesi: ${formResponse.data}`);
        
        // Yanıtı istemciye gönder
        res.status(formResponse.status);
        res.set('Content-Type', 'text/xml; charset=utf-8');
        res.send(formResponse.data);
        
        // İşlem süresini logla
        const duration = Date.now() - startTime;
        logger.info(`[${requestId}] İşlem tamamlandı, süre: ${duration}ms`);
        return;
      } catch (formError) {
        logger.warn(`[${requestId}] Form-urlencoded formatında istek başarısız: ${formError.message}`);
        
        // Orijinal SOAP XML'i olduğu gibi göndermeyi dene
        try {
          logger.info(`[${requestId}] Orijinal SOAP XML formatında istek deneniyor`);
          const soapResponse = await axios.post(config.targetUrl, requestBody, {
            headers: {
              'Content-Type': 'text/xml; charset=utf-8',
              'SOAPAction': config.soapAction
            },
            responseType: 'text',
            timeout: 30000
          });
          
          // Yanıtı logla
          logger.info(`[${requestId}] Hedef sunucudan ${soapResponse.status} yanıtı alındı (SOAP XML)`);
          logger.debug(`[${requestId}] Yanıt gövdesi: ${soapResponse.data}`);
          
          // Yanıtı istemciye gönder
          res.status(soapResponse.status);
          res.set('Content-Type', 'text/xml; charset=utf-8');
          res.send(soapResponse.data);
          
          // İşlem süresini logla
          const duration = Date.now() - startTime;
          logger.info(`[${requestId}] İşlem tamamlandı, süre: ${duration}ms`);
          return;
        } catch (soapError) {
          logger.error(`[${requestId}] Tüm istek formatları başarısız oldu`);
          throw soapError;
        }
      }
    }
    
  } catch (error) {
    logger.error(`[${requestId}] Hata oluştu: ${error.message}`);
    if (error.stack) logger.error(`[${requestId}] Stack: ${error.stack}`);
    
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
app.get('/Intellect/ExecuteTransaction.asmx', (req, res) => {
  logger.info('ExecuteTransaction.asmx endpoint\'ine GET isteği geldi');
  if (req.query.wsdl !== undefined) {
    // WSDL dosyasını oku ve gönder
    logger.info('WSDL dosyası istendi');
    
    // Hedef servisten WSDL'i al
    axios.get(`${config.targetUrl}?wsdl`)
      .then(response => {
        logger.info('WSDL alındı ve gönderiliyor');
        res.type('application/xml');
        res.send(response.data);
      })
      .catch(error => {
        logger.error(`WSDL alınamadı: ${error.message}`);
        // Yerel WSDL dosyasını göndermeyi dene
        const wsdlPath = path.join(__dirname, 'service.wsdl');
        if (fs.existsSync(wsdlPath)) {
          logger.info('Yerel WSDL dosyası gönderiliyor');
          res.type('application/xml');
          res.sendFile(wsdlPath);
        } else {
          res.status(404).send('WSDL bulunamadı');
        }
      });
  } else {
    // WSDL sorgusu değilse, bir açıklama mesajı gönder
    res.send('SOAP Servisi aktif. WSDL için ?wsdl parametresini ekleyin veya SOAP isteklerinizi buraya POST edin.');
  }
});

// Durum kontrolü için basit bir endpoint
app.get('/status', (req, res) => {
  logger.info('Durum kontrolü yapıldı');
  res.json({
    status: 'up',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    targetUrl: config.targetUrl,
    soapAction: config.soapAction
  });
});

// Hata ayıklama için herhangi bir yola yapılan istekleri logla
app.use((req, res, next) => {
  logger.info(`Bilinmeyen endpoint'e istek: ${req.method} ${req.path}`);
  res.status(404).send('Endpoint bulunamadı.');
});

// Sunucuyu başlat
app.listen(config.port, () => {
  logger.info(`SOAP Middleware ${config.port} portunda başlatıldı`);
  logger.info(`Hedef URL: ${config.targetUrl}`);
  logger.info(`SOAP Endpoint: /Intellect/ExecuteTransaction.asmx`);
  logger.info(`SOAPAction: ${config.soapAction}`);
});

// Beklenmedik hatalar için işleyici
process.on('uncaughtException', (error) => {
  logger.error(`Beklenmedik hata: ${error.message}`);
  logger.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`İşlenmeyen Promise reddi: ${reason}`);
});
