![Banner](https://www.upload.ee/image/18782156/k9guard.png)

[English Documentation](../../README.md)

# K9Guard

TypeScript/JavaScript projeleri için kriptografik güvenlik ve çok dilli destek sunan güvenli, hafif ve esnek bir CAPTCHA modülü.

## Özellikler

- **Kriptografik Güvenlik**: NIST SP 800-90A standardına uyumluluk sağlanmıştır
- **Çok Dilli Destek**: Bulmaca ve mantık soruları için İngilizce ve Türkçe dil desteği mevcuttur
- **9 CAPTCHA Türü**: Matematik, metin, bulmaca, dizi, karıştırma, mantık, ters çevirme, karma ve çok adımlı doğrulama yöntemleri
- **Güvenlik Odaklı**: SHA-256 tuzlu hash algoritması, nonce tabanlı oturum yönetimi ve 5 dakikalık geçerlilik süresi
- **Girdi Doğrulama**: Enjeksiyon saldırılarını önlemek için uzunluk sınırlamaları, tip kontrolü ve sanitizasyon
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
  difficulty: 'medium',
  locale: 'tr'
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

### Bulmaca CAPTCHA

```typescript
const captcha = new K9Guard({ type: 'riddle', difficulty: 'easy', locale: 'tr' });
const challenge = captcha.generate();
// Çıktı: "Tuşları vardır ama kilit açamaz. Nedir?"
// Cevap: "piyano"
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
// Çıktı: "iked"
// Cevap: "kedi"
```

### Mantık CAPTCHA

```typescript
const captcha = new K9Guard({ type: 'logic', difficulty: 'easy', locale: 'tr' });
const challenge = captcha.generate();
// Çıktı: "Su kuru bir maddedir. Doğru mu Yanlış mı?"
// Cevap: "yanlış"
```

### Ters Çevirme CAPTCHA

```typescript
const captcha = new K9Guard({ type: 'reverse', difficulty: 'easy' });
const challenge = captcha.generate();
// Çıktı: "köpek"
// Cevap: "kepök"
```

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
  // kullanıcı her iki adımı da çözmelidir
  const answers = challenge.steps.map(step => step.answer.toString());
  const userInput = JSON.stringify(answers);
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

#### Standart CAPTCHA Seçenekleri

```typescript
interface K9GuardOptions {
  type: 'math' | 'text' | 'riddle' | 'sequence' | 'scramble' | 'logic' | 'reverse' | 'mixed' | 'multi';
  difficulty: 'easy' | 'medium' | 'hard';
  locale?: 'en' | 'tr'; // varsayılan: 'en'
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

Benzersiz nonce, geçerlilik süresi ve hash'lenmiş cevap içeren yeni bir CAPTCHA doğrulaması oluşturur.

```typescript
const challenge = captcha.generate();
console.log(challenge.question); // kullanıcıya gösterilecek soru
console.log(challenge.nonce); // benzersiz oturum tanımlayıcısı
console.log(challenge.expiry); // doğrulamanın geçerlilik süresi sona erme zamanı
```

#### `validate(challenge: CaptchaChallenge, userInput: string): boolean`

Kullanıcı girdisini doğrulama ile karşılaştırır. Doğruysa `true`, yanlışsa `false` değeri döndürür.

```typescript
const isValid = captcha.validate(challenge, userAnswer);
```

## Test Etme

Dahil edilen test paketini çalıştırın:

```bash
bun run src/test.ts
```

Testler şunları içerir:
- Tüm CAPTCHA türleri için doğru/yanlış/uç durum girdileri
- Özel soru doğrulama senaryoları
- Dil değiştirme işlemleri
- Çok adımlı doğrulamalar
- Girdi sanitizasyonu
- Güvenlik doğrulamaları

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
