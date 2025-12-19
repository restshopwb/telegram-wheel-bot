import sqlite3

conn = sqlite3.connect('database.db')
cur = conn.cursor()

codes = [
    "RSWHEEL1",
    "RSWHEEL2",
    "RSWHEEL3",
    "RSWHEEL4",
    "RSWHEEL5",
    "RSWHEEL6",
    "RSWHEEL7",
    "RSWHEEL8",
    "RSWHEEL9",
    "RSWHEEL10",
]

for code in codes:
    cur.execute(
        "INSERT OR IGNORE INTO promo_codes (code) VALUES (?)",
        (code,)
    )

conn.commit()
conn.close()

print("✅ 10 промокодов RSWHEEL добавлены")