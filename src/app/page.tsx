"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Download, Settings2, Loader2, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { useTransactions } from "@/hooks/useTransactions";
import { account } from "@/lib/appwrite";
import { BarChart, DonutChart, Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell, Badge } from "@tremor/react";

export default function ReportPage() {
  const { isAuthenticated, isLoading: isAuthLoading, error: authError } = useTelegramAuth();
  const { data: transactions, isLoading: isDataLoading, error: dataError } = useTransactions();
  const [isFilterBulanIni, setIsFilterBulanIni] = useState(false);

  const [userData, setUserData] = useState<any>(null);
  useEffect(() => {
    account.get().then(setUserData).catch(console.error);
  }, []);

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
    <main className="min-h-screen p-8 overflow-x-auto bg-muted/10 print:bg-white print:p-0">
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: landscape; margin: 15mm; } 
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
          .print-avoid-break { break-inside: avoid; page-break-inside: avoid; }
          .recharts-wrapper, .recharts-surface { overflow: visible !important; }
        }
      `}} />

      <div className="w-[1024px] mx-auto flex items-center justify-between gap-4 mb-6 p-4 bg-background rounded-xl border shadow-sm print:hidden">
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
        <Button className="flex gap-2 font-semibold" onClick={() => window.print()}>
          <Download className="h-4 w-4" />
          Ekspor PDF
        </Button>
      </div>

      <div className="w-[1024px] mx-auto bg-card text-card-foreground p-10 shadow-xl border rounded-sm min-h-[1056px] print:shadow-none print:border-none print:m-0 print:max-w-none">
        
        {dataError && (
          <div className="mb-8 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive flex items-center gap-2 print:hidden">
            <AlertCircle className="h-5 w-5" />
            <p className="font-medium">Gagal menarik data transaksi: {dataError.message}</p>
          </div>
        )}

        <div className="border-b pb-6 mb-8 flex justify-between items-end print-avoid-break">
          <div>
            <h1 className="text-3xl font-bold tracking-tight print:text-2xl">Laporan Arus Kas</h1>
            <p className="text-muted-foreground mt-2">
              Periode: {isFilterBulanIni ? `1 ${monthName} - Selesai` : "Semua Waktu"}
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-primary print:text-lg">
              {userData?.name || "Gemmbox AI"}
            </h2>
            <p className="text-sm text-muted-foreground print:text-xs">
              Telegram ID: {userData?.$id ? userData.$id.replace('tg_', '') : "Memuat..."}
            </p>
          </div>
        </div>

        {isDataLoading ? (
          <div className="flex justify-center py-10 print:hidden"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid gap-8 print:gap-8">
            
            <div className="grid grid-cols-2 gap-4 print-avoid-break">
              <div className="p-6 border rounded-xl bg-green-50/50 dark:bg-green-950/20 border-green-100 dark:border-green-900">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                  <TrendingUp className="h-5 w-5" />
                  <h3 className="font-semibold">Total Pemasukan</h3>
                </div>
                <p className="text-3xl font-bold text-green-700 dark:text-green-500 print:text-2xl">{formatRupiah(totalIncome)}</p>
              </div>

              <div className="p-6 border rounded-xl bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
                  <TrendingDown className="h-5 w-5" />
                  <h3 className="font-semibold">Total Pengeluaran</h3>
                </div>
                <p className="text-3xl font-bold text-red-700 dark:text-red-500 print:text-2xl">{formatRupiah(totalExpense)}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-8 print-avoid-break mt-4">
               <div className="p-6 border rounded-xl flex flex-col justify-between">
                 <div>
                   <h3 className="text-lg font-semibold text-foreground print:text-base">Arus Kas Harian</h3>
                   <p className="text-sm text-muted-foreground print:text-xs">Pemasukan vs Pengeluaran</p>
                 </div>
                 {barChartData.length > 0 ? (
                   <BarChart className="mt-6 h-48 w-full print:h-44" data={barChartData} index="date" categories={["Pemasukan", "Pengeluaran"]} colors={["emerald", "red"]} valueFormatter={formatRupiah} yAxisWidth={110} showLegend={false} />
                 ) : (
                   <div className="mt-6 h-48 w-full flex items-center justify-center text-sm text-muted-foreground">Tidak ada data di periode ini</div>
                 )}
               </div>

               <div className="p-6 border rounded-xl flex flex-col justify-between">
                 <div>
                   <h3 className="text-lg font-semibold text-foreground print:text-base">Rincian Pengeluaran</h3>
                   <p className="text-sm text-muted-foreground print:text-xs">Berdasarkan Kategori</p>
                 </div>
                 {donutChartData.length > 0 ? (
                   <DonutChart className="mt-6 h-48 w-full print:h-44" data={donutChartData} category="amount" index="name" valueFormatter={formatRupiah} colors={["blue", "amber", "violet", "rose", "cyan", "emerald"]} />
                 ) : (
                   <div className="mt-6 h-48 w-full flex items-center justify-center text-sm text-muted-foreground">Belum ada pengeluaran</div>
                 )}
               </div>
            </div>

            <div className="mt-6 print-avoid-break">
              <div className="border-b pb-4 mb-4">
                <h3 className="text-lg font-semibold text-foreground print:text-base">Rincian Transaksi</h3>
                <p className="text-sm text-muted-foreground print:text-xs">Riwayat lengkap aktivitas keuanganmu</p>
              </div>
              
              <div className="border border-muted rounded-xl p-4 bg-muted/10">
                <Table className="print:text-[11px]"> 
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
                      
                      const categoryStr = uniqueCategories.length > 0 
                        ? uniqueCategories.join(", ") 
                        : (t.notes ? t.notes : "Tanpa Kategori");
                      
                      const walletObj = (t as any).wallets || (t as any).wallet_id || (t as any).wallet;
                      let walletName = "-";
                      
                      if (typeof walletObj === 'string' && walletObj.startsWith('wallet_')) {
                         walletName = "Dompet Utama";
                      } else if (walletObj?.wallet_name) {
                         walletName = walletObj.wallet_name;
                      }

                      return (
                        <TableRow key={t.$id} className="hover:bg-muted/30 transition-colors print-avoid-break">
                          <TableCell className="text-sm print:text-[11px] text-muted-foreground text-center print:py-2">{index + 1}</TableCell>
                          <TableCell className="text-sm print:text-[11px] whitespace-normal min-w-[120px] print:min-w-0 print:py-2">{dateStr}</TableCell>
                          <TableCell className="text-sm print:text-[11px] text-muted-foreground whitespace-normal min-w-[120px] print:min-w-0 print:py-2">{categoryStr}</TableCell>
                          <TableCell className="text-sm print:text-[11px] font-medium whitespace-normal print:py-2">{walletName}</TableCell>
                          <TableCell className="print:py-2">
                            <div className="text-sm print:text-[11px] text-muted-foreground max-w-[160px] print:max-w-[200px] overflow-hidden text-ellipsis print:whitespace-normal whitespace-nowrap" title={t.notes || "-"}>{t.notes || "-"}</div>
                          </TableCell>
                          <TableCell className="text-center print:py-2">
                            <Badge color={isIncome ? "emerald" : "red"} size="sm" className="print:text-[9px] print:px-1">{isIncome ? "Pemasukan" : "Pengeluaran"}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-sm print:text-[11px] whitespace-nowrap print:py-2">
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
                    <div className="py-10 text-center text-muted-foreground text-sm print:hidden">
                    Belum ada data transaksi untuk periode ini.
                  </div>
                )}
              </div>
            </div>
            
          </div>
        )}
      </div>

      {/* FOOTER - PERBAIKAN DI SINI */}
      {/* 1. Menghapus 'flex items-center gap-1' karena bikin aneh di mobile peramban.
         2. Menambahkan 'text-center' agar konten teks didalam 1024px ini rata tengah.
      */}
      <div className="w-[1024px] mx-auto mt-8 mb-4 text-sm text-center text-muted-foreground print:mt-4 print:text-xs">
        Made with{" "}
        <span className="text-red-500 animate-pulse print:animate-none">
          ❤️
        </span>{" "}
        by{" "}
        <a 
          href="https://amalindipo.id" 
          target="_blank" 
          rel="noopener noreferrer"
          className="font-semibold text-primary hover:underline hover:text-primary/80 transition-all print:text-black print:no-underline"
        >
          Dipoengoro
        </a>
      </div>
    </main>
  );
}