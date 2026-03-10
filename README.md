# Tarayıcı Uzantıları Koleksiyonu: Dijital Esenlik, Odak ve Erişilebilirlik

Bu depo, tarayıcı deneyiminizi daha sağlıklı, erişilebilir ve üretken hale getirmek için tasarlanmış çeşitli açık kaynaklı tarayıcı uzantılarını (Chrome/Chromium tabanlı) içerir.

## Uzantılar ve İşlevleri

Uzantılar, kullanım amaçlarına göre üç ana kategoriye ayrılmıştır:

### Odak ve Dijital Esenlik
Dikkat dağıtıcı unsurları azaltmak ve daha bilinçli bir internet kullanımı sağlamak için tasarlanmış uzantılar:
* **İG Odak:** Instagram'da dikkat dağıtıcı unsurları (ör. Reels, Keşfet) gizleyerek sadece amaca yönelik kullanımı teşvik eder.
* **YT Odak:** YouTube'da önerilen videoları, yorumları ve Shorts'ları gizleyerek odaklanmanızı sağlar.
* **SiteBlocker:** Dikkatinizi dağıtan web sitelerini belirlediğiniz süreler boyunca engeller.
* **Metric Mute:** Sosyal medyadaki beğeni, yorum ve takipçi sayılarını gizleyerek sosyal medya anksiyetesini azaltır.
* **Grayscale Oasis:** Göz yorgunluğunu ve ekran bağımlılığını azaltmak için web sayfalarını siyah-beyaz (gri tonlamalı) hale getirir.
* **Sovereign Scroll:** Sonsuz kaydırma (infinite scroll) bağımlılığını engeller ve bilinçli sayfa gezinmesi sağlar.
* **News Diet:** Gündem yorgunluğunu önlemek için haber sitelerindeki belirli anahtar kelimeleri veya aşırı tüketimi filtreler.
* **Anti-Clickbait:** Yanıltıcı (clickbait) başlıkları tespit eder ve gizler/uyarır.
* **Focus Breath:** Gün içinde nefes egzersizleri yapmanızı hatırlatarak rahatlamanıza yardımcı olur.

### Erişilebilirlik (Accessibility)
İnterneti herkes için daha okunabilir ve kullanılabilir kılan araçlar:
* **Dyslexia Beam:** Disleksi dostu yazı tipleri (OpenDyslexic) uygular ve metin aralıklarını iyileştirir.
* **Reading Mask:** Okuma güçlüğü çekenler veya dikkat eksikliği (DEHB) olanlar için ekranda sanal bir okuma cetveli/maskesi oluşturur.
* **Color Blind Helper:** Renk körlüğü yaşayan kullanıcılar için web sayfalarındaki renkleri ayırt edilebilir filtrelere dönüştürür.
* **Tremor Safe:** El titremesi (tremor) yaşayan kullanıcılar için tıklanabilir alanları büyütür ve yanlış tıklamaları önler.
* **Static World:** Epilepsi veya dikkat eksikliği olanlar için dikkat dağıtıcı animasyonları, GIF'leri ve otomatik oynatılan medyaları durdurur.
* **HCS (High Contrast Scheme):** Görme zorluğu çekenler için sayfaları yüksek kontrastlı temalara dönüştürür.
* **Visual Audio Alert:** İşitme engelli kullanıcılar için sesli bildirimleri görsel uyarılara çevirir.

### Üretkenlik, Gizlilik ve Araçlar
Sekme yönetimi, zaman yönetimi ve güvenlik çözümleri:
* **One Task Timer:** Aynı anda tek bir işe odaklanmanız için tasarlanmış minimalist bir Pomodoro/zamanlayıcı aracı.
* **Tab Sovereign:** Sekme kalabalığını önler ve açık sekmelerinizi daha iyi yönetmenizi sağlar.
* **Simple New Tab:** Dikkat dağıtmayan, temiz ve minimalist bir yeni sekme sayfası sunar.
* **Privacy Shield:** İnternette gezinirken izleyicileri (trackers) engeller ve gizliliğinizi korur.
* **Local Vault:** Notlarınızı veya hassas verilerinizi sadece yerel tarayıcı hafızasında güvenle saklar.
* **SSH Search:** Geliştiriciler için hızlı ve güvenli SSH sorguları/aramaları yapmayı sağlar.

## Kurulum (Geliştirici Modu)

Bu uzantılar şu anda geliştirilme aşamasındadır ve Chrome Web Mağazası'nda yayınlanmamış olabilir. Herhangi bir uzantıyı manuel olarak kurmak için şu adımları izleyin:

1. Tarayıcınızda (Chrome, Edge, Brave vb.) uzantılar sayfasına gidin: `chrome://extensions/`
2. Sağ üst köşedeki "Geliştirici modu" (Developer mode) seçeneğini aktifleştirin.
3. Sol üstte beliren "Paketlenmemiş öğe yükle" (Load unpacked) butonuna tıklayın.
4. Bilgisayarınıza indirdiğiniz bu depodan, kurmak istediğiniz uzantının klasörünü (örneğin `reading-mask`) seçin.
5. Uzantı tarayıcınıza yüklenecek ve kullanıma hazır olacaktır!

## Katkıda Bulunma

Bu proje açık kaynaklıdır! Yeni bir uzantı fikriniz varsa, mevcut uzantılarda hata bulduysanız veya kod katkısında bulunmak istiyorsanız:
1. Depoyu forklayın (Fork).
2. Yeni bir dal oluşturun (`git checkout -b ozellik/YeniUzantı`).
3. Değişikliklerinizi commit edin (`git commit -m 'Yeni uzantı eklendi'`).
4. Dalınızı gönderin (`git push origin ozellik/YeniUzantı`).
5. Bir Çekme İsteği (Pull Request) açın.

## Destek Ol

Eğer bu projeyi faydalı bulduysanız ve geliştirilmesine destek olmak isterseniz, bana bir kahve ısmarlayabilirsiniz:
[Buy Me a Coffee](https://buymeacoffee.com/cumakaradash)

## Lisans

Bu proje [MIT Lisansı](LICENSE) ile lisanslanmıştır. Detaylar için `LICENSE` dosyasına göz atabilirsiniz.
