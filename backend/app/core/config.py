import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
DEFAULT_TIER = os.getenv("DEFAULT_TIER", "gen9ou")
SMOGON_STATS_TABLE = "smogon_stats"
# Origens autorizadas a chamar a API a partir do browser (CORS), separadas por vírgula.
# Ex.: ALLOWED_ORIGINS=https://smearglepedia.netlify.app,http://localhost:5173
ALLOWED_ORIGINS = [
    o.strip().rstrip("/")
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if o.strip()
]
# Tiers considerados para o selo "Smogon" da grade; tiers sem dados são ignorados.
SMOGON_BADGE_TIERS = [
    t.strip()
    for t in os.getenv(
        "SMOGON_BADGE_TIERS",
        "gen9ou,gen9ubers,gen9uu,gen9ru,gen9nu,gen9pu,gen9lc,gen9doublesou",
    ).split(",")
    if t.strip()
]

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar definidas no .env")

if not SUPABASE_JWT_SECRET:
    raise ValueError("SUPABASE_JWT_SECRET deve estar definida no .env")
