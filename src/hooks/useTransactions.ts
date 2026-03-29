import { useQuery } from "@tanstack/react-query";
import { databases, account } from "@/lib/appwrite";
import { Query } from "appwrite";

// Definisikan struktur data yang baru setelah dijahit
export interface Transaction {
  $id: string; 
  notes: string;
  amount: number;
  type: "income" | "expense";
  transaction_date: string;
  user_id: string;
  wallet_id: any; // Akan berisi objek dompet utuh
  transaction_items: any[]; // Akan berisi daftar item belanja utuh
}

export function useTransactions() {
  return useQuery({
    queryKey: ["transactions"], 
    queryFn: async () => {
      const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
      const txCollectionId = process.env.NEXT_PUBLIC_APPWRITE_TRANSACTION_COLLECTION_ID;

      if (!databaseId || !txCollectionId) {
        throw new Error("Database ID atau Collection ID belum diatur di .env");
      }

      const currentUser = await account.get();

      // 1. SEDOT SEMUA TABEL SECARA PARALEL (PROMISE.ALL) AGAR SUPER CEPAT 🚀
      const [txRes, walletsRes, itemsRes, customCategoriesRes, systemCategoriesRes] = await Promise.all([
        // Tabel Induk (Transactions)
        databases.listDocuments(databaseId, txCollectionId, [
            Query.equal("user_id", currentUser.$id),
            Query.limit(5000),
            Query.orderDesc("transaction_date")
        ]),
        // Tabel Dompet
        databases.listDocuments(databaseId, "wallets", [
            Query.equal("user_id", currentUser.$id),
            Query.limit(5000)
        ]),
        // Tabel Item Transaksi
        databases.listDocuments(databaseId, "transaction_items", [
            Query.limit(5000)
        ]),
        // Tabel Kategori (BUATAN USER INI SAJA)
        databases.listDocuments(databaseId, "categories", [
            Query.equal("user_id", currentUser.$id),
            Query.limit(5000)
        ]),
        // Tabel Kategori (BAWAAN SISTEM / NULL)
        databases.listDocuments(databaseId, "categories", [
            Query.isNull("user_id"), 
            Query.limit(5000)
        ])
      ]);

      const transactions = txRes.documents;
      const wallets = walletsRes.documents;
      const items = itemsRes.documents;
      
      // GABUNGKAN KEDUA JENIS KATEGORI MENJADI SATU DAFTAR
      const categories = [...customCategoriesRes.documents, ...systemCategoriesRes.documents];

      // 2. BUAT KAMUS DATA (MAP) UNTUK PENCARIAN INSTAN O(1)
      const walletMap = new Map(wallets.map(w => [w.$id, w]));
      const categoryMap = new Map(categories.map(c => [c.$id, c]));

      // 3. KELOMPOKKAN ITEM BERDASARKAN TRANSAKSI
      const itemsByTx = new Map();
      items.forEach(item => {
          // Tangani kemungkinan Appwrite menyimpan relasi sebagai ID teks atau Objek
          const txId = typeof item.transaction_id === 'object' ? item.transaction_id?.$id : item.transaction_id;
          if (!txId) return; // Jika yatim piatu, lewati
          
          if (!itemsByTx.has(txId)) {
              itemsByTx.set(txId, []);
          }
          
          // JAHIT KATEGORI KE DALAM ITEM: Cari kategori di kamus, tempelkan
          const catId = typeof item.category_id === 'object' ? item.category_id?.$id : item.category_id;
          const fullCategory = categoryMap.get(catId) || null;
          
          itemsByTx.get(txId).push({
              ...item,
              category_id: fullCategory // Timpa teks ID dengan Objek Kategori yang asli!
          });
      });

      // 4. JAHIT SEMUANYA KE DALAM TRANSAKSI INDUK
      const stitchedTransactions = transactions.map(tx => {
          // Jahit Dompet
          const fullWallet = walletMap.get(tx.wallet_id) || null;
          
          // Masukkan Keranjang Item
          const txItems = itemsByTx.get(tx.$id) || [];

          return {
              ...tx,
              wallet_id: fullWallet,          // Teks "wallet_177..." berubah jadi objek berisi nama "Jenius"
              transaction_items: txItems      // Tiba-tiba transaksi punya keranjang belanja yang lengkap!
          };
      });

      // Kembalikan data yang sudah dijahit rapi ke halaman depan
      return stitchedTransactions as unknown as Transaction[];
    },
  });
}