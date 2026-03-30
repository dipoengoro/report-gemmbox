import { useState, useEffect } from "react";
import { account } from "@/lib/appwrite";

export function useTelegramAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null); // BARU: Kita simpan data profil di sini

  useEffect(() => {
    async function authenticateUser() {
      try {
        setIsLoading(true);

        // 1. TENTUKAN TARGET ID TELEGRAM (Dari Telegram WebApp atau Lokal)
        // @ts-ignore
        let telegramId = window?.Telegram?.WebApp?.initDataUnsafe?.user?.id;

        if (!telegramId && process.env.NODE_ENV !== "development") {
          // Ganti angka di bawah ini jika kamu ingin berpindah-pindah akun saat testing!
          telegramId = "6553201566"; 
        }

        if (!telegramId) {
          throw new Error("Harap buka aplikasi ini melalui Telegram.");
        }

        const targetUserId = `tg_${telegramId}`;

        // 2. CEK SESI SAAT INI (Apakah ada kue sesi yang tertinggal?)
        let currentSessionUser = null;
        try {
          currentSessionUser = await account.get();
        } catch (err) {
          // Abaikan, berarti memang belum login sama sekali
        }

        // 3. LOGIKA CERDAS: BANDINGKAN SESI DENGAN TARGET
        if (currentSessionUser) {
          if (currentSessionUser.$id === targetUserId) {
            // Sesi cocok! Langsung masuk tanpa perlu minta token lagi.
            setUser(currentSessionUser);
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
          } else {
            // Sesi nyangkut di akun orang lain! Kita bersihkan paksa.
            console.log("Mendeteksi pergantian akun. Membersihkan sesi lama...");
            await account.deleteSession("current");
          }
        }

        // 4. PROSES LOGIN BARU
        console.log(`Memulai proses login untuk ${targetUserId}...`);
        const response = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telegramId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Gagal mendapatkan token");
        }

        // 5. BUAT SESI BARU & AMBIL PROFIL
        await account.createSession(targetUserId, data.secret);
        const newUserProfile = await account.get();
        
        setUser(newUserProfile);
        setIsAuthenticated(true);
      } catch (err: any) {
        if (err.message && err.message.includes("Creation of a session is prohibited")) {
          // Jaring pengaman darurat Appwrite
          try {
            const fallbackUser = await account.get();
            setUser(fallbackUser);
            setIsAuthenticated(true);
          } catch (e) {
            setError("Gagal memuat profil cadangan.");
          }
        } else {
          setError(err.message || "Terjadi kesalahan saat autentikasi.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    authenticateUser();
  }, []);

  // BARU: Sekarang hook ini ikut mengembalikan data 'user'
  return { isAuthenticated, isLoading, error, user }; 
}