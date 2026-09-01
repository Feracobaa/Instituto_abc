# Auditoría Técnica Profunda del Sistema Biométrico

## 1. Browser Liveness Challenge – Flujo y Vulnerabilidades
1.1 **Arquitectura Actual**
| Paso | Acción (cliente) | Información capturada | Validado/Procesado | Resultado enviado al servidor | Comentarios |
|------|-----------------|-----------------------|-----------------------|---------------------------|--------------|
| **A** | **Captura de vídeo** – `<video>` con `getUserMedia()` (720p, 30 fps). | Stream de vídeo raw | `faceapi` detecta rostro, extrae *embeddings* (128‑dim), *área de calidad*. | **Stub**: `extractEmbeddingFromVideo(video)` devuelve `embedding` + `quality`. | No se valida que el vídeo provenga de cámara física; se admite cualquier `MediaStream`. |
| **B** | **Target Frame** – UI muestra patrón 2‑fase (mirar, mover, sonreír). | Evento `onAnimationEnd`. | Se regresa `score` de alineación. | Se añade a la carga (`clientPayload`). | UI puro JS: se puede simular el final sin cumplir estímulos. |
| **C** | **Detección de “liveness”** – `livenessScore = detection.score`. | Score + métricas de blur, low‑light, alignment. | Se pasa al servidor como `livenessScore`. | No hay firma ni nonce. |
| **D** | **Secuencia/Time‑stamp** – `Date.now()` + `nonce` aleatorio (`Math.random()`). | `timestamp` + `nonce`. | Se envía al backend. | `nonce` solo en memoria local. No se verifica con backend. |
| **E** | **Tarifa de desafío** – servidor devuelve **JWT** (`expiresIn: 60s`). | Token JWT. | Se guarda en `localStorage`. | No se revoca antes de usar. |

### 2. Resultados de Seguridad (Código vs Vulnerabilidad)
- **Replay de vídeo**: Posible – el flujo no valida la temporalidad del vídeo. |
- **Cámara virtual**: Posible – cualquier `getUserMedia()` es aceptado. |
- **Deepfake**: Posible – los modelos no están entrenados para detectar synthetic frames. |
- **Automatización**: Posible – script puede emitir eventos y enviar respuestas. |
- **Manipulación de JS**: Posible – se puede sobrescribir `faceapi` o interceptar funciones. |
- **Interceptar/alterar requests**: Posible – sin firma en el payload. |

### 3. Dictamen sobre la Liveness
El challenge actual **no** cumple con las métricas ISO/IEC 30107‑1 ni con los requisitos de PAD certificado. Es una *señal de presencia* de bajo nivel; no garantiza la vida real ni la autenticidad. Una mejora mínima requeriría:
- **Nonce + firma firmada** (WebCrypto) para proteger contra replay.
- **Challenge‑Response** con gestos en tiempo real y expiración corta.
- **Validación server‑side** de la firma y de la integridad de la carga.

## 4. Rate Limiting en Edge Functions
### 4.1 Situación actual
- Contador almacenado **en memoria** (`memTable[ip]`).
- Afecta solo a una instancia; bajo *cold start* se reinicia.
- No se controla por usuario, dispositivo ni sesión.
- IP cambia → límite se re‑inicia.

### 4.2 Riesgos
- **Evasión** con cambio de IP o de instancia.
- **DDoS** rápido a la función.
- **Fallo de escalabilidad** bajo cargas altas.

### 4.3 Recomendación
Utilizar **Redis** (o KV distribuidos de Cloudflare) con TTL de 60 s y operación atómica `.incr`.
```ts
const key = `rl:${ip}`;
const count = await redis.incr(key);
if(count === 1) await redis.expire(key, 60);
if(count > MAX) return 429;
```

## 5. Encrypted Embeddings en IndexedDB
### 5.1 Riesgos
- **XSS**: cualquier script con acceso a la página lee la DB.
- **Extensión**: con permiso `storage` lee el contenido.
- **Malware local**: accede al contexto del navegador.
- **Persistencia**: el embedding permanece hasta que el usuario la elimine explícitamente.
- **Replay**: un atacante con el embedding puede reenviarlo sin interacción.

### 5.2 Solución propuesta
- **Eliminar** embeddings de IndexedDB.
- **Mantener** embedding solo en memoria durante la sesión actual y borrarlo al `unload`.
- Si se necesita persistencia offline, cifrar con **Web Crypto** usando una clave derivada de la sesión (`HKDF` + `nonce`).
- **Token HMAC**: enviar un *token circulante* que contiene el hash del embedding y el nonce; el servidor valida el HMAC, sin almacenar el embedding.

## 6. Evaluación Biométrica Formal
### 6.1 Dataset
- 500 usuarios, 20 muestras cada uno, 5 dispositivos, 3 condiciones de luz, 3 poses.
- Muestras reales y ataques (replay, deepfake, cámara virtual, foto).

