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
        "moneda_pago": "VARCHAR(10)",
        "iva_porcentaje": "FLOAT",
        "iva_divisa": "FLOAT",
        "monto_total_divisa": "FLOAT",
        "cantidad": "FLOAT",
        "estado_recepcion": "VARCHAR(20)",
    }
    with engine.begin() as con:
        cols = [r[1] for r in con.execute(text("PRAGMA table_info(suministros)"))]
        if not cols:
            return
        for c, tipo in nuevas.items():
            if c not in cols:
                con.execute(text("ALTER TABLE suministros ADD COLUMN " + c + " " + tipo))


_migrar_suministros()


def _migrar_compras():
    from sqlalchemy import text
    nuevas = {"monto_usd": "FLOAT", "nombre": "VARCHAR(200)"}
    with engine.begin() as con:
        cols = [r[1] for r in con.execute(text("PRAGMA table_info(compras_suministros)"))]
        if not cols:
            return
        for c, tipo in nuevas.items():
            if c not in cols:
                con.execute(text("ALTER TABLE compras_suministros ADD COLUMN " + c + " " + tipo))


_migrar_compras()

app = FastAPI(title="CN Pueblo Viejo 2")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(auth.router, prefix="/api")
app.include_router(proveedores.router, prefix="/api")
app.include_router(trabajos.router, prefix="/api")
app.include_router(suministros.router, prefix="/api")
from app.api import recibo
app.include_router(recibo.router, prefix="/api")
from app.api import pedidos_suministros
app.include_router(pedidos_suministros.router, prefix="/api")
app.include_router(respaldos.router, prefix="/api")

@app.on_event("startup")
def _iniciar_respaldos():
    respaldos.iniciar_programador()
