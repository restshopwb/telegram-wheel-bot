import sqlite3
import json
from aiogram import Bot, Dispatcher, types
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from aiogram.filters import Command
from aiohttp import web
import os
import asyncio

BOT_TOKEN = "8315231126:AAGYr9S8npYwxnqC9AD61JLkApPNE-F0Vfw"
WEBAPP_URL = "https://asbestoid-overdaintily-tawny.ngrok-free.dev"


bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()


# DB
conn = sqlite3.connect("database.db")
cur = conn.cursor()


cur.execute("""
CREATE TABLE IF NOT EXISTS promo_codes (
    code TEXT PRIMARY KEY,
    used INTEGER DEFAULT 0
)
""")
conn.commit()


@dp.message(Command("wheel"))
async def wheel(message: Message):
    await message.answer(
        "🎡 Колесо фортуны",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(
                text="🎡 Открыть колесо",
                web_app=WebAppInfo(url=WEBAPP_URL)
            )
        ]])
    )


@dp.message(lambda m: m.web_app_data)
async def webapp_result(message: Message):
        data = json.loads(message.web_app_data.data)
        promo = data.get("promo")
        discount = data.get("discount")


        cur.execute("SELECT used FROM promo_codes WHERE code=?", (promo,))
        row = cur.fetchone()


        if not row:
            await message.answer("❌ Неверный промокод")
            return


        if row[0] == 1:
            await message.answer("⛔ Промокод уже использован")
            return


        cur.execute("UPDATE promo_codes SET used=1 WHERE code=?", (promo,))
        conn.commit()


        await message.answer(f"🎉 Ваша скидка {discount}% активирована")

async def check_promo(request):
    data = await request.json()
    promo = data.get("promo")

    cur.execute("SELECT used FROM promo_codes WHERE code=?", (promo,))
    row = cur.fetchone()

    if not row:
        return web.json_response({"ok": False, "reason": "not_found"})

    if row[0] == 1:
        return web.json_response({"ok": False, "reason": "used"})

    return web.json_response({"ok": True})

async def finish_spin(request):
    try:
        data = await request.json()
        promo = data.get("promo")
        discount = data.get("discount")

        print(">>> finish_spin CALLED")
        print("DATA:", promo, discount)

        if not promo or not discount:
            return web.json_response(
                {"ok": False, "error": "invalid data"},
                status=400
            )

        conn = sqlite3.connect("database.db")
        cur = conn.cursor()

        # проверяем, не использован ли промокод
        cur.execute(
            "SELECT used FROM promo_codes WHERE code = ?",
            (promo,)
        )
        row = cur.fetchone()

        if not row:
            conn.close()
            return web.json_response(
                {"ok": False, "error": "promo not found"},
                status=400
            )

        if row[0] == 1:
            conn.close()
            return web.json_response(
                {"ok": False, "error": "promo already used"},
                status=400
            )

        # обновляем промокод
        cur.execute(
            "UPDATE promo_codes SET used = 1, discount = ? WHERE code = ?",
            (discount, promo)
        )

        conn.commit()
        conn.close()

        print("DB UPDATED")

        return web.json_response({"ok": True})

    except Exception as e:
        print("❌ ERROR in finish_spin:", e)
        return web.json_response(
            {"ok": False, "error": "server error"},
            status=500
        )
    
async def start_api():
    app = web.Application()

    # API
    app.router.add_post("/check_promo", check_promo)

    # WebApp (HTML)
    web_dir = os.path.join(os.path.dirname(__file__), "..", "web")
    async def index(request):
        return web.FileResponse(os.path.join(web_dir, "index.html"))

    app.router.add_get("/", index)
    app.router.add_static("/static/", web_dir)
    app.router.add_post("/finish_spin", finish_spin)

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", 8080)
    await site.start()
    
async def main():
    await start_api()
    await dp.start_polling(bot)


if __name__ == '__main__':
    asyncio.run(main())
    
