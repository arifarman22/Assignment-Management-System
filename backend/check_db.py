from app.database import engine
from sqlalchemy import text
with engine.connect() as c:
    print("Users:      ", c.execute(text("SELECT COUNT(*) FROM users")).scalar())
    print("Classes:    ", c.execute(text("SELECT COUNT(*) FROM classes")).scalar())
    print("Assignments:", c.execute(text("SELECT COUNT(*) FROM assignments")).scalar())
    print("Neon connection OK")
