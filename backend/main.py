from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.api import proveedores, trabajos, auth, suministros, respaldos

Base.metadata.create_all(bind=engine)


def _migrar_suministros():
    from sqlalchemy import text
    nuevas = {
        "precio_bs": "FLOAT",
        "tasa_cambio": "FLOAT",
        "tipo_documento": "VARCHAR(30)",
        "documento_otro": "VARCHAR(150)",
        "iva_bs": "FLOAT",
        "monto_total_bs": "FLOAT",
    }
    with engine.begin() as con:
        cols = [r[1] for r in con.execute(text("PRAGMA table_info(suministros)"))]
        if not cols:
            return
        for c, tipo in nuevas.items():
            if c not in cols:
                con.execute(text("ALTER TABLE suministros ADD COLUMN " + c + " " + tipo))


_migrar_suministros()
app = FastAPI(title="CN Pueblo Viejo 2")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(auth.router, prefix="/api")
app.include_router(proveedores.router, prefix="/api")
app.include_router(trabajos.router, prefix="/api")
app.include_router(suministros.router, prefix="/api")
app.include_router(respaldos.router, prefix="/api")

@app.on_event("startup")
def _iniciar_respaldos():
    respaldos.iniciar_programador()
