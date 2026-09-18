# AcuyFiber
## Website vas bunga & dekorasi bernuansa alam

Paket source code lengkap **AcuyFiber**, siap dibuka dan diedit di **Visual Studio Code**. Tema hijau alami, krem hangat, foto produk lokal, tipografi editorial, dan tata letak responsif untuk desktop, tablet, dan HP.

**Ini website yang dapat dijalankan, bukan hanya gambar desain.** Menggunakan HTML, CSS, dan JavaScript tanpa framework dan tanpa dependensi npm. Foto produk dari unggahan Anda sudah disertakan dalam format WebP, beserta thumbnail.

### Status fungsional

Katalog, pencarian, filter, detail produk, favorit, keranjang, dan draf permintaan penawaran sudah dibuat. **Belum ada backend, panel admin, database pesanan, akun pelanggan, sinkronisasi stok, perhitungan ongkir, atau pembayaran otomatis.** Paket ini tidak mengubah repository ComePlayers dan tidak menerbitkan website ke internet.

Nama toko sudah **AcuyFiber**. Harga dan kontak toko dibiarkan kosong karena belum diberikan; tidak menggunakan harga atau nomor WhatsApp fiktif. Formulir menghasilkan ringkasan lokal sampai tujuan WhatsApp yang benar diisi.

---

## 1. Menjalankan di Visual Studio Code

1. Ekstrak ZIP terlebih dahulu. Buka folder **AcuyFiber**, yaitu folder yang berisi `index.html` dan `package.json`.
2. Di Visual Studio Code pilih **File → Open Folder**, lalu pilih folder tersebut. Alternatif: buka `AcuyFiber.code-workspace`.
3. Pilih **Terminal → New Terminal**, lalu jalankan:

```sh
npm run dev
```

Buka di browser:

```text
http://localhost:3000
```

Simpan perubahan source, lalu muat ulang halaman browser. Server ini tidak menyediakan hot reload. Untuk menghentikan server, tekan **Ctrl+C** di terminal.

**Prasyarat terminal:** Node.js 22 atau lebih baru. Paket ini tidak membutuhkan `npm install`, API key, atau database. Cek Node yang terpasang dengan `node --version`.

Jika terminal PowerShell menolak `npm.ps1` karena kebijakan eksekusi, gunakan salah satu perintah berikut tanpa mengubah kebijakan keamanan komputer:

```sh
npm.cmd run dev
```

atau:

```sh
node scripts/serve.mjs
```

Jika port 3000 sedang digunakan oleh proyek lain:

```sh
npm run dev -- --port 3001
```

Lalu buka alamat port 3001 yang dicetak di terminal. Server hanya mendengarkan antarmuka lokal komputer; tidak otomatis dapat dibuka dari HP melalui Wi-Fi.

### Cara langsung tanpa terminal

Buka **index.html** di browser setelah seluruh ZIP diekstrak. Semua foto dan script lokal tetap diperlukan di folder yang sama. Alternatif Windows dengan Node terpasang: klik dua kali **MULAI-WINDOWS.bat**.

**AcuyFiber.html** adalah versi satu-file yang semua foto, CSS, dan JavaScript-nya sudah digabung. File ini dapat dibuka langsung di browser dan tidak membutuhkan folder assets. Ini hasil bundel; lakukan pengeditan pada source terpisah, bukan pada HTML bundel.

Google Fonts digunakan secara opsional. Saat tidak ada internet, website menggunakan font sistem; seluruh foto dan fitur inti tetap lokal. Tidak ada berkas font dalam paket ini. Penyimpanan keranjang pada `file://` dapat dibatasi browser; gunakan server lokal untuk pengembangan yang lebih konsisten.

---

## 2. File yang perlu diedit

| Keperluan | File |
| --- | --- |
| Teks halaman, menu, bagian beranda, footer | `index.html` |
| Warna, ukuran, jarak, tipografi, desain HP | `styles.css` |
| Nama produk, foto, deskripsi, kategori, harga | `catalog-data.js` |
| Nama toko, nomor WhatsApp, email | `store-config.js` |
| Perilaku katalog, keranjang, favorit, formulir | `app.js` |
| Foto produk penuh & thumbnail | `assets/products/` |
| Ikon daun untuk tab browser | `assets/favicon.svg` |

