// CONFIG GITHUB - GANTI DENGAN DATA LU!
const GITHUB_USERNAME = "seventen_tsansa";      // Ganti dengan username GitHub lu
const GITHUB_REPO = "keuangan";        // Ganti dengan nama repo
const GITHUB_TOKEN = "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";        // Ganti dengan token lu

let dataKas = {};
let kasAktif = 'kas_kelas';
let mingguAktif = 1;
let modalTerbuka = false;
let tampilTotal = false;

// Load data dari GitHub
async function loadDataFromGitHub() {
    try {
        console.log('🔄 Loading data dari GitHub...');
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/data.json`);
        
        if (!response.ok) throw new Error('Gagal load data');
        
        const fileData = await response.json();
        const content = JSON.parse(atob(fileData.content));
        dataKas = content;
        console.log('✅ Data loaded dari GitHub:', dataKas);
        
    } catch (error) {
        console.error('❌ Gagal load dari GitHub:', error);
        // Fallback ke localStorage
        const localData = JSON.parse(localStorage.getItem('data_kas'));
        if (localData) {
            dataKas = localData;
            console.log('✅ Data loaded dari localStorage');
        } else {
            console.log('❌ Tidak ada data backup');
        }
    }
}

// Save data ke GitHub
async function saveDataToGitHub() {
    try {
        console.log('💾 Saving data ke GitHub...');
        
        // Get current file SHA
        const getResponse = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/data.json`);
        const currentFile = await getResponse.json();
        
        // Update file
        const updateResponse = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/data.json`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Update kas - ${new Date().toLocaleString()}`,
                content: btoa(JSON.stringify(dataKas, null, 2)),
                sha: currentFile.sha
            })
        });
        
        if (updateResponse.ok) {
            console.log('✅ Data tersimpan di GitHub');
            localStorage.setItem('data_kas', JSON.stringify(dataKas));
        } else {
            throw new Error('Gagal update file');
        }
    } catch (error) {
        console.error('❌ Gagal save ke GitHub:', error);
        // Fallback ke localStorage
        localStorage.setItem('data_kas', JSON.stringify(dataKas));
        alert('⚠️ Gagal sync, data disimpan lokal.');
    }
}

// Initialize App
async function init() {
    await loadDataFromGitHub();
    updateTampilan();
    initMingguSelector();
    console.log('🚀 App initialized dengan data:', dataKas);
}

// ... (SISANYA FUNGSI SAMA KAYA YANG SEBELUMNYA)
// toggleBayar(), updateTampilan(), dll - PASTIKAN PAKE saveDataToGitHub()

// Generate daftar minggu dari 14 Juli 2025 sampai Juni 2026
function generateDaftarMinggu() {
    const mingguList = [];
    const startDate = new Date(2025, 6, 14);
    const endDate = new Date(2026, 5, 30);
    
    let currentDate = new Date(startDate);
    let weekNumber = 1;
    
    while (currentDate <= endDate) {
        const startOfWeek = new Date(currentDate);
        const endOfWeek = new Date(currentDate);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        
        mingguList.push({
            minggu: weekNumber,
            start: new Date(startOfWeek),
            end: new Date(endOfWeek),
            label: `Minggu ${weekNumber}: ${formatTanggal(startOfWeek)} - ${formatTanggal(endOfWeek)}`
        });
        
        currentDate.setDate(currentDate.getDate() + 7);
        weekNumber++;
    }
    
    return mingguList;
}

