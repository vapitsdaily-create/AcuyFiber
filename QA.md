# AcuyFiber — hasil pemeriksaan paket 1.0.0

Tanggal pemeriksaan: 17 September 2026.

## Pemeriksaan yang dijalankan

`npm run check`: **10 pengujian Node lulus**, berikut pemeriksaan sintaks JavaScript. Cakupan: identitas toko, konfigurasi, keunikan ID produk, kategori, format harga, keberadaan seluruh foto/thumbnail, referensi sorotan, sumber daya HTML, respons server, metode HTTP, serta penolakan path terlarang dan file pengembangan.

`python tests/browser_smoke.py --portable --screenshots`: **11 kelompok pemeriksaan browser lulus**. Cakupan:

- Identitas AcuyFiber dan empat vas pada tampilan katalog awal.
- Seluruh 14 produk serta kategori 4 vas, 3 dekorasi rumah, 3 patung taman, 4 trofi/suvenir.
- Pencarian “harimau”, hasil kosong, dan penutupan dialog menggunakan Escape.
- Detail produk, pemilihan jumlah, tambah keranjang, dan favorit.
- Fungsi sesi tetap dapat digunakan ketika penyimpanan berbasis origin tidak tersedia.
- Tambah/kurang jumlah di keranjang, formulir penawaran, referensi ACF, teks masukan yang ditampilkan sebagai teks biasa, serta edit ulang draf.
- Hapus barang, keranjang kosong, dan konsultasi tanpa produk.
- Filter nuansa, urutan nama, dan pergantian gambar sorotan.
- Tidak ditemukan luapan horizontal halaman pada lebar 360, 390, 768, 1024, dan 1440 piksel; menu HP dapat dibuka dan ditutup.
- Foto yang sedang ditampilkan berhasil dimuat.
- Tidak ditemukan galat JavaScript yang tidak tertangani selama skenario tersebut.

`npm run build` dan `npm run portable` dijalankan untuk memperbarui hasil dari source terakhir.

## Lingkungan dan batas pemeriksaan

Pemeriksaan Node dijalankan dengan Node.js 22.16.0. Pemeriksaan antarmuka menggunakan Chromium melalui Playwright, dengan HTML portabel dimuat dalam memori. Link font eksternal dihilangkan hanya pada salinan untuk pengujian offline; file proyek asli tidak diubah oleh pengujian tersebut.

Browser lingkungan pembuatan memblokir navigasi langsung ke localhost. Karena itu server HTTP diperiksa terpisah melalui pengujian Node, sedangkan interaksi dan visual diperiksa melalui HTML portabel. Persistensi `localStorage` lintas reload pada origin HTTP belum diuji dalam lingkungan ini. Jalur pemeriksaannya tersedia pada script browser tanpa opsi `--portable` untuk dijalankan di komputer pengembang.

Belum diuji pada perangkat fisik Android/iPhone, Safari, Firefox, hosting/domain publik, penerimaan pesan WhatsApp nyata, pengiriman email, pembayaran, atau layanan ongkir. Pengujian ini bukan audit keamanan menyeluruh atau sertifikasi aksesibilitas. Salin/unduh teks tersedia dalam kode, tetapi izin clipboard dan perilaku unduhan setiap browser belum diverifikasi menyeluruh.

## Status data dan layanan

Harga, nomor WhatsApp, dan email toko masih kosong. Tidak ada testimoni, alamat toko, nomor pelanggan, nominal harga, atau klaim pengiriman yang dibuat-buat. Nama/teks produk adalah usulan dan spesifikasi fisik perlu dikonfirmasi pemilik.

Tidak ada backend, database pesanan, akun pelanggan, panel admin, pembayaran otomatis, atau pengiriman formulir ke server. Draf penawaran bukan bukti pembayaran atau konfirmasi pesanan. Tidak ada deployment atau perubahan ke proyek ComePlayers.

## Pratinjau

Folder `preview/` berisi tangkapan layar dari website yang dijalankan, bukan hasil gambar mockup. Tampilan font dapat sedikit berbeda sesuai koneksi dan font yang tersedia pada perangkat.
