import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { telegramId, fileUrl } = await req.json();

    // Pastikan kamu punya variabel ini di file .env VPS-mu!
    const botToken = process.env.TELEGRAM_BOT_TOKEN; 
    if (!botToken) throw new Error("Bot token tidak ditemukan di server");

    // Endpoint API resmi Telegram untuk mengirim dokumen
    const tgApiUrl = `https://api.telegram.org/bot${botToken}/sendDocument`;
    
    // Kita suruh Bot mengirim URL PDF tersebut ke ID-mu
    const response = await fetch(tgApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: telegramId,
        document: fileUrl, // Telegram akan otomatis mendownload dari link Appwrite
        caption: "📊 Laporan Keuanganmu sudah siap, Bos!",
      }),
    });

    const data = await response.json();
    if (!data.ok) throw new Error(data.description);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error kirim PDF via bot:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}