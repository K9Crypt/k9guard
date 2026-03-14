![Banner](https://www.upload.ee/image/18782156/k9guard.png)

[English Documentation](../../README.md)

# K9Guard

TypeScript/JavaScript projeleri için kriptografik güvenlik sunan güvenli, hafif ve esnek bir CAPTCHA modülü.

## Özellikler

- **Kriptografik Güvenlik**: NIST SP 800-90A standardına uyumluluk sağlanmıştır
- **10 CAPTCHA Türü**: Matematik, metin, dizi, karıştırma, ters çevirme, karma, çok adımlı, görsel, emoji ve özel doğrulama yöntemleri
- **Güvenlik Odaklı**: SHA-256 tuzlu hash algoritması, sunucu taraflı challenge deposu, nonce tabanlı oturum yönetimi ve 5 dakikalık geçerlilik süresi
- **Tek Kullanımlık Challenge**: Her nonce, `validate()` çağrısında — doğru ya da yanlış fark etmeksizin — tüketilir; replay ve brute-force saldırıları engellenir
- **Katı Yapılandırma**: Geçersiz `type` veya `difficulty` değerleri anında hata fırlatır; sessiz fallback yoktur
- **Girdi Doğrulama**: Enjeksiyon saldırılarını önlemek için uzunluk sınırlamaları, katı sayısal ayrıştırma, tip kontrolü ve sanitizasyon
- **Özel Sorular**: Doğrulama ve sanitizasyon ile kendi sorularınızı tanımlama desteği
- **Sıfır Bağımlılık**: Harici bağımlılık gerektirmeyen hafif yapı
- **Kapsamlı Test Edilmiş**: Uç durumlar ve güvenlik senaryoları dahil olmak üzere geniş test kapsama alanı
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

## API Referansı

### Yapıcı Metod Seçenekleri

`type` ve `difficulty` alanları **zorunludur** ve katı şekilde doğrulanır. Geçersiz bir değer iletildiğinde constructor anında hata fırlatır.

#### Standart CAPTCHA Seçenekleri

```typescript
interface K9GuardOptions {
  type: 'math' | 'text' | 'sequence' | 'scramble' | 'reverse' | 'mixed' | 'multi' | 'image' | 'emoji';
  difficulty: 'easy' | 'medium' | 'hard';
}
```

#### Özel CAPTCHA Seçenekleri

```typescript
interface K9GuardCustomOptions {
  type: 'custom';
  questions: CustomQuestion[];
}

interface CustomQuestion {
  question: string; // 5-500 karakter arası
  answer: string; // 1-200 karakter arası
  difficulty: 'easy' | 'medium' | 'hard';
}
```

### Metotlar

#### `generate(): CaptchaChallenge`

İstemciye gönderilmesi güvenli bir **public** nesne döndürür — `answer`, `hashedAnswer` ve `salt` çıkarılarak `nonce` ile anahtarlanmış şekilde sunucu tarafında saklanır.

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

#### `validate(challenge: CaptchaChallenge, userInput: string): boolean`

Kullanıcı girdisini `challenge.nonce` üzerinden bulunan sunucu taraflı kayıtla karşılaştırır. Doğruysa `true`, yanlışsa `false` döndürür. Public challenge nesnesindeki `hashedAnswer` veya `salt` değiştirme girişimlerinin hiçbir etkisi yoktur.

> **⚠️ Tek kullanımlık semantik:** `validate()`, **ilk çağrıda** — cevap doğru ya da yanlış olsun fark etmeksizin — nonce'u tüketir. Her doğrulama denemesinden sonra challenge geçersiz hale gelir. Kullanıcıya yeni bir challenge sunmadan önce mutlaka `generate()` yeniden çağrılmalıdır.

```typescript
const isValid = captcha.validate(challenge, userAnswer);

// validate() çağrısından sonra challenge tüketilir.
// Yeniden deneme için yeni bir challenge üretilmeli:
if (!isValid) {
  const newChallenge = captcha.generate();
}
```

## Katkıda Bulunma

Katkılarınızı memnuniyetle karşılıyoruz! Nasıl yardımcı olabilirsiniz:

1. **Depoyu fork edin**
2. **Özellik dalı oluşturun**: `git checkout -b feature/harika-ozellik`
3. **Değişiklikleriniz için testler ekleyin**
4. **Testleri çalıştırın**: `bun run src/test.ts`
5. **Değişikliklerinizi commit edin**: `git commit -m 'feat: harika özellik eklendi'`
6. **Dalınıza push edin**: `git push origin feature/harika-ozellik`
7. **Pull Request oluşturun**

## Lisans

Bu proje MIT Lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasını inceleyebilirsiniz.
