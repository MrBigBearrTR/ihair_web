# iHair Web

iHair Web, Spring Boot tabanlı [iHair API](https://github.com/MrBigBearrTR/ihair) için React tek sayfa yönetim arayüzüdür. Veritabanı ve iş kuralları backend'dedir; bu proje rol tabanlı ekranları, aktif salon kapsamını, formları, listeleri ve kullanıcı geri bildirimlerini sağlar.

## Özellikler

- Salon, kullanıcı/salon ataması, çalışan, hizmet ve müşteri yönetimi
- Haftalık takvim ve sayfalı randevu listesi
- Randevu durumları: **Bekliyor**, **Onaylandı**, **Geldi**, **Tamamlandı**, **İptal**
- Salon mesaisi, tatil günleri ve gerekçeli mesai dışı randevu override akışı
- Açık/tamamlanmış satışlar, randevudan satışa aktarım, kampanya quote ve ödeme
- Kampanya yönetimi/doğrulama ve gelir raporu
- Global login logosu, salon logosu ve düşük opaklıklı salon watermark'ı
- JWT yenileme, salon bazlı query cache, sayfalama, responsive menü ve açık/koyu tema

Müşteri self-servis paneli yoktur. `CUSTOMER` backend domain rolüdür; mevcut yönetim arayüzünde ayrı bir kullanıcı deneyimi sunulmaz.

## Teknoloji

React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4, Radix UI, TanStack Query, React Router, Axios, Zustand, React Hook Form, Zod, Sonner ve next-themes.

## Hızlı başlangıç

Önce backend'i çalıştırın. Backend için önerilen geliştirme komutu:

```powershell
Set-Location C:\workspace\projects\ihair
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"
```

Frontend:

```powershell
Set-Location C:\workspace\projects\ihair_web
npm install
npm run dev
```

Panel genellikle `http://localhost:5173` adresinde açılır. Vite port doluysa terminalde başka bir port gösterir; terminalde yazan **Local** URL'yi kullanın.

Varsayılan API adresi `http://localhost:8080`'dir. İlk backend açılışında oluşan `admin / admin123` ile giriş yapılabilir. Mevcut frontend, kullanıcı adı `admin` olan hesabı her başarılı girişten sonra parola değiştirme ekranına yönlendirir; parola kaydedilince oturum temizlenir ve tekrar giriş istenir.

## Aynı ağdan erişim

`vite.config.ts` geliştirme sunucusunu `host: "0.0.0.0"` ile açar. `0.0.0.0` tarayıcıya yazılacak adres değil, tüm ağ arayüzlerinde dinleme ayarıdır.

Bilgisayarın LAN IPv4 adresini bulun:

```powershell
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown" } |
  Select-Object InterfaceAlias, IPAddress
```

Aynı Wi-Fi/LAN'daki cihazdan `http://<LAN_IP>:5173` adresini açın; örneğin `http://192.168.1.25:5173`. Vite'deki `/api` proxy'si istekleri frontend'i çalıştıran bilgisayardaki backend'e ilettiği için mobil cihazın ayrıca `localhost:8080`'e erişmesi gerekmez.

Gerekirse Windows Güvenlik Duvarı'nda özel ağ için Node/Vite'a izin verin. Backend başka bir bilgisayardaysa `.env` içindeki `VITE_API_PROXY_TARGET` değerini o bilgisayarın LAN URL'si yapın. Doğrudan cross-origin API adresi vermek yerine geliştirmede Vite proxy kullanmak CORS ihtiyacını önler.

## Ortam değişkenleri

Şablon dosya `.env.example` mevcuttur:

```powershell
Copy-Item .env.example .env
notepad .env
```

```properties
# Production'da API origin'i; sonunda / kullanmayın.
# Boşsa aynı origin altındaki /api yolları kullanılır.
VITE_API_BASE_URL=

# Yalnızca Vite geliştirme proxy hedefi.
VITE_API_PROXY_TARGET=http://localhost:8080
```

`VITE_API_BASE_URL` build sırasında gömülür. Frontend ve API aynı domainde reverse proxy ile yayınlanıyorsa boş bırakın ve sunucuda `/api` isteklerini backend'e yönlendirin. Ayrı origin kullanılıyorsa backend tarafında uygun CORS yapılandırması da gerekir.

## Roller ve aktif salon

| Sayfa/modül | ADMIN | SALON_OWNER | EMPLOYEE |
|---|:---:|:---:|:---:|
| Dashboard | ✓ | ✓ | ✓ |
| Salonlar ve kullanıcılar | ✓ |  |  |
| Çalışanlar ve hizmetler | ✓ | ✓ |  |
| Müşteriler ve randevular | ✓ | ✓ | ✓ |
| Satışlar | ✓ | ✓ | ✓ |
| Gelir raporu | ✓ | ✓ |  |
| Kampanya yönetimi | ✓ | ✓ |  |
| Kampanya doğrulama | ✓ | ✓ | ✓ |

Route guard ve menü görünürlüğü kullanıcı deneyimini düzenler; asıl yetki kontrolü backend'dedir.

Üst çubuktaki aktif salon tüm operasyon ekranlarının ortak kapsamıdır:

- Yetkili salonlar login/me yanıtından gelir.
- Seçim kullanıcı adına göre Zustand/localStorage içinde hatırlanır; kullanıcı artık yetkili değilse ilk geçerli salona düşer.
- Tek salonlu hesapta seçim sabittir; çok salonlu hesap salon değiştirebilir.
- `ADMIN`, **Tüm salonlar** seçerek listeleri toplu görebilir.
- Kayıt oluşturma ve salon bağımlı tekil işlemlerde somut salon gerekir; arayüz seçim yoksa işlemi engeller.
- Salon sahibi seçim göndermeden liste isterse backend yetkili salonlarının tümünü kapsayabilir; çalışan daima bağlı olduğu salon ve kendi randevularıyla sınırlandırılır.

Müşteri, çalışan, hizmet, kampanya, randevu ve satış seçimleri salon kapsamına göre sorgulanır. Arayüzdeki filtrelere güvenilmez; çapraz salon ilişkilerini backend servisleri ve PostgreSQL bütünlük kuralları reddeder.

## Randevu ve çalışma programı

Haftalık takvim `GET /api/appointments/week` kullanır; liste görünümü `GET /api/appointments/paged` ile 25'er kayıt getirir. Durum eşlemesi:

- `PENDING` → Bekliyor
- `CONFIRMED` → Onaylandı
- `ARRIVED` → Geldi
- `COMPLETED` → Tamamlandı
- `CANCELLED` → İptal

Aktif durumlar Bekliyor/Onaylandı/Geldi'dir ve aynı çalışanın hizmet süresiyle kesişen başka aktif randevusu `409 Conflict` üretir. Durum değişimi `PATCH /api/appointments/{id}/status`, iptal `DELETE /api/appointments/{id}` ile yapılır.

Salon detayındaki çalışma programı yedi günü, saat aralıklarını, zaman dilimini ve tatilleri yönetir. Backend bir randevuyu kapalı gün, tatil veya mesai dışında bulursa arayüz kullanıcıdan açık onay ve gerekçe alarak isteği `overrideOutsideWorkingHours`/`overrideReason` ile yeniden gönderebilir. Override bilgisi randevu detayında gösterilir.

## Satış, kampanya ve gelir

Satış çalışma alanında müşteri, hizmet, çalışan ve miktar seçilir. Fiyat önizlemesi `POST /api/sales/quote` ile backend'de hesaplanır; frontend kendi indirim kuralını kaynak gerçek olarak kullanmaz.

- Kampanya kodu salon, müşteri, tarih ve kullanım limiti açısından doğrulanır.
- Quote indirim ve satır dağılımını gösterir fakat kampanya kotasını tüketmez.
- Kampanya redemption kaydı ve `usedCount` artışı yalnızca satış tamamlanırken oluşur.
- Açık satış düzenlenebilir/iptal edilebilir; tamamlanan satış değiştirilemez.
- Ödeme yöntemi Nakit, Kart veya Havale/EFT'dir; mevcut akış tek ödeme alır.

**Randevudan satışa aktar** seçeneği Bekliyor/Onaylandı/Geldi randevuları getirir. Müşteri, hizmet, çalışan ve varsa kampanya satış taslağına taşınır; ek hizmet eklenebilir. Aynı randevu ikinci satışa bağlanamaz ve satış tamamlandığında randevu da Tamamlandı olur.

Gelir sayfası yalnızca `ADMIN` ve `SALON_OWNER` içindir. Tarih aralığı, salon ve isteğe bağlı çalışan filtresiyle tamamlanmış satışları gün, ay veya çalışan bazında gruplar; toplam gelir, satış/hizmet sayısı, ortalama satış ve ödeme yöntemi dağılımını gösterir.

## Marka görselleri

`ADMIN`, **Salonlar** sayfasından global uygulama logosunu; salon detayından salon logosunu yükler veya siler.

- Global logo public `/api/branding/logo` endpoint'inden gelir ve login ekranında gösterilir.
- Salon logosu aktif salonun menü/header kimliğinde ve sayfanın sağ altında düşük opaklıklı watermark olarak kullanılır.
- Logo yoksa uygulama ikonu veya salon baş harfi gösterilir.
- Yalnızca şeffaflık içeren PNG kabul edilir; en fazla 1 MB ve `4096x4096` piksel.

Frontend dosyayı yüklemeden önce tür, boyut, çözünürlük ve saydam piksel kontrolü yapar; backend aynı kuralları tekrar doğrular.

## Cache, sayfalama ve performans

TanStack Query varsayılan olarak bir kez retry yapar, pencere odağında otomatik refetch yapmaz ve veriyi 30 saniye taze kabul eder. Modül özel süreleri:

- Satış/randevu listesi: 15 saniye
- Detay: 30 saniye
- Haftalık randevu: 45 saniye
- Referans listeleri ve marka görselleri: 10 dakika

Query key'leri salon ve filtreleri içerir; mutation sonrasında ilgili liste/detay anahtarları invalidate edilir. Randevu ve satış sayfaları backend sayfalamasını `page=0`, `size=25` ile kullanır. Backend en fazla 100 kayıt kabul eder. Referans verileri daha uzun cache'lenerek form açılışlarındaki tekrar istekler azaltılır.

Axios access token'ı otomatik ekler. Bir istek `401` aldığında tek bir ortak refresh isteği çalıştırılır; başarılıysa özgün istek bir kez tekrarlanır, başarısızsa oturum temizlenip login'e dönülür.

## Production build

```powershell
Set-Location C:\workspace\projects\ihair_web
npm ci
npm run build
npm run preview
```

`npm run build`, TypeScript project build ve Vite build çalıştırır; çıktı `dist` klasöründedir. `npm run preview` yalnızca yerel çıktı kontrolüdür, production sunucusu değildir.

SPA yayınında bilinmeyen yolların `index.html`'e dönmesi gerekir. API aynı origin'deyse web sunucusunda `/api` → Spring Boot reverse proxy tanımlayın.

## Kontrol komutları

```powershell
npm run lint
npm run build
```

`package.json` içinde şu anda otomatik frontend test scripti veya test framework'ü yoktur; dolayısıyla `npm test` geçerli bir proje komutu değildir. Davranış değişikliklerinde en az lint/build ve kritik akışlar için tarayıcı smoke testi yapılmalıdır.

## Önemli frontend dosyaları

- `src/routes/AppRouter.tsx`: route ve rol guard'ları
- `src/stores/authStore.ts`: oturum, yetkili salonlar ve aktif salon
- `src/api/client.ts`: API base URL, Bearer token ve refresh
- `src/api/appointments.ts`, `src/api/sales.ts`, `src/api/reports.ts`: ana operasyon sözleşmeleri
- `src/lib/queryKeys.ts`: salon/filtre bazlı cache anahtarları ve süreleri
- `src/components/layout/AppLayout.tsx`: responsive yerleşim ve salon watermark'ı
- `src/components/branding/LogoManagerCard.tsx`: logo upload/silme

Backend iş kuralları, migration'lar ve ayrıntılı endpoint listesi için [iHair API README](https://github.com/MrBigBearrTR/ihair#readme) belgesine bakın.
