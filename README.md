# iHair Web

**iHair Web**, [iHair](https://github.com/MrBigBearrTR/ihair) kuaför yönetim backend’inin (Spring Boot REST API) üzerinde çalışan **tek sayfa (SPA) yönetim arayüzüdür**. Salon operasyonlarını tarayıcıdan yürütmek için tasarlanmıştır; kendi başına bir veritabanı veya iş mantığı içermez, tüm veri ve kurallar API üzerinden gelir.

## Ne işe yarar?

| İhtiyaç | Bu uygulama ile |
|--------|------------------|
| Salon, çalışan, hizmet tanımları | CRUD ekranları |
| Müşteri kaydı ve arama | Müşteri listesi + formlar |
| Randevu oluşturma / durum / iptal | Randevu modülü (çakışma 409 ile API’den gelir) |
| Kampanya ve indirim kodları | Kampanya yönetimi; çalışanlar için ayrıca **Kampanya doğrula** sayfası |
| Salon logosu, çalışma saati vb. | Yöneticiye açık salon detayında anahtar–değer ayarları |
| Yeni sistem kullanıcıları | Sadece **ADMIN**: kullanıcı listesi, salon sahibi için çoklu salon ve varsayılan salon ataması |
| Randevuda yeni müşteri | Randevu taslağı korunarak müşteri oluşturma ekranına geçiş ve otomatik seçim |

**Kapsam dışı:** Müşteri self-servis paneli yoktur; `CUSTOMER` rolü bu arayüzde ayrı bir deneyim olarak ele alınmamıştır (API tarafındaki yetkiler README’deki backend dokümantasyonuna göredir).

## Kim nasıl kullanmalı?

1. **Önce backend’i çalıştırın** (varsayılan API adresi: `http://localhost:8080`). API kapalıysa giriş ve listeler çalışmaz.
2. **Bu projede** `npm install` ardından `npm run dev` çalıştırın; panel genelde `http://localhost:5173` adresinde açılır.
3. Tarayıcıda panele gidin → **Giriş** ekranında API’de tanımlı kullanıcı adı ve şifre ile oturum açın.
4. Oturum açıldıktan sonra **sol menü**, hesabınızın rolüne göre otomatik filtrelenir; yetkiniz olmayan bir URL’ye giderseniz **Yetkisiz erişim** sayfasına yönlendirilirsiniz.
5. **Varsayılan admin** (`admin` / `admin123`) ile ilk girişte uygulama sizi **şifre değiştir** sayfasına yönlendirir; yeni şifreyi kaydettikten sonra oturum kapanır — tekrar giriş yapın.

### Aktif salon kapsamı

- Üst çubuktaki salon alanı tüm operasyon ekranlarının ortak kapsamıdır. Birden fazla salonu olan hesaplar burada salon değiştirebilir; tek salonlu hesaplarda salon salt okunur gösterilir.
- Seçim kullanıcı bazında tarayıcıda saklanır ve sonraki girişte yalnızca hâlâ yetkili salonlar arasındaysa geri yüklenir.
- **ADMIN**, üst çubuktan **Tüm salonlar** seçeneğiyle listeleri toplu görüntüleyebilir. Yeni çalışan, hizmet, müşteri, randevu veya kampanya oluşturmak için somut bir salon seçilmelidir.
- Salon sahibi ve çalışan istekleri aktif `salonId` ile gönderilir. Hesaba salon atanmamışsa salon bağımlı ekranlar işlemleri engelleyip açıklayıcı bir uyarı gösterir.
- Sol menüdeki **Salonlar** yönetim ekranı yalnızca ADMIN rolüne açıktır; üst çubuktaki seçim salon yönetimi değil, operasyonel şube kapsamıdır.

### Rol özeti (menü erişimi)

| Rol | Tipik kullanım |
|-----|----------------|
| **ADMIN** | Tüm modüller; salon listesi/ayarı ve kullanıcı yönetimi |
| **SALON_OWNER** | Kendi kapsamındaki çalışan, hizmet, müşteri, randevu ve kampanya işlemleri |
| **EMPLOYEE** | Müşteri ve randevu; kampanya **doğrulama** (liste/yönetim değil, doğrulama sayfası üzerinden) |

Ayrıntılı endpoint–rol eşlemesi için backend reposundaki `README.md` dosyasına bakın.

## Geliştirme ortamı (hızlı başlangıç)

```bash
git clone <bu-repo> && cd ihair_web
npm install
npm run dev
```

Geliştirmede tarayıcıdan giden istekler `/api/...` yoluna gider; Vite bunları **proxy** ile backend’e iletir (böylece tarayıcıda sık görülen CORS ayarı gerekmez). Proxy hedefi varsayılan olarak **`http://localhost:8080`**.

Backend örnek:

```bash
cd /path/to/ihair   # Spring Boot proesi
mvn spring-boot:run
```

## Ortam değişkenleri

Projede `.env` dosyası oluşturabilirsiniz (şablon: [`.env.example`](.env.example)).

| Değişken | Ne zaman | Açıklama |
|----------|----------|----------|
| `VITE_API_BASE_URL` | Özellikle **production build** | API’nin tam kök URL’si, örn. `https://api.siteniz.com`. Sonunda `/` koymayın. Boş bırakılırsa istekler, sitenin yayınlandığı origin ile aynı hosta gider (aynı domain altında `/api` reverse proxy kullanımı için uygundur). |
| `VITE_API_PROXY_TARGET` | Sadece **`npm run dev`** | Vite’nin `/api` trafiğini yönlendireceği adres; varsayılan `http://localhost:8080`. Backend farklı portta çalışıyorsa burayı güncelleyin. |

## Production derlemesi

```bash
npm run build
npm run preview   # isteğe bağlı: dist'i lokal önizleme
```

`dist` çıktısını statik dosya sunucusu veya CDN’e koyun. API farklı bir domaindeyse `VITE_API_BASE_URL` derleme anında set edilmelidir (ör. `VITE_API_BASE_URL=https://api.example.com npm run build`). Aksi halde tarayıcı, panel ile aynı origin’e istek atar; o zaman sunucu tarafında `/api` → backend reverse proxy kurmanız gerekir.

## NPM scriptleri

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Geliştirme sunucusu (HMR) |
| `npm run build` | TypeScript kontrolü + Vite production build |
| `npm run preview` | `dist` önizlemesi |
| `npm run lint` | ESLint |

## Sık karşılaşılan durumlar

- **Giriş olmuyor / ağ hatası:** Backend ayakta mı, port doğru mu (`VITE_API_PROXY_TARGET` veya production’da `VITE_API_BASE_URL`) kontrol edin.
- **401 / sürekli çıkış:** Refresh token süresi dolmuş veya şifre değişiminden sonra oturum temizlenmiş olabilir; tekrar giriş yapın.
- **Şifre değiştir 400:** Backend DTO alan adları farklıysa (ör. `oldPassword` / `newPassword`), [`src/api/auth.ts`](src/api/auth.ts) ve [`src/pages/ChangePasswordPage.tsx`](src/pages/ChangePasswordPage.tsx) içindeki gövdeyi backend ile eşleştirin.
- **Randevu oluşturulamıyor:** API **409** döndüyse aynı çalışan için aynı saatte başka randevu vardır; mesaj toast ile gösterilir.
- **Randevu durum güncellemesi:** Arayüz backend sözleşmesine uygun olarak `PATCH /api/appointments/{id}/status` çağrısını kullanır.
- **Kullanıcı yönetimi:** Liste `GET /api/users`, kayıt `POST /api/auth/register` üzerinden yapılır. Salon sahibi için `salonIds` ve `defaultSalonId` gönderilir; mevcut atamalar `PUT /api/users/{id}/salons` ile güncellenir. Geriye uyumluluk için varsayılan salon ayrıca `salonId` olarak gönderilir.
- **Kampanya kodu:** Oluştururken kod boş bırakılırsa backend çoğu kurulumda `IH-XXXXXXXX` formatında otomatik kod üretir.

## Teknik yığın (özet)

React 19, TypeScript, Vite 7, Tailwind CSS v4, Radix tabanlı UI bileşenleri, TanStack Query, React Router, Axios (JWT + refresh), Zustand (kalıcı oturum), React Hook Form + Zod, Sonner (bildirim), next-themes (açık/koyu tema).

---

Bu depo yalnızca **frontend** içerir; iş kuralları ve veri bütünlüğü [iHair API](https://github.com/MrBigBearrTR/ihair) ile tanımlıdır.