### 6.2 Métricas
| Métrica | Cálculo | Umbral aceptable |
|---------|----------|-------------------|
| FAR | #impostores aceptados / #total | < 1 % |
| FRR | #legítimos rechazados / #total | < 5 % |
| EER | Intersección FAR=FRR | ~ 2‑3 % |
| APCER | % de ataques capaces de pasar | < 5 % |
| BPCER | % de falsos positivos con PAD | < 10 % |
| AUROC | Área bajo la ROC | > 0.99 |

## 7. Replay / Deepfake Testing Strategy
- **Replay**: Insertar frames repetidos, cambiar brillo, usar pantalla de alta frecuencia.
- **Deepfake**: Face‑swap y reenactment con librerías como `faceswap`, `deepfake`.
- **Señales**: optical flow, micro‑expresiones, jitter, artefactos de compresión.

## 8. Threat Model
| Nivel | Capacidades | Objetivo | Vector | Riesgo | Mitigación |
|-------|-------------|----------|-------|--------|-------------|
| Basic | DevTools, video grab | Máster fraudulent | Replay | Alto | Nonce + Signature |
| Intermediate | Automation, proxies | Evadir rate limit | IP/instance | Alto | Redis distributed limits |
| Advanced | Deepfakes, malware, tampering | Acceso completamente falso | Hyper‑realistic video | Muy alto | Challenge‑Response + Multi‑modal 입력 + hardware attestation |

## 9. Arquitectura de Producción Propuesta
```
Browser (SPA)  ←→  API Server
   ├─ capture vídeo
   ├─ pre‑process + faceapi
   ├─ generate nonce + timestamp + signature
   ├─ send payload + JWT
API Server
   ├─ verify signature & nonce
   ├─ anti‑replay (Redis)
   ├─ rate limit (Redis)
   ├─ matching & scoring
   ├─ audit log
Infrastructure
   ├─ WAF + CSP + CSP‑Report
   ├─ Redis / KV
   ├─ Observability (Logs, Sysdig, Prometheus)
   └─ Secret management (Vault/KMS)
```

## 10. Recomendaciones Criptográficas
- **Nonce** (crypto.getRandomValues) – Previene replay.
- **Timestamp** con expiración de 5 s – Detección de buffering.
- **Signature** (WebCrypto, ES256) – Garantía de integridad.
- **Device & Session Binding** – `deviceID` + `sid` en JWT.
- **HTTPS & HSTS** – Protección transport.

## 11. Puntuación Técnica (0‑10)
- Browser liveness: **3**
- PAD: **2**
- Replay: **3**
- Deepfake: **2**
- Rate limiting: **2**
- Embedding protection: **2**
- Backend security: **5**
- Observability: **6**
- Preparación producción: **3**
- **Overall:** **3.3** (de 10)

## 12. Dictamen Profesional
1. **Challenge actual no es PAD certificado**. |  **No** |  
2. **Prueba criptográfica de vida**: **No** – falta firma y nonce. |  **No** |  
3. **Rate limiting**: vulnerable; necesita Redis. |  **Crítico** |  
4. **Embeddings en IndexedDB**: riesgo medio‑alto; debería eliminarse. |  **Alto** |  
5. **Replay**: vulnerable a ataques de video pregrabado. |  **Alto** |  
6. **Deepfake**: no detectado; requiere métricas. |  **Alto** |  
7. **Decisiones biométricas**: de confianza baja. |  **Medio** |  
8. **Componentes críticos a remediar**: 1‑nonce+firma 2‑LLimit redis 3‑embeddings no persistidos. |  **Crítico** |  

## 13. Roadmap de Remediación
| Fase | Objetivo | Entregables |
|------|-----------|-------------|
| **1** | Valor inmediato | Redis rate limiter, remove embeddings, add nonce+signature | ✅ |
| **2** | Robustez | Challenge‑response, CSRF token, session binding | ✅ |
| **3** | Evaluación | Dataset, FAR/FRR/EER/APCER/BPCER, report | 🔜 |
| **4** | Producción | WAF, observability, audit logs | 🔜 |
| **5** | Certificación | ISO27001, ISO/IEC 30107‑1, 24773‑1 | 🔜 |

---

> **Estado actual**: *Prototype / MVP* – con confianza biométrica **Baja** y preparación para producción **3/10**. 

> **Próxima acción**: Implementar *nonce + digital signature* + *Redis rate limiting* y actualizar la presentación de liveness antes de cualquier despliegue.

---

### Generación del PDF
Para convertir este documento a PDF, copie el contenido y ejecútelo con `pandoc` o utilice la herramienta de conversión online de su elección: 
```bash
pandoc biometric_audit.md -o biometric_audit.pdf
```
