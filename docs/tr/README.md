![Banner](https://www.upload.ee/image/18782156/k9guard.png)

[English Documentation](../../README.md)

# K9Guard

TypeScript/JavaScript projeleri için kriptografik güvenlik sunan güvenli, hafif ve esnek bir CAPTCHA modülü.

## Özellikler

- **Kriptografik Güvenlik**: NIST SP 800-90A standardına uyumluluk sağlanmıştır
- **10 CAPTCHA Türü**: Matematik, metin, dizi, karıştırma, ters çevirme, karma, çok adımlı, görsel, emoji ve özel doğrulama yöntemleri
- **Adaptif Zorluk**: Kullanıcı başarı oranına göre zorluk seviyesini otomatik ayarlar
- **Güvenlik Odaklı**: SHA-256 tuzlu hash algoritması, sunucu taraflı challenge deposu, nonce tabanlı oturum yönetimi ve 5 dakikalık geçerlilik süresi
- **Tek Kullanımlık Challenge**: Her nonce, `validate()` çağrısında — doğru ya da yanlış fark etmeksizin — tüketilir; replay ve brute-force saldırıları engellenir
- **Katı Yapılandırma**: Geçersiz `type` veya `difficulty` değerleri anında hata fırlatır; sessiz fallback yoktur
- **Girdi Doğrulama**: Enjeksiyon saldırılarını önlemek için uzunluk sınırlamaları, katı sayısal ayrıştırma, tip kontrolü ve sanitizasyon
- **Özel Sorular**: Doğrulama ve sanitizasyon ile kendi sorularınızı tanımlama desteği
- **Sıfır Bağımlılık**: Harici bağımlılık gerektirmeyen hafif yapı
- **Kapsamlı Test Edilmiş**: 228+ test ile birim, entegrasyon, güvenlik, uç durum ve benchmark senaryoları
- **OWASP Uyumlu**: OWASP Top 10 güvenlik yönergelerine uygun geliştirme
- **Gizlilik Uyumlu**: Kişisel veri saklamayan GDPR/KVKK uyumlu mimari

## Kurulum

```bash
npm install k9guard
```

## Hızlı Başlangıç

```typescript
import K9Guard from "k9guard";

const captcha = new K9Guard({
  type: 'math',
  difficulty: 'medium'
});

// doğrulama sorusu oluştur
const challenge = captcha.generate();
console.log(challenge.question); // "15 + 7"

// kullanıcı yanıtını doğrula
const isValid = captcha.validate(challenge, "22");
if (isValid) {
  console.log("Erişim izni verildi!");
} else {
  console.log("Yanlış cevap!");
}
```

## Kullanım Örnekleri

### Matematik CAPTCHA

```typescript
const captcha = new K9Guard({ type: 'math', difficulty: 'easy' });
const challenge = captcha.generate();
// Çıktı: "5 + 3"
// Cevap: "8"
```

### Metin CAPTCHA

```typescript
const captcha = new K9Guard({ type: 'text', difficulty: 'medium' });
const challenge = captcha.generate();
// Çıktı: "aB2xY9"
// Cevap: "aB2xY9"
```

### Dizi CAPTCHA

```typescript
const captcha = new K9Guard({ type: 'sequence', difficulty: 'easy' });
const challenge = captcha.generate();
// Çıktı: "2, 4, 6, ?"
// Cevap: "8"
```

### Karıştırma CAPTCHA

```typescript
const captcha = new K9Guard({ type: 'scramble', difficulty: 'easy' });
const challenge = captcha.generate();
// Çıktı: "tac"
// Cevap: "cat"
```

### Ters Çevirme CAPTCHA

```typescript
const captcha = new K9Guard({ type: 'reverse', difficulty: 'easy' });
const challenge = captcha.generate();
// Çıktı: "god"
// Cevap: "dog"
```

### Görsel CAPTCHA

```typescript
const captcha = new K9Guard({ type: 'image', difficulty: 'medium' });
const challenge = captcha.generate();

// challenge.image — doğrudan <img> etiketinde kullanılabilecek base64 SVG data URI
// challenge.question — "Type the characters shown in the image"
console.log(challenge.image); // "data:image/svg+xml;base64,..."

// kullanıcı yanıtını doğrula (büyük/küçük harf duyarsız)
const isValid = captcha.validate(challenge, "aB3z");
if (isValid) {
  console.log("Erişim izni verildi!");
} else {
  console.log("Yanlış cevap!");
}
```

Görsel CAPTCHA'nın güvenlik özellikleri:
- **Karakter başına rotasyon ve offset** — rastgele renk ve boyutla OCR direnci
- **Sinüzoidal dalga katmanları** — zorluk seviyesine orantılı üst üste bindirilir
- **Gürültü çizgileri ve noktaları** — basit segmentasyon saldırılarını engeller
- **Büyük/küçük harf duyarsız doğrulama** — kullanıcı hem büyük hem küçük harf girebilir
- **Sıfır dış bağımlılık** — tamamen sunucu tarafında saf SVG ile üretilir

### Emoji CAPTCHA

```typescript
const captcha = new K9Guard({ type: 'emoji', difficulty: 'medium' });
const challenge = captcha.generate();

// challenge.emojis — gösterilecek emoji dizisi (medium için 6 adet)
// challenge.category — hedef kategori adı (örn. "animals")
// challenge.question — "Select all animals from the list (6 emojis, 3 correct)"
console.log(challenge.emojis);   // ["🐶", "🍎", "🚗", "🐱", "🌸", "🏀"]
console.log(challenge.category); // "animals"

// kullanıcı, doğru emojilerin sıfır tabanlı indekslerini virgülle ayırarak gönderir
// örn. emojis[0] ve emojis[3] hayvan ise: "0,3"
const isValid = captcha.validate(challenge, "0,3");
if (isValid) {
  console.log("Erişim izni verildi!");
} else {
  console.log("Yanlış cevap!");
}
```

Zorluk seviyesi gösterilen emoji sayısını ve doğru seçilmesi gereken emoji sayısını belirler:

| Zorluk  | Toplam emoji | Seçilmesi gereken |
|---------|-------------|-------------------|
| easy    | 4           | 2                 |
| medium  | 6           | 3                 |
| hard    | 8           | 4                 |

5 kategori mevcuttur (animals, food, vehicles, nature, sports), her birinde 20 emoji bulunur. Yanıltıcı emojiler diğer kategorilerden seçilir. Cevap formatı: sıralanmış, virgülle ayrılmış sıfır tabanlı indeksler; örn. `"0,2,4"`.

### Karma CAPTCHA

```typescript
const captcha = new K9Guard({ type: 'mixed', difficulty: 'medium' });
const challenge = captcha.generate();
// Yukarıdaki türlerden birini rastgele seçer
```

### Çok Adımlı CAPTCHA

```typescript
const captcha = new K9Guard({ type: 'multi', difficulty: 'easy' });
const challenge = captcha.generate();

if (challenge.steps) {
  // kullanıcı her iki adımı da çözmelidir; steps yalnızca question/nonce/expiry içerir
  // cevaplar JSON dizisi olarak gönderilir
  const userInput = JSON.stringify(["22", "typescript"]);
  const isValid = captcha.validate(challenge, userInput);
}
```

### Özel Sorular

```typescript
const captcha = new K9Guard({
  type: 'custom',
  questions: [
    { question: 'Türkiye\'nin başkenti neresidir?', answer: 'ankara', difficulty: 'easy' },
    { question: '2+2 işleminin sonucu nedir?', answer: '4', difficulty: 'easy' },
    { question: 'Gökyüzü ne renktir?', answer: 'mavi', difficulty: 'easy' }
  ]
});

const challenge = captcha.generate();
const isValid = captcha.validate(challenge, "ankara");
```

### Adaptif Zorluk

Adaptif zorluk, kullanıcının başarı oranına göre zorluk seviyesini otomatik olarak ayarlar. Bu sayede zorlanan kullanıcılara kolay, hızlı çözen kullanıcılara ise daha zor challenge'lar sunulur.

#### Nasıl Çalışır?

- Oturum başına son 10 denemeyi takip eder (kayan pencere)
- **%80+ başarı oranı** — zorluk artar (easy -> medium -> hard)
- **%40 ve altı başarı oranı** — zorluk düşer (hard -> medium -> easy)
- **%40-80 arası** — zorluk sabit kalır
- Herhangi bir ayarlama öncesinde minimum 3 deneme gerekli (histerezis)
- Oturumlar 30 dakika hareketsizlik sonra otomatik sona erer
- Maksimum 10.000 eş zamanlı oturum (en eski otomatik temizlenir)

#### Seçenek 1: Constructor'da Session ID

```typescript
const captcha = new K9Guard({
  type: 'math',
  difficulty: 'adaptive',
  sessionId: 'user-123'  // herhangi benzersiz string (kullanıcı ID, oturum token'ı, IP vb.)
});

const challenge = captcha.generate();  // user-123'ün mevcut zorluğunu kullanır
const isValid = captcha.validate(challenge, userAnswer);  // sonucu otomatik kaydeder
```

#### Seçenek 2: Parametre Olarak Session ID

```typescript
const captcha = new K9Guard({ type: 'math', difficulty: 'adaptive' });

// her çağrıda sessionId geçir
const challenge = captcha.generate('user-123');
const isValid = captcha.validate(challenge, userAnswer, 'user-123');
```

#### Seçenek 3: Esnek (Her İkisi)

Constructor'daki `sessionId` varsayılan olarak kullanılır. Parametre olarak verilen `sessionId` onu override eder.

```typescript
const captcha = new K9Guard({
  type: 'math',
  difficulty: 'adaptive',
  sessionId: 'varsayilan-kullanici'
});

captcha.generate();                // 'varsayilan-kullanici' kullanır
captcha.generate('diger-kullanici'); // 'diger-kullanici' kullanır (override)
```

#### Oturum Yönetimi

```typescript
// oturumun mevcut zorluğunu öğren
const difficulty = captcha.getSessionDifficulty('user-123'); // 'easy' | 'medium' | 'hard' | null

// belirli bir oturumu temizle (zorluk 'medium' olarak sıfırlanır)
captcha.clearSession('user-123');

// tüm oturumları temizle
captcha.clearAllSessions();
```

#### Tüm CAPTCHA Türleriyle Uyumlu

```typescript
// adaptif zorluk herhangi bir captcha türüyle çalışır
const captcha = new K9Guard({ type: 'image', difficulty: 'adaptive', sessionId: 'user-1' });
const captcha = new K9Guard({ type: 'emoji', difficulty: 'adaptive', sessionId: 'user-1' });
const captcha = new K9Guard({ type: 'reverse', difficulty: 'adaptive', sessionId: 'user-1' });
// ... ve diğerleri
```

#### Express.js Örneği

```typescript
import express from 'express';
import K9Guard from 'k9guard';

const app = express();
const captcha = new K9Guard({ type: 'math', difficulty: 'adaptive' });

app.get('/captcha', (req, res) => {
  const challenge = captcha.generate(req.sessionID);
  res.json(challenge);
});

app.post('/verify', (req, res) => {
  const isValid = captcha.validate(req.body.challenge, req.body.answer, req.sessionID);
  res.json({ valid: isValid });
});
```

## API Referansı

### Yapıcı Metod Seçenekleri

`type` ve `difficulty` alanları **zorunludur** ve katı şekilde doğrulanır. Geçersiz bir değer iletildiğinde constructor anında hata fırlatır.

#### Standart CAPTCHA Seçenekleri

```typescript
interface K9GuardOptions {
  type: 'math' | 'text' | 'sequence' | 'scramble' | 'reverse' | 'mixed' | 'multi' | 'image' | 'emoji';
  difficulty: 'easy' | 'medium' | 'hard' | 'adaptive';
  sessionId?: string;  // opsiyonel, difficulty 'adaptive' iken gerekli
}
```

#### Özel CAPTCHA Seçenekleri

```typescript
interface K9GuardCustomOptions {
  type: 'custom';
  questions: CustomQuestion[];
  sessionId?: string;
}

interface CustomQuestion {
  question: string; // 5-500 karakter arası
  answer: string; // 1-200 karakter arası
  difficulty: 'easy' | 'medium' | 'hard';
}
```

### Metotlar

#### `generate(sessionId?: string): CaptchaChallenge`

İstemciye gönderilmesi güvenli bir **public** nesne döndürür — `answer`, `hashedAnswer` ve `salt` çıkarılarak `nonce` ile anahtarlanmış şekilde sunucu tarafında saklanır.

`difficulty` `'adaptive'` olduğunda, `sessionId` parametresi kullanıcının mevcut zorluk seviyesini belirlemek için kullanılır. Constructor'da `sessionId` verilmişse varsayılan olarak kullanılır.

```typescript
const challenge = captcha.generate();
console.log(challenge.question);  // kullanıcıya gösterilecek soru
console.log(challenge.nonce);     // benzersiz oturum tanımlayıcısı (validate'e geri gönderilir)
console.log(challenge.expiry);    // Unix ms cinsinden geçerlilik bitiş zamanı
console.log(challenge.image);     // base64 SVG data URI (yalnızca type: 'image' için)
console.log(challenge.emojis);    // emoji dizisi (yalnızca type: 'emoji' için)
console.log(challenge.category);  // kategori adı (yalnızca type: 'emoji' için)
// challenge.answer / .hashedAnswer / .salt — MEVCUT DEĞİL; istemciye hiç gönderilmez
```

#### `validate(challenge: CaptchaChallenge, userInput: string, sessionId?: string): boolean`

Kullanıcı girdisini `challenge.nonce` üzerinden bulunan sunucu taraflı kayıtla karşılaştırır. Doğruysa `true`, yanlışsa `false` döndürür. Public challenge nesnesindeki `hashedAnswer` veya `salt` değiştirme girişimlerinin hiçbir etkisi yoktur.

`difficulty` `'adaptive'` olduğunda, doğrulama sonucu otomatik olarak oturuma kaydedilir ve zorluk buna göre ayarlanır.

> **⚠️ Tek kullanımlık semantik:** `validate()`, **ilk çağrıda** — cevap doğru ya da yanlış olsun fark etmeksizin — nonce'u tüketir. Her doğrulama denemesinden sonra challenge geçersiz hale gelir. Kullanıcıya yeni bir challenge sunmadan önce mutlaka `generate()` yeniden çağrılmalıdır.

```typescript
const isValid = captcha.validate(challenge, userAnswer);

// validate() çağrısından sonra challenge tüketilir.
// Yeniden deneme için yeni bir challenge üretilmeli:
if (!isValid) {
  const newChallenge = captcha.generate();
}
```

#### `getSessionDifficulty(sessionId: string): Difficulty | null`

Oturumun mevcut adaptif zorluk seviyesini döndürür. Instance adaptif modda değilse `null` döndürür.

```typescript
const difficulty = captcha.getSessionDifficulty('user-123');
// 'easy' | 'medium' | 'hard' | null
```

#### `clearSession(sessionId: string): boolean`

Belirli bir adaptif oturumu temizler. Oturum mevcutsa `true`, değilse `false` döndürür.

```typescript
captcha.clearSession('user-123');
```

#### `clearAllSessions(): void`

Tüm adaptif oturumları temizler.

```typescript
captcha.clearAllSessions();
```

### Dışa Aktarılan Yardımcılar

```typescript
import K9Guard, { AdaptiveTracker, CustomQuestionValidator, CustomQuestionGenerator } from 'k9guard';
```

| Export | Açıklama |
|--------|----------|
| `K9Guard` (varsayılan) | Ana CAPTCHA sınıfı |
| `AdaptiveTracker` | Bağımsız adaptif zorluk takipçisi (özel entegrasyonlar için) |
| `CustomQuestionValidator` | Özel soru dizilerini doğrula ve sanitize et |
| `CustomQuestionGenerator` | Özel soru havuzlarından üretim |

### Tip Exportları

```typescript
import type {
  K9GuardOptions,
  K9GuardCustomOptions,
  CaptchaChallenge,
  CustomQuestion,
  Difficulty,
  AdaptiveSession,
  AdaptiveAttempt,
  StoredChallenge,
  ImageCaptcha,
  MathCaptcha,
  TextCaptcha,
  SequenceCaptcha,
  ScrambleCaptcha,
  ReverseCaptcha,
  MixedCaptcha,
  CustomCaptcha,
  EmojiCaptcha,
} from 'k9guard';
```

## Testler

K9Guard, `bun:test` kullanarak 228+ test ile birim, entegrasyon, güvenlik, uç durum ve benchmark senaryolarını kapsar.

### Testleri Çalıştırma

```bash
# tüm testleri çalıştır
bun test

# izleme modunda çalıştır
bun run test:watch

# kapsam ile çalıştır
bun run test:coverage
```

### Test Kategorileri

| Kategori | Kapsam |
|----------|--------|
| **Birim** | Her modül bağımsız olarak doğru çıktılar ve uç durumlarla test edilir |
| **Entegrasyon** | Tüm 10 captcha türü + adaptif mod için tam generate-validate akışı |
| **Güvenlik** | Timing saldırısı direnci, nonce replay önleme, hash enjeksiyonu, girdi sanitizasyonu, SVG enjeksiyonu |
| **Uç Durumlar** | Sıfıra bölme, unicode karakterler, eş zamanlı üreteçler, geçersiz girdiler |
| **Benchmark** | Tüm captcha türleri için performans garantileri (generate < 5ms, validate < 5ms) |

## Katkıda Bulunma

Katkılarınızı memnuniyetle karşılıyoruz! Nasıl yardımcı olabilirsiniz:

1. **Depoyu fork edin**
2. **Özellik dalı oluşturun**: `git checkout -b feature/harika-ozellik`
3. **Değişiklikleriniz için testler ekleyin**
4. **Testleri çalıştırın**: `bun test`
5. **Değişikliklerinizi commit edin**: `git commit -m 'feat: harika özellik eklendi'`
6. **Dalınıza push edin**: `git push origin feature/harika-ozellik`
7. **Pull Request oluşturun**

## Lisans

Bu proje MIT Lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasını inceleyebilirsiniz.
