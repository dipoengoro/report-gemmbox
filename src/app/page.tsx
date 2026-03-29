"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Download, Settings2, Loader2, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { useTransactions } from "@/hooks/useTransactions";
import { ID } from "appwrite";
import { account, storage } from "@/lib/appwrite";
import { BarChart, DonutChart, Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from "@tremor/react";

export default function ReportPage() {
  const { isAuthenticated, isLoading: isAuthLoading, error: authError, user } = useTelegramAuth();
  const { data: transactions, isLoading: isDataLoading, error: dataError } = useTransactions();
  const [isFilterBulanIni, setIsFilterBulanIni] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      // @ts-ignore
      const html2pdf = (await import("html2pdf.js")).default;
      const element = document.getElementById("report-container");
      
      if (!element) throw new Error("Gagal memuat area laporan.");

      const fileName = `Laporan_Keuangan_${isFilterBulanIni ? 'Bulan_Ini' : 'Semua'}.pdf`;
      
      const opt: any = {
        margin:       10, 
        filename:     fileName,
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { scale: 2, useCORS: true, windowWidth: 1024 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' },
        pagebreak:    { mode: ['css', 'legacy'], before: ['.page-break-before'], avoid: ['tr'] }
      };

      const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob');
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      const uploadedFile = await storage.createFile("reports", ID.unique(), file);
      const fileUrl = storage.getFileDownload("reports", uploadedFile.$id).toString();

      const tgId = user?.$id ? user.$id.replace('tg_', '') : null;
      if (!tgId) throw new Error("ID Telegram tidak terdeteksi");

      const response = await fetch('/api/send-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: tgId, fileUrl: fileUrl })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      // @ts-ignore
      if (window?.Telegram?.WebApp) {
         // @ts-ignore
         window.Telegram.WebApp.showAlert("✅ Berhasil! Silakan cek obrolan chat dengan Bot untuk mengunduh PDF-nya.");
      } else {
         alert("✅ Berhasil dikirim ke Telegram!");
      }

    } catch (error) {
      console.error("Gagal mengirim PDF:", error);
      alert("Terjadi kesalahan saat mengekspor PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  if (isAuthLoading) return <main className="min-h-screen p-8 flex justify-center items-center"><Loader2 className="animate-spin text-primary" /></main>;
  if (authError && !isAuthenticated) return <main className="min-h-screen p-8 flex justify-center items-center">Akses Ditolak</main>;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const filteredTransactions = transactions?.filter((t) => {
    if (!isFilterBulanIni) return true; 
    const tDate = new Date(t.transaction_date);
    return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
  }) || [];

  const totalIncome = filteredTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = filteredTransactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

  const formatRupiah = (angka: number) => {
    const nominal = new Intl.NumberFormat("id-ID", { style: "decimal", maximumFractionDigits: 0 }).format(angka);
    return `Rp${nominal}`;
  };

  const chartDataMap: Record<string, any> = {};
  const reversedTransactions = [...filteredTransactions].reverse();

  reversedTransactions.forEach((t) => {
    const dateObj = new Date(t.transaction_date);
    const dateStr = dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    if (!chartDataMap[dateStr]) chartDataMap[dateStr] = { date: dateStr, Pemasukan: 0, Pengeluaran: 0 };
    if (t.type === "income") chartDataMap[dateStr].Pemasukan += t.amount;
    else if (t.type === "expense") chartDataMap[dateStr].Pengeluaran += t.amount;
  });
  const barChartData = Object.values(chartDataMap);

  const expenseByCategory: Record<string, number> = {};
  filteredTransactions.filter((t) => t.type === "expense").forEach((t) => {
      const items = (t as any).transaction_item_id || [];
      if (items.length > 0) {
        items.forEach((item: any) => {
          const categoryName = item.category_id?.name || "Lainnya";
          if (!expenseByCategory[categoryName]) expenseByCategory[categoryName] = 0;
          expenseByCategory[categoryName] += item.subtotal || 0; 
        });
      } else {
        const fallbackCategory = t.notes || "Lainnya"; 
        if (!expenseByCategory[fallbackCategory]) expenseByCategory[fallbackCategory] = 0;
        expenseByCategory[fallbackCategory] += t.amount;
      }
    });
  const donutChartData = Object.entries(expenseByCategory).map(([name, amount]) => ({ name, amount }));
  const monthName = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  return (
    <main className="min-h-screen overflow-x-auto bg-muted/10 p-4 md:p-8">
      {/* PERBAIKAN UTAMA LAYOUT WEBVIEW: 
        Kita bungkus SEMUANYA di dalam satu div berukuran 1024px.
        Di HP (mobile), mx-0 memastikan dia nempel di kiri layar tanpa memotong area kiri.
        Di Laptop (lg), lg:mx-auto baru memindahkannya ke tengah layar.
      */}
      <div className="w-[1024px] mx-0 lg:mx-auto origin-top-left">
        
        {/* Kontrol Atas */}
        <div className="flex items-center justify-between gap-4 mb-6 p-4 bg-background rounded-xl border shadow-sm">
          <div className="flex items-center gap-2">
            <Button 
              variant={isFilterBulanIni ? "default" : "outline"}
              className="flex gap-2 transition-all"
              onClick={() => setIsFilterBulanIni(!isFilterBulanIni)}
            >
              <Calendar className="h-4 w-4" />
              {isFilterBulanIni ? `Bulan Ini (${monthName})` : "Semua Waktu"}
            </Button>
            <Button variant="outline" className="flex gap-2">
              <Settings2 className="h-4 w-4" />
              Opsi Data
            </Button>
          </div>
          
          <Button className="flex gap-2 font-semibold" onClick={handleExportPDF} disabled={isExporting}>
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isExporting ? "Memproses PDF..." : "Ekspor PDF"}
          </Button>
        </div>

        {/* Laporan Container */}
        <div id="report-container" className={`bg-card text-card-foreground min-h-[1056px] ${isExporting ? 'p-0 shadow-none border-none' : 'p-10 shadow-xl border rounded-sm'}`}>
          
          {dataError && (
            <div className="mb-8 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">Gagal menarik data transaksi: {dataError.message}</p>
            </div>
          )}

          <div className="border-b pb-6 mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Laporan Arus Kas</h1>
              <p className="text-muted-foreground mt-2">
                Periode: {isFilterBulanIni ? `1 ${monthName} - Selesai` : "Semua Waktu"}
              </p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-primary">
                {user?.name || "Gemmbox AI"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Telegram ID: {user?.$id ? user.$id.replace('tg_', '') : "Memuat..."}
              </p>
            </div>
          </div>

          {isDataLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="grid gap-8">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 border rounded-xl bg-green-50/50 dark:bg-green-950/20 border-green-100 dark:border-green-900">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                    <TrendingUp className="h-5 w-5" />
                    <h3 className="font-semibold">Total Pemasukan</h3>
                  </div>
                  <p className="text-3xl font-bold text-green-700 dark:text-green-500">{formatRupiah(totalIncome)}</p>
                </div>

                <div className="p-6 border rounded-xl bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
                    <TrendingDown className="h-5 w-5" />
                    <h3 className="font-semibold">Total Pengeluaran</h3>
                  </div>
                  <p className="text-3xl font-bold text-red-700 dark:text-red-500">{formatRupiah(totalExpense)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-8 mt-4">
                 <div className="p-6 border rounded-xl flex flex-col justify-between">
                   <div>
                     <h3 className="text-lg font-semibold text-foreground">Arus Kas Harian</h3>
                     <p className="text-sm text-muted-foreground">Pemasukan vs Pengeluaran</p>
                   </div>
                   {barChartData.length > 0 ? (
                     <BarChart className="mt-6 h-48 w-full" data={barChartData} index="date" categories={["Pemasukan", "Pengeluaran"]} colors={["emerald", "red"]} valueFormatter={formatRupiah} yAxisWidth={110} showLegend={false} />
                   ) : (
                     <div className="mt-6 h-48 w-full flex items-center justify-center text-sm text-muted-foreground">Tidak ada data di periode ini</div>
                   )}
                 </div>

                 <div className="p-6 border rounded-xl flex flex-col justify-between">
                   <div>
                     <h3 className="text-lg font-semibold text-foreground">Rincian Pengeluaran</h3>
                     <p className="text-sm text-muted-foreground">Berdasarkan Kategori</p>
                   </div>
                   {donutChartData.length > 0 ? (
                     <DonutChart className="mt-6 h-48 w-full" data={donutChartData} category="amount" index="name" valueFormatter={formatRupiah} colors={["blue", "amber", "violet", "rose", "cyan", "emerald"]} />
                   ) : (
                     <div className="mt-6 h-48 w-full flex items-center justify-center text-sm text-muted-foreground">Belum ada pengeluaran</div>
                   )}
                 </div>
              </div>

              <div className={`page-break-before ${isExporting ? 'mt-0' : 'mt-6'}`}>
                <div className="border-b pb-4 mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Rincian Transaksi</h3>
                  <p className="text-sm text-muted-foreground">Riwayat lengkap aktivitas keuanganmu</p>
                </div>
                
                <div className="border border-muted rounded-xl p-4 bg-muted/10">
                  <Table> 
                    <TableHead>
                      <TableRow className="border-b border-muted bg-muted/50">
                        <TableHeaderCell className="text-muted-foreground font-semibold w-10 text-center">No</TableHeaderCell>
                        <TableHeaderCell className="text-muted-foreground font-semibold">Tanggal</TableHeaderCell>
                        <TableHeaderCell className="text-muted-foreground font-semibold">Kategori</TableHeaderCell>
                        <TableHeaderCell className="text-muted-foreground font-semibold">Dompet</TableHeaderCell>
                        <TableHeaderCell className="text-muted-foreground font-semibold">Catatan</TableHeaderCell>
                        <TableHeaderCell className="text-muted-foreground font-semibold text-center">Tipe</TableHeaderCell>
                        <TableHeaderCell className="text-muted-foreground font-semibold text-right">Nominal</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredTransactions.map((t, index) => {
                        const dateObj = new Date(t.transaction_date);
                        const dateStr = dateObj.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
                        const isIncome = t.type === "income";

                        const items = (t as any).transaction_items || (t as any).transaction_item_id || (t as any).items || [];
                        const categoriesList = items.map((item: any) => {
                          const cat = item.category_id || item.categories || item.category;
                          return cat?.name;
                        }).filter(Boolean); 
                        const uniqueCategories = Array.from(new Set(categoriesList));
                        const categoryStr = uniqueCategories.length > 0 ? uniqueCategories.join(", ") : (t.notes ? t.notes : "Tanpa Kategori");
                        
                        const walletObj = (t as any).wallets || (t as any).wallet_id || (t as any).wallet;
                        let walletName = "-";
                        if (typeof walletObj === 'string' && walletObj.startsWith('wallet_')) {
                           walletName = "Dompet Utama";
                        } else if (walletObj?.wallet_name) {
                           walletName = walletObj.wallet_name;
                        }

                        return (
                          <TableRow key={t.$id} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm text-muted-foreground text-center">{index + 1}</TableCell>
                            <TableCell className="text-sm whitespace-nowrap">{dateStr}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{categoryStr}</TableCell>
                            <TableCell className="text-sm font-medium">{walletName}</TableCell>
                            <TableCell>
                              <div className={`text-sm text-muted-foreground ${isExporting ? 'whitespace-normal' : 'max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap'}`} title={t.notes || "-"}>
                                {t.notes || "-"}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {/* PERBAIKAN UTAMA BADGE PDF:
                                Menggunakan inline-block dan leading-none memastikan html2canvas 
                                menghitung kotak background dengan sangat presisi. 
                              */}
                              <div className={`inline-block px-2 py-1 rounded-sm text-[11px] font-bold leading-none ${isIncome ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                {isIncome ? "Pemasukan" : "Pengeluaran"}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium text-sm whitespace-nowrap">
                              <span className={isIncome ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500"}>
                                {isIncome ? "+" : "-"} {formatRupiah(t.amount)}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  
                  {filteredTransactions.length === 0 && (
                    <div className="py-10 text-center text-muted-foreground text-sm">
                      Belum ada data transaksi untuk periode ini.
                    </div>
                  )}
                </div>
              </div>
              
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 mb-4 text-center">
          <span className="text-base text-foreground">Made with </span>
          <span className="text-base text-red-500">❤️</span>
          <span className="text-base text-foreground"> by </span>
          <a 
            href="https://amalindipo.id" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-base font-semibold text-primary hover:underline hover:text-primary/80 transition-all"
          >
            Dipoengoro
          </a>
        </div>

      </div>
    </main>
  );
}