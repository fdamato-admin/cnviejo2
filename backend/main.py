from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.api import proveedores, trabajos, auth, suministros, respaldos
from app.api import auditoria
from app.api import caja

Base.metadata.create_all(bind=engine)

# Migraciones incrementales
with engine.connect() as _conn:
    try:
        _conn.execute(__import__('sqlalchemy').text('ALTER TABLE suministros ADD COLUMN numero_documento VARCHAR(100)'))
        _conn.commit()
    except Exception:
        pass

def _migrar_proveedores():
    from sqlalchemy import text
    with engine.begin() as con:
        cols = [r[1] for r in con.execute(text("PRAGMA table_info(proveedores)"))]
        if not cols:
            return
        if "telefono_alt" not in cols:
            con.execute(text("ALTER TABLE proveedores ADD COLUMN telefono_alt VARCHAR(30)"))

_migrar_proveedores()

def _migrar_suministros():
    from sqlalchemy import text
    nuevas = {
        "precio_bs": "FLOAT", "tasa_cambio": "FLOAT", "tipo_documento": "VARCHAR(30)",
        "documento_otro": "VARCHAR(150)", "iva_bs": "FLOAT", "monto_total_bs": "FLOAT",
        "moneda_pago": "VARCHAR(10)", "iva_porcentaje": "FLOAT", "iva_divisa": "FLOAT",
        "monto_total_divisa": "FLOAT", "cantidad": "FLOAT", "estado_recepcion": "VARCHAR(20)",
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
app.include_router(auditoria.router, prefix="/api")
app.include_router(caja.router, prefix="/api")

@app.on_event("startup")
def _iniciar_respaldos():
    respaldos.iniciar_programador()

from app.api import solicitud_form
app.include_router(solicitud_form.router)
from app.api import solicitudes_insumos
app.include_router(solicitudes_insumos.router, prefix="/api")

def _migrar_solicitudes_insumos():
    from sqlalchemy import text
    with engine.begin() as con:
        # Crear tabla solicitudes_insumos si no existe
        con.execute(text("""
            CREATE TABLE IF NOT EXISTS solicitudes_insumos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                obra VARCHAR(300) NOT NULL,
                fecha_requerida VARCHAR(20),
                observaciones TEXT,
                proveedor_id INTEGER REFERENCES proveedores(id),
                proveedor_nombre VARCHAR(150),
                proveedor_telefono VARCHAR(30),
                validez VARCHAR(100),
                tiempo_entrega VARCHAR(100),
                condicion_pago VARCHAR(50),
                subtotal_usd NUMERIC(12,2),
                iva_usd NUMERIC(12,2),
                total_usd NUMERIC(12,2),
                banco VARCHAR(100),
                titular VARCHAR(150),
                cuenta VARCHAR(50),
                tipo_cuenta VARCHAR(20),
                rif VARCHAR(30),
                observaciones_prov TEXT,
                estado VARCHAR(20) DEFAULT 'pendiente',
                creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
                actualizado_en DATETIME
            )
        """))
        con.execute(text("""
            CREATE TABLE IF NOT EXISTS solicitud_insumo_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                solicitud_id INTEGER NOT NULL REFERENCES solicitudes_insumos(id),
                descripcion VARCHAR(300) NOT NULL,
                cantidad VARCHAR(20),
                unidad VARCHAR(30),
                alternativa VARCHAR(200),
                precio_usd NUMERIC(12,2),
                tasa_bs NUMERIC(12,2),
                subtotal_usd NUMERIC(12,2),
                aprobado BOOLEAN DEFAULT 1
            )
        """))

_migrar_solicitudes_insumos()

def _migrar_solicitudes_insumos_v2():
    from sqlalchemy import text
    with engine.begin() as con:
        cols = [r[1] for r in con.execute(text("PRAGMA table_info(solicitudes_insumos)"))]
        if not cols:
            return
        if "nro_solicitud" not in cols:
            con.execute(text("ALTER TABLE solicitudes_insumos ADD COLUMN nro_solicitud VARCHAR(10)"))

_migrar_solicitudes_insumos_v2()

from app.api import pedidos_cotizacion
app.include_router(pedidos_cotizacion.router, prefix="/api")

def _migrar_pedidos_cotizacion():
    from sqlalchemy import text
    with engine.begin() as con:
        con.execute(text("""
            CREATE TABLE IF NOT EXISTS pedidos_cotizacion (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nro_solicitud VARCHAR(10) NOT NULL UNIQUE,
                obra VARCHAR(300) NOT NULL,
                fecha_requerida VARCHAR(20),
                observaciones TEXT,
                creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
                actualizado_en DATETIME
            )
        """))
        con.execute(text("""
            CREATE TABLE IF NOT EXISTS pedidos_cotizacion_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pedido_id INTEGER NOT NULL REFERENCES pedidos_cotizacion(id),
                descripcion VARCHAR(300) NOT NULL,
                cantidad VARCHAR(20),
                unidad VARCHAR(30)
            )
        """))

_migrar_pedidos_cotizacion()

from app.api import catalogo_insumos
app.include_router(catalogo_insumos.router, prefix="/api")

def _migrar_catalogo_insumos():
    from sqlalchemy import text
    with engine.begin() as con:
        con.execute(text("""
            CREATE TABLE IF NOT EXISTS catalogo_insumos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codigo VARCHAR(12) NOT NULL UNIQUE,
                nombre VARCHAR(200) NOT NULL,
                marca VARCHAR(100),
                categoria VARCHAR(100) NOT NULL,
                unidad VARCHAR(50),
                proveedor_habitual VARCHAR(150),
                ultimo_precio FLOAT,
                ultima_fecha_compra VARCHAR(20),
                notas TEXT,
                creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
                actualizado_en DATETIME
            )
        """))

_migrar_catalogo_insumos()

def _migrar_solicitudes_insumos_v3():
    from sqlalchemy import text
    with engine.begin() as con:
        cols = [r[1] for r in con.execute(text("PRAGMA table_info(solicitudes_insumos)"))]
        if not cols:
            return
        if "cotizacion_adjunta_url" not in cols:
            con.execute(text("ALTER TABLE solicitudes_insumos ADD COLUMN cotizacion_adjunta_url VARCHAR(500)"))

_migrar_solicitudes_insumos_v3()