// Format tanggal untuk tampilan
function formatTanggal(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Get periode minggu aktif
function getPeriodeMinggu() {
    const mingguList = generateDaftarMinggu();
    const mingguAktifData = mingguList.find(m => m.minggu === mingguAktif);
    return mingguAktifData || mingguList[0];
}

// Initialize minggu selector
function initMingguSelector() {
    const select = document.getElementById('selectMinggu');
    const mingguList = generateDaftarMinggu();
    
    select.innerHTML = '';
    mingguList.forEach(minggu => {
        const option = document.createElement('option');
        option.value = minggu.minggu;
        option.textContent = minggu.label;
        option.selected = minggu.minggu === mingguAktif;
        select.appendChild(option);
    });
    
    updateInfoMinggu();
}

// Update info minggu
function updateInfoMinggu() {
    const periode = getPeriodeMinggu();
    document.getElementById('infoMinggu').textContent = periode.label;
    document.getElementById('infoPeriode').textContent = `Minggu ${periode.minggu}`;
    document.getElementById('periodeSiswa').textContent = `Minggu ${periode.minggu}`;
    document.getElementById('periodeTransaksi').textContent = `Minggu ${periode.minggu}`;
}

// Toggle antara tampil minggu ini vs total keseluruhan
function toggleView() {
    tampilTotal = !tampilTotal;
    const toggleBtn = document.getElementById('toggleView');
    const totalItem = document.getElementById('totalKeseluruhanItem');
    
    if (tampilTotal) {
        toggleBtn.textContent = '🔁 Tampil Minggu Ini';
        totalItem.style.display = 'block';
    } else {
        toggleBtn.textContent = '🔁 Tampil Total';
        totalItem.style.display = 'none';
    }
    
    updateSaldo();
}

// Update semua tampilan
function updateTampilan() {
    updateSaldo();
    tampilkanSiswa();
    tampilkanRiwayat();
    updateSelectKas();
    updateStats();
    updateInfoMinggu();
}

// Update saldo dan info
function updateSaldo() {
    const kas = dataKas[kasAktif];
    
    let transaksiYangDitampilkan;
    if (tampilTotal) {
        transaksiYangDitampilkan = kas.transaksi;
    } else {
        transaksiYangDitampilkan = kas.transaksi.filter(t => t.minggu === mingguAktif);
    }
    
    const totalMasuk = transaksiYangDitampilkan
        .filter(t => t.tipe === 'masuk')
        .reduce((sum, t) => sum + t.jumlah, 0);
    
    const totalKeluar = transaksiYangDitampilkan
        .filter(t => t.tipe === 'keluar')
        .reduce((sum, t) => sum + t.jumlah, 0);
    
    const saldo = totalMasuk - totalKeluar;
    
    document.getElementById('saldo').textContent = formatRupiah(saldo);
    document.getElementById('totalMasuk').textContent = formatRupiah(totalMasuk);
    document.getElementById('totalKeluar').textContent = formatRupiah(totalKeluar);
    document.getElementById('namaKas').textContent = kas.nama;
    document.getElementById('infoIuran').textContent = formatRupiah(kas.iuran);
    
    // Update total keseluruhan
    const totalSemuaMasuk = kas.transaksi.filter(t => t.tipe === 'masuk').reduce((sum, t) => sum + t.jumlah, 0);
    const totalSemuaKeluar = kas.transaksi.filter(t => t.tipe === 'keluar').reduce((sum, t) => sum + t.jumlah, 0);
    const totalKeseluruhan = totalSemuaMasuk - totalSemuaKeluar;
    document.getElementById('totalKeseluruhan').textContent = formatRupiah(totalKeseluruhan);
    
    document.getElementById('saldo').style.color = saldo >= 0 ? '#2ecc71' : '#e74c3c';
}

// Format Rupiah
function formatRupiah(angka) {
    if (!angka) return 'Rp 0';
    return 'Rp ' + Math.abs(angka).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Update stats siswa
function updateStats() {
    const kas = dataKas[kasAktif];
    const siswaMingguIni = kas.siswa.map(siswa => {
        const pembayaran = siswa.pembayaran || {};
        return {
            ...siswa,
            sudahBayar: pembayaran[mingguAktif] || false
        };
    });

    const totalSiswa = siswaMingguIni.length;
    const siswaLunas = siswaMingguIni.filter(s => s.sudahBayar).length;
    const siswaBelum = totalSiswa - siswaLunas;
    const targetIuran = totalSiswa * kas.iuran;
    
    document.getElementById('totalSiswa').textContent = totalSiswa;
    document.getElementById('siswaLunas').textContent = siswaLunas;
    document.getElementById('siswaBelum').textContent = siswaBelum;
    document.getElementById('targetIuran').textContent = formatRupiah(targetIuran);
    
    const transaksiMingguIni = kas.transaksi.filter(t => t.minggu === mingguAktif);
    document.getElementById('jumlahTransaksi').textContent = transaksiMingguIni.length + ' transaksi';
}

// Tampilkan daftar siswa
function tampilkanSiswa() {
    const container = document.getElementById('daftarSiswa');
    const kas = dataKas[kasAktif];
    const siswaMingguIni = kas.siswa.map(siswa => {
        const pembayaran = siswa.pembayaran || {};
        return {
            ...siswa,
            sudahBayar: pembayaran[mingguAktif] || false
        };
    });
    
    container.innerHTML = '';
    
    if (siswaMingguIni.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #666;">
                <p>Belum ada siswa.</p>
            </div>
        `;
        return;
    }
    
    siswaMingguIni.forEach(siswa => {
        const div = document.createElement('div');
        div.className = `siswa-item ${siswa.sudahBayar ? 'lunas' : ''}`;
        div.innerHTML = `
            <input type="checkbox" ${siswa.sudahBayar ? 'checked' : ''} 
                   onchange="toggleBayar(${siswa.id})" class="siswa-checkbox">
            <div class="siswa-info">
                <div class="siswa-nama">${siswa.nama}</div>
                <div class="siswa-status ${siswa.sudahBayar ? 'siswa-lunas' : 'siswa-belum'}">
                    ${siswa.sudahBayar ? '✅ Lunas' : '❌ Belum bayar'}
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

// Toggle status bayar dengan auto add/remove uang
function toggleBayar(idSiswa) {
    const kas = dataKas[kasAktif];
    const siswa = kas.siswa.find(s => s.id === idSiswa);
    
    if (siswa) {
        if (!siswa.pembayaran) {
            siswa.pembayaran = {};
        }
        
        const statusSekarang = siswa.pembayaran[mingguAktif] || false;
        const statusBaru = !statusSekarang;
        
        // Jika sebelumnya sudah bayar (sekarang diuncheck)
        if (statusSekarang) {
            // HAPUS transaksi iuran siswa ini untuk minggu ini
            kas.transaksi = kas.transaksi.filter(t => 
                !(t.keterangan.includes(siswa.nama) && 
                  t.minggu === mingguAktif && 
                  t.tipe === 'masuk' &&
                  t.jumlah === kas.iuran)
            );
        } 
        // Jika sebelumnya belum bayar (sekarang dicentang)
        else {
            // BUAT transaksi iuran baru
            const transaksiBaru = {
                id: Date.now(),
                tipe: 'masuk',
                jumlah: kas.iuran,
                keterangan: `Iuran dari ${siswa.nama} - Minggu ${mingguAktif}`,
                tanggal: new Date().toLocaleDateString('id-ID'),
                waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                minggu: mingguAktif
            };
            
            kas.transaksi.unshift(transaksiBaru);
        }
        
        // Update status pembayaran
        siswa.pembayaran[mingguAktif] = statusBaru;
        
        saveDataToGitHub();
        updateStats();
        tampilkanSiswa();
        updateSaldo();
        tampilkanRiwayat();
    }
}

// Tampilkan riwayat transaksi
function tampilkanRiwayat() {
    const container = document.getElementById('daftarTransaksi');
    const kas = dataKas[kasAktif];
    const transaksiMingguIni = kas.transaksi.filter(t => t.minggu === mingguAktif);
    
    container.innerHTML = '';
    
    if (transaksiMingguIni.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #666;">
                <p>Belum ada transaksi untuk minggu ini.</p>
            </div>
        `;
        return;
    }
    
    transaksiMingguIni.forEach(item => {
        const div = document.createElement('div');
        div.className = `transaksi-item ${item.tipe}`;
        div.innerHTML = `
            <div class="transaksi-info">
                <div class="transaksi-keterangan">${item.keterangan}</div>
                <div class="transaksi-tanggal">${item.tanggal} ${item.waktu}</div>
            </div>
            <div class="transaksi-jumlah">
                ${item.tipe === 'masuk' ? '+' : '-'} ${formatRupiah(item.jumlah)}
            </div>
        `;
        container.appendChild(div);
    });
}

// Ganti minggu aktif
function gantiMinggu() {
    mingguAktif = parseInt(document.getElementById('selectMinggu').value);
    updateTampilan();
}

// Modal functions
function tambahTransaksi(tipe) {
    document.getElementById('modalTransaksi').style.display = 'block';
    document.getElementById('modalTitle').textContent = 
        tipe === 'masuk' ? 'Tambah Pemasukan' : 'Tambah Pengeluaran';
    document.getElementById('modalTransaksi').dataset.tipe = tipe;
    
    document.getElementById('jumlah').value = '';
    document.getElementById('keterangan').value = '';
    modalTerbuka = true;
}

function kelolaIuran() {
    document.getElementById('modalIuran').style.display = 'block';
    document.getElementById('jumlahIuran').value = dataKas[kasAktif].iuran || '';
    modalTerbuka = true;
}

function tambahSiswa() {
    document.getElementById('modalSiswa').style.display = 'block';
    document.getElementById('namaSiswa').value = '';
    modalTerbuka = true;
}

function tambahKasBaru() {
    document.getElementById('modalKas').style.display = 'block';
    document.getElementById('namaKasBaru').value = '';
    modalTerbuka = true;
}

function tutupModal() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
    modalTerbuka = false;
}

// Simpan functions
async function simpanTransaksi() {
    const jumlah = parseInt(document.getElementById('jumlah').value);
    const keterangan = document.getElementById('keterangan').value.trim();
    const tipe = document.getElementById('modalTransaksi').dataset.tipe;

    if (!jumlah || jumlah <= 0) {
        alert('Masukkan jumlah yang valid!');
        return;
    }

    if (!keterangan) {
        alert('Masukkan keterangan!');
        return;
    }

    const kas = dataKas[kasAktif];
    const transaksiBaru = {
        id: Date.now(),
        tipe: tipe,
        jumlah: jumlah,
        keterangan: keterangan,
        tanggal: new Date().toLocaleDateString('id-ID'),
        waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        minggu: mingguAktif
    };

    kas.transaksi.unshift(transaksiBaru);
    await saveDataToGitHub();
    
    updateSaldo();
    tampilkanRiwayat();
    updateStats();
    tutupModal();
    
    alert('Transaksi berhasil disimpan!');
}

async function simpanIuran() {
    const jumlah = parseInt(document.getElementById('jumlahIuran').value);
    if (jumlah && jumlah > 0) {
        dataKas[kasAktif].iuran = jumlah;
        await saveDataToGitHub();
        updateSaldo();
        updateStats();
        tutupModal();
        alert(`Iuran berhasil diset: ${formatRupiah(jumlah)} per siswa per minggu`);
    } else {
        alert('Masukkan jumlah iuran yang valid!');
    }
}

async function simpanSiswa() {
    const nama = document.getElementById('namaSiswa').value.trim();
    if (nama) {
        const kas = dataKas[kasAktif];
        const idBaru = kas.siswa.length > 0 ? Math.max(...kas.siswa.map(s => s.id)) + 1 : 1;
        
        kas.siswa.push({
            id: idBaru,
            nama: nama,
            pembayaran: {}
        });
        
        await saveDataToGitHub();
        tampilkanSiswa();
        updateStats();
        tutupModal();
        alert('Siswa berhasil ditambahkan!');
    } else {
        alert('Masukkan nama siswa!');
    }
}

async function simpanKasBaru() {
    const nama = document.getElementById('namaKasBaru').value.trim();
    if (nama) {
        const key = nama.toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, '');
        dataKas[key] = {
            nama: nama,
            transaksi: [],
            siswa: dataKas.kas_kelas.siswa.map(s => ({...s, pembayaran: {}})),
            iuran: 2000
        };
        
        await saveDataToGitHub();
        kasAktif = key;
        updateTampilan();
        tutupModal();
        alert('Kas berhasil ditambahkan!');
    } else {
        alert('Masukkan nama kas!');
    }
}

// Ganti kas aktif
function gantiKas() {
    kasAktif = document.getElementById('selectKas').value;
    mingguAktif = 1;
    updateTampilan();
}

// Update pilihan kas di dropdown
function updateSelectKas() {
    const select = document.getElementById('selectKas');
    select.innerHTML = '';
    
    Object.keys(dataKas).forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = dataKas[key].nama;
        option.selected = key === kasAktif;
        select.appendChild(option);
    });
}

// Export data
function exportData() {
    const kas = dataKas[kasAktif];
    const periode = getPeriodeMinggu();
    
    if (kas.transaksi.length === 0 && kas.siswa.length === 0) {
        alert('Belum ada data untuk di-export!');
        return;
    }

    let csv = `LAPORAN KAS - ${kas.nama}\n`;
    csv += `PERIODE: ${periode.label}\n\n`;
    
    const transaksiMingguIni = kas.transaksi.filter(t => t.minggu === mingguAktif);
    csv += 'RIWAYAT TRANSAKSI MINGGU INI\n';
    csv += 'Tanggal,Waktu,Tipe,Keterangan,Jumlah\n';
    transaksiMingguIni.forEach(item => {
        csv += `"${item.tanggal}","${item.waktu}","${item.tipe}","${item.keterangan}",${item.jumlah}\n`;
    });
    
    csv += '\nDATA SISWA MINGGU INI\n';
    csv += 'Nama,Status,Iuran\n';
    kas.siswa.forEach(siswa => {
        const pembayaran = siswa.pembayaran || {};
        const status = pembayaran[mingguAktif] ? 'Lunas' : 'Belum Bayar';
        const iuran = pembayaran[mingguAktif] ? kas.iuran : 0;
        csv += `"${siswa.nama}","${status}",${iuran}\n`;
    });
    
    const totalMasuk = transaksiMingguIni.filter(t => t.tipe === 'masuk').reduce((sum, t) => sum + t.jumlah, 0);
    const totalKeluar = transaksiMingguIni.filter(t => t.tipe === 'keluar').reduce((sum, t) => sum + t.jumlah, 0);
    const saldo = totalMasuk - totalKeluar;
    const siswaLunas = kas.siswa.filter(s => (s.pembayaran || {})[mingguAktif]).length;
    const targetIuran = kas.siswa.length * kas.iuran;
    const realisasiIuran = siswaLunas * kas.iuran;
    
    csv += '\nSUMMARY MINGGU INI\n';
    csv += `Total Pemasukan,${totalMasuk}\n`;
    csv += `Total Pengeluaran,${totalKeluar}\n`;
    csv += `Saldo Akhir,${saldo}\n`;
    csv

