import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { user_id, telegram_id } = await req.json();

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // O'chirish
    const { error } = await supabase
      .from('test_results')
      .delete()
      .eq('user_id', user_id);

    if (error) {
      throw error;
    }

    // Bot orqali xabar yuborish
    if (telegram_id && process.env.TELEGRAM_BOT_TOKEN) {
      const text = "🔄 <b>Diqqat!</b>\n\nSizga yakuniy testni qayta topshirish uchun ruxsat berildi. Testni qaytadan boshlashingiz mumkin.";
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegram_id,
          text: text,
          parse_mode: 'HTML'
        })
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Test reset error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
