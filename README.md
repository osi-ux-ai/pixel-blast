# Pixel Blast

Mobil için dikey yönde oynanan, renk eşleşmeli bir uzay savunma oyunu.

## Temel Mekanik
- Altta mavi, kırmızı, sarı ve yeşil olmak üzere dört rayda dört gemi bulunur.
- Üstten aynı renk raylarda düşmanlar iner; geminin bulunduğu raya dokunmak o renkte mermi ateşler.
- Düşmanların canı 1–5 aralığındadır; üzerlerinde can değeri yazar.
- Mermi stoğu, vurulan her düşmanla artar; mermi biterse veya bir düşman gemiye ulaşırsa oyun kaybedilir.

### Kontrol ve tempo
- Dokunma/klavye girdisi ilgili rayı ateşler; doğru renkli rayı seçmek kombo akışını hızlandırır.
- Arka arkaya isabetler kısa bir kombo penceresi içinde yapılırsa skor çarpanı artar, kaçırıldığında sıfırlanır.
- Kombo sayesinde skor, mermi ekonomisi ve “game feel” dengesi daha tatmin edici olur.

## Sonsuz Dalga ve Zorluk Eğrisi
- Dalga sistemi sonsuzdur; belirli skor eşiklerinde zorluk artar.
- Zorluk faktörleri:
  - Düşman hızının kademeli yükselmesi.
  - Düşman can aralığının genişlemesi (örn. 1–5'ten başlayıp üst sınırın artması).
  - Spawn frekansının artması ve çoklu düşmanların aynı anda belirip raylar arasında dağıtılması.
  - Mermi kazancının ilerleyen eşiklerde kısmen azalması.
- Zorluk artışı, oyuncuyu “mermi tasarrufu” ve “kombo koruma” arasında karar vermeye iter; hızlı ama yanlış atışlar mermiyi boşa harcar.
- Her zorluk eşiği için parametre örneği (fikir vermesi için):
  - **Skor 0–500:** Hız 1.0×, can 1–5, spawn aralığı 1.2–1.6 sn, mermi kazancı +1.
  - **Skor 500–1500:** Hız 1.2×, can 2–6, spawn aralığı 1.0–1.4 sn, mermi kazancı +1.
  - **Skor 1500–3000:** Hız 1.4×, can 3–7, spawn aralığı 0.8–1.2 sn, mermi kazancı +1 (zaman zaman +0).
  - **Skor 3000+:** Hız 1.6×+, can 4–8+, spawn aralığı 0.6–1.0 sn, mermi kazancı ağırlıklı +0; ara sıra mini-boss (yüksek can, yavaş).

### Skora bağlı zorluk fonksiyonu
Örnek psödo yaklaşım:
```
tier = score // 500               # 0, 1, 2, ...
speed = 1.0 + tier * 0.2          # 1.0, 1.2, 1.4, ...
hp_min = 1 + min(tier, 2)         # tabanı yavaş artır
hp_max = 5 + tier                 # tavanı hızlı artır
spawn_interval = clamp(1.6 - 0.2 * tier, 0.5, 1.6)
ammo_gain = (tier < 3) ? 1 : 0    # ileri oyunda kazancı kıstır
```
- “tier” eşikleri farklı mobil cihazlarda test edilerek hız/okunabilirlik dengesi ayarlanmalı.

## Kaybetme Koşulları
- Mermi stoğunun sıfıra düşmesi.
- Herhangi bir düşmanın gemi hizasına ulaşması.

## Geliştirme Notları
- Dalga yöneticisi skor değişimini dinleyerek parametrik zorluk geçişleri uygulamalı.
- Parametreler JSON/ScriptableObject ile ayarlanabilir olursa iterasyon kolaylaşır.
- Ray renk kontrastını ve dokunmatik geri bildirimi (efekt/ses/titreşim) erken eklemek oynanabilirliği artırır.
- “Telegraphing”: Zor veya hızlı düşmanlar ekranda belirirken kısa bir ışık/ses uyarısı göstererek oyuncunun reaksiyon süresine fırsat ver.
- Performans: Spawn ve mermi üretiminde obje havuzlama (object pooling) kullan; düşük cihazlarda GC çöp üretimini azaltır.

## Başlangıç prototipi
`index.html` üzerinde çalışan, dokunmatik veya klavye ile oynanabilen basit bir prototip eklendi. Özellikler:
- Başlangıç menüsü: oyun adı ve kısa açıklamalar yalnızca menüde gösterilir, oynarken HUD sade kalır.
- 4 renkli ray ve altta hizalanmış gemiler.
- Skora bağlı zorluk: hız çarpanı, can aralığı, spawn süresi ve mermi kazancı dinamik olarak değişir.
- Mermi tüketimi ve kazanımı: her atış mermi harcar, öldürülen düşman zorluk seviyesine göre mermi bırakabilir.
- Kaybetme koşulları birebir uygulanır: mermi bitmesi veya düşmanın zemine ulaşması.
- Oyun başlatma kısayolu: menüdeyken `Enter` veya `Space` tuşuna basarak hızlıca oyunu başlatıp `A/S/D/F` ile ateş etmeye geçebilirsiniz.

### Çalıştırma
Yerel bir HTTP sunucusuyla açabilirsiniz:
```
python -m http.server 8000
```
Sonrasında tarayıcıdan `http://localhost:8000` adresine gidin. Mobilde test ederken tam ekran ve dokunmatik butonları kullanın.