Source JavaScript menggunakan penamaan dan komentar dalam bahasa Inggris; teks antarmuka pelanggan serta panduan ini dalam bahasa Indonesia.

### Mengisi WhatsApp dan email

Buka `store-config.js`:

```js
window.STORE_CONFIG = Object.freeze({
  name: 'AcuyFiber',
  tagline: 'Vas bunga & dekorasi alam untuk rumah yang lebih hangat.',
  whatsappNumber: '',
  contactEmail: '',
  locale: 'id-ID',
  currency: 'IDR',
  maxQuantity: 99,
  storageKey: 'acuyfiber-v1',
});
```

Isi `whatsappNumber` hanya dengan nomor milik toko yang benar, memakai format internasional. Untuk Indonesia, gunakan `62` diikuti nomor tanpa angka `0` pertama, tanpa tanda `+` atau spasi. Isi `contactEmail` dengan alamat email toko yang benar, atau biarkan kosong.

Setelah nomor valid diisi, link WhatsApp toko tampil di footer dan tombol **Lanjutkan ke WhatsApp** tampil setelah ringkasan penawaran dibuat. Tombol itu hanya membuka percakapan dengan teks siap pakai. Pelanggan tetap harus menekan **Kirim** sendiri. Tidak ada klaim bahwa pesan sudah terkirim atau pesanan telah diterima toko.

Tidak ada kredensial yang dibutuhkan. **Jangan menaruh API key, password, token pembayaran, atau kunci Supabase rahasia dalam JavaScript publik.**

### Memasukkan harga

Di `catalog-data.js`, setiap produk awalnya memiliki:

```js
price: null,
```

`null` berarti **belum ada harga**, bukan gratis. Ubah menjadi angka rupiah tanpa titik pemisah setelah harga ditetapkan. Contoh struktur pengisian saja, bukan harga sebenarnya:

```js
price: 250000,
```

Nilai itu akan dipakai pada katalog, detail, keranjang, pengurutan, dan ringkasan. Jika terdapat produk tanpa harga, website tidak menganggap totalnya sudah lengkap. Ongkir tidak dihitung otomatis.

### Mengedit atau menambah produk

Gunakan satu objek per produk. `id` harus unik, berupa huruf kecil, angka, dan tanda hubung. Kategori yang didukung: `vas`, `dekorasi`, `taman`, `trofi`. Nuansa yang didukung: `natural`, `minimalis`, `klasik`.

```js
{
  id: 'vas-contoh',
  name: 'Nama produk Anda',
  category: 'vas',
  subtitle: 'Deskripsi singkat produk',
  badge: '',
  price: null,
  image: 'assets/products/vas-contoh.webp',
  thumbnail: 'assets/products/vas-contoh-thumb.webp',
  alt: 'Deskripsi foto untuk aksesibilitas',
  description: 'Deskripsi berdasarkan detail produk sebenarnya.',
  note: 'Konfirmasi isi paket dan aksesori.',
  color: 'Warna produk',
  styles: ['natural'],
  featured: 15,
},
```

Jumlah produk kategori diperbarui otomatis. Menambah kategori kelima memerlukan pengubahan navigasi HTML serta pemetaan kategori di `app.js`. Tiga produk sorotan beranda memakai ID `vas-lilit-flora`, `vas-cahaya-bambu`, `vas-kelopak-antik`; jangan menghapus ID itu tanpa menyesuaikan fungsi `setHeroSlide()` dan HTML beranda.

**Data yang belum diverifikasi:** nama produk merupakan usulan, begitu juga teks editorial. Bahan, dimensi, berat, ketahanan cuaca, ketersediaan, kemampuan menampung air, dan jumlah per paket belum ditetapkan. Kata emas, perunggu, bambu, dan terakota dapat merujuk pada tampilan atau warna—bukan jaminan bahan. Foto dapat memuat aksesori yang belum tentu disertakan.

