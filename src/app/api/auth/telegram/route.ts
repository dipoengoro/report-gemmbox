import { NextResponse } from "next/server";
import { Client, Users } from "node-appwrite";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { telegramId } = body;

    if (!telegramId) {
      return NextResponse.json({ error: "Telegram ID tidak ditemukan" }, { status: 400 });
    }

    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT as string)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID as string)
      .setKey(process.env.APPWRITE_API_KEY as string);

    const users = new Users(client);
    const userId = `tg_${telegramId}`;

    try {
      // 1. Coba buat token masuk
      const token = await users.createToken(userId);
      return NextResponse.json({ secret: token.secret });
      
    } catch (appwriteError: any) {
      // 2. Jika tamu tidak terdaftar di database (Error 404)
      if (appwriteError.code === 404) {
        return NextResponse.json(
          { error: "Akun belum terdaftar. Silakan setup akun via bot Telegram Gemmbox terlebih dahulu." }, 
          { status: 401 } // 401 Unauthorized
        );
      }
      throw appwriteError; // Jika error lain, lemparkan ke bawah
    }
  } catch (error: any) {
    console.error("Auth Error:", error);
    return NextResponse.json({ error: "Gagal memproses autentikasi Appwrite" }, { status: 500 });
  }
}