---

## 3. Fitur yang tersedia

- Beranda, sorotan produk, empat kategori, bagian inspirasi, cerita, tanya-jawab, dan kontak.
- Empat belas produk dari foto yang diberikan, dengan gambar besar dan thumbnail lokal.
- Pencarian (termasuk pintasan Ctrl+K), filter kategori/nuansa, serta pengurutan.
- Detail produk, favorit, tambah/kurang/hapus keranjang, dan pembatasan jumlah.
- Keranjang/favorit disimpan di browser yang sama apabila penyimpanan diizinkan; bukan database toko.
- Formulir konsultasi serta permintaan penawaran dengan validasi, salin ringkasan, dan unduh TXT.
- Link WhatsApp opsional setelah nomor toko disiapkan; tidak ada pengiriman otomatis.
- Navigasi HP, dialog keyboard/Escape, preferensi pengurangan animasi, dan kontrol hapus penyimpanan lokal.

Nama, nomor pelanggan, kota, dan catatan formulir tidak disimpan ke `localStorage` atau dikirim ke server oleh website ini. Data tersebut dapat ikut di dalam teks WhatsApp atau file TXT bila pelanggan memilih tindakan itu.

---

## 4. Pengujian dan build

Jalankan pemeriksaan JavaScript, integritas katalog, file lokal, dan server:

```sh
npm run check
```

Membuat ulang folder website siap unggah:

```sh
npm run build
```

Hasilnya berada di `dist/`. Folder ini dibuat ulang setiap build, jadi **jangan mengedit langsung file di dist/**. Untuk melihat hasil build secara lokal:

```sh
npm run preview
```

Buka `http://localhost:4173`.

Membuat ulang HTML satu-file setelah source diedit:

```sh
npm run portable
```

Hasil `AcuyFiber.html` ditimpa dengan versi terbaru. Build dan bundel terpisah; mengedit source tidak otomatis memperbarui kedua hasil tersebut.

Paket juga menyertakan pengujian browser opsional di `tests/browser_smoke.py`. Untuk menjalankannya, sediakan Python, Playwright, dan browser Chromium terlebih dahulu. Alat pengujian itu **tidak diperlukan** untuk menjalankan website.

---

## 5. Menerbitkan ke hosting

Paket **belum online**. Gunakan isi `dist/` untuk hosting statis. Pastikan `index.html` berada pada akar folder publik. `vercel.json` sudah disiapkan untuk `npm run build` dengan output `dist/`; konfigurasi tersebut belum dijalankan pada akun hosting Anda.

Gunakan proyek hosting terpisah untuk AcuyFiber agar tidak menimpa website ComePlayers. Jangan mengunggah seluruh folder pengembangan ke direktori publik; cukup isi `dist/`. Metadata Open Graph memakai path gambar relatif; setelah domain asli ditentukan, lengkapi URL publik absolut dan metadata berbagi yang sesuai domain toko.

Sebelum menerima pesanan nyata, isi nomor toko, email, harga, stok, ukuran, bahan, isi paket, metode pembayaran, ketentuan pengiriman dan pengembalian. Konfirmasikan hak penggunaan foto sebelum publikasi. Untuk pembayaran otomatis atau admin, integrasi backend masih perlu ditambahkan; pembayaran pelanggan tidak diproses oleh kode ini.

---

## Struktur paket

```text
AcuyFiber/
├── index.html
├── styles.css
├── app.js
├── catalog-data.js
├── store-config.js
├── assets/
│   ├── favicon.svg
│   └── products/
├── scripts/
│   ├── serve.mjs
│   ├── build.mjs
│   └── portable.mjs
├── tests/
│   ├── catalog.test.mjs
│   ├── server.test.mjs
│   └── browser_smoke.py
├── .vscode/
│   ├── settings.json
│   └── tasks.json
├── AcuyFiber.code-workspace
├── AcuyFiber.html
├── MULAI-WINDOWS.bat
├── package.json
├── vercel.json
├── dist/
├── preview/
├── QA.md
└── README.md
```
