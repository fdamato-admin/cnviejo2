from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import Boolean, Column, Float, Integer, String, Text
from sqlalchemy.orm import Session

from ..database import engine, get_db
from ..models import Base, CompraSuministro, Configuracion, Suministro
from .suministros import _monto_usd


class ConceptoFijoRecibo(Base):
    __tablename__ = "recibo_conceptos_fijos"
    id = Column(Integer, primary_key=True, index=True)
    concepto = Column(String(150), nullable=False)
    grupo = Column(String(60), nullable=True)
    tipo = Column(String(30), nullable=False, default="Fijo garantizado")
    monto_usd = Column(Float, nullable=False, default=0)
    activo = Column(Boolean, nullable=False, default=True)


class GastoExtraRecibo(Base):
    __tablename__ = "recibo_gastos_extra"
    id = Column(Integer, primary_key=True, index=True)
    mes = Column(String(7), nullable=False, index=True)
    concepto = Column(String(200), nullable=False)
    monto_usd = Column(Float, nullable=False, default=0)
    estado = Column(String(20), nullable=False, default="Realizado")
    tipo = Column(String(20), nullable=False, default="Gasto")
    nota = Column(Text, nullable=True)


# Las tablas nuevas se crean al cargar este modulo (main.py ya ejecuto create_all antes)
Base.metadata.create_all(
    bind=engine,
    tables=[ConceptoFijoRecibo.__table__, GastoExtraRecibo.__table__],
)

router = APIRouter(prefix="/recibo", tags=["Impacto en el recibo"])

# Punto de partida tomado de los recibos de DEMCA (enero a septiembre 2026), en USD por mes
SEMILLA = [
    ("Prevención", "Contratista", "Fijo garantizado", 5730.00),
    ("Áreas verdes", "Contratista", "Fijo garantizado", 1800.00),
    ("Piscina (servicio)", "Contratista", "Fijo garantizado", 1030.00),
    ("Áreas comunes", "Contratista", "Fijo garantizado", 1400.00),
    ("Gerencia y supervisión", "Contratista", "Fijo garantizado", 1400.00),
    ("Infraestructura", "Contratista", "Fijo garantizado", 1510.00),
    ("Servicios administrativos DEMCA", "Administración", "Fijo garantizado", 210.00),
    ("IVA honorarios DEMCA", "Administración", "Fijo garantizado", 33.60),
    ("Honorarios ISLR", "Administración", "Fijo garantizado", 30.00),
    ("Internet", "Administración", "Fijo garantizado", 80.00),
    ("Art. y mat. de piscina (químicos)", "Materiales", "Fijo garantizado", 2634.00),
    ("Cuota urbanización", "Urbanización y aseo", "Fijo garantizado", 1030.00),
    ("Aseo urbano", "Urbanización y aseo", "Fijo garantizado", 1008.00),
    ("Corpoelec", "Servicios públicos", "Fijo variable", 90.00),
    ("Hidrocapital", "Servicios públicos", "Fijo variable", 1215.00),
    ("Art. y mat. ferretería/electricidad", "Materiales", "Fijo variable", 490.00),
    ("Art. y mat. limpieza", "Materiales", "Fijo variable", 210.00),
]


class ConceptoIn(BaseModel):
    concepto: str
    grupo: Optional[str] = None
    tipo: str = "Fijo garantizado"
    monto_usd: float = 0
    activo: bool = True


class ExtraIn(BaseModel):
    mes: str
    concepto: str
    monto_usd: float
    estado: str = "Realizado"
    tipo: str = "Gasto"
    nota: Optional[str] = None


class ConfigIn(BaseModel):
    villas: Optional[int] = None
    fondo_pct: Optional[float] = None


def _sembrar(db: Session):
    if db.query(ConceptoFijoRecibo).count() == 0:
        for concepto, grupo, tipo, monto in SEMILLA:
            db.add(ConceptoFijoRecibo(concepto=concepto, grupo=grupo, tipo=tipo, monto_usd=monto, activo=True))
        db.commit()


def _cfg(db: Session, clave: str, defecto: float) -> float:
    c = db.query(Configuracion).filter(Configuracion.clave == clave).first()
    if not c:
        return defecto
    try:
        return float(c.valor)
    except ValueError:
        return defecto


def _set_cfg(db: Session, clave: str, valor: float):
    c = db.query(Configuracion).filter(Configuracion.clave == clave).first()
    if c:
        c.valor = str(valor)
    else:
        db.add(Configuracion(clave=clave, valor=str(valor)))


def _redondear(v):
    return None if v is None else round(float(v), 2)


def _compras_del_mes(db: Session, ini: date, fin: date):
    suministros = {s.id: s for s in db.query(Suministro).all()}
    salida = []

    def item(nombre, fecha, proveedor, moneda, monto):
        return {
            "nombre": nombre,
            "fecha": fecha.isoformat() if fecha else None,
            "proveedor": proveedor,
            "moneda_pago": moneda,
            "monto_usd": _redondear(monto),
            "convertido": monto is not None,
        }

    # Ultima compra de cada suministro
    for s in suministros.values():
        if s.ultima_fecha_compra and ini <= s.ultima_fecha_compra < fin:
            salida.append(item(s.nombre, s.ultima_fecha_compra, s.proveedor, s.moneda_pago, _monto_usd(s)))

    # Compras anteriores guardadas en el historial
    historial = db.query(CompraSuministro).filter(
        CompraSuministro.fecha_compra >= ini, CompraSuministro.fecha_compra < fin
    ).all()
    for h in historial:
        s = suministros.get(h.suministro_id)
        if s and s.ultima_fecha_compra == h.fecha_compra:
            continue
        if h.monto_usd is None:
            continue
        nombre = h.nombre or (s.nombre if s else "SUMINISTRO")
        salida.append(item(nombre, h.fecha_compra, s.proveedor if s else None, None, h.monto_usd))

    salida.sort(key=lambda x: x["fecha"] or "")
    return salida


@router.get("/impacto")
def impacto(mes: Optional[str] = None, db: Session = Depends(get_db)):
    if not mes:
        mes = date.today().strftime("%Y-%m")
    try:
        anio, m = int(mes[:4]), int(mes[5:7])
        ini = date(anio, m, 1)
    except (ValueError, IndexError):
        raise HTTPException(status_code=400, detail="Mes invalido")
    fin = date(anio + 1, 1, 1) if m == 12 else date(anio, m + 1, 1)

    _sembrar(db)

    fijos = db.query(ConceptoFijoRecibo).order_by(ConceptoFijoRecibo.grupo, ConceptoFijoRecibo.id).all()
    extras = db.query(GastoExtraRecibo).filter(GastoExtraRecibo.mes == mes).order_by(GastoExtraRecibo.id).all()
    compras = _compras_del_mes(db, ini, fin)

    return {
        "mes": mes,
        "villas": int(_cfg(db, "recibo_villas", 84)),
        "fondo_pct": _cfg(db, "recibo_fondo_pct", 10.0),
        "fijos": [
            {"id": f.id, "concepto": f.concepto, "grupo": f.grupo, "tipo": f.tipo,
             "monto_usd": f.monto_usd, "activo": bool(f.activo)}
            for f in fijos
        ],
        "compras": compras,
        "total_compras": round(sum(c["monto_usd"] or 0 for c in compras), 2),
        "compras_sin_convertir": sum(1 for c in compras if not c["convertido"]),
        "extras": [
            {"id": e.id, "mes": e.mes, "concepto": e.concepto, "monto_usd": e.monto_usd,
             "estado": e.estado or "Realizado", "tipo": e.tipo or "Gasto", "nota": e.nota}
            for e in extras
        ],
        "total_extras_realizados": round(sum(e.monto_usd or 0 for e in extras if (e.estado or "Realizado") == "Realizado"), 2),
        "total_extras_por_realizar": round(sum(e.monto_usd or 0 for e in extras if e.estado == "Por realizar"), 2),
    }


@router.put("/config")
def guardar_config(data: ConfigIn, db: Session = Depends(get_db)):
    if data.villas is not None:
        if data.villas <= 0:
            raise HTTPException(status_code=400, detail="Villas invalido")
        _set_cfg(db, "recibo_villas", data.villas)
    if data.fondo_pct is not None:
        if data.fondo_pct < 0 or data.fondo_pct > 100:
            raise HTTPException(status_code=400, detail="Fondo de reserva fuera de rango")
        _set_cfg(db, "recibo_fondo_pct", data.fondo_pct)
    db.commit()
    return {"villas": int(_cfg(db, "recibo_villas", 84)), "fondo_pct": _cfg(db, "recibo_fondo_pct", 10.0)}


@router.post("/fijos", status_code=201)
def crear_fijo(data: ConceptoIn, db: Session = Depends(get_db)):
    f = ConceptoFijoRecibo(**data.model_dump())
    db.add(f)
    db.commit()
    db.refresh(f)
    return {"id": f.id}


@router.put("/fijos/{id}")
def actualizar_fijo(id: int, data: ConceptoIn, db: Session = Depends(get_db)):
    f = db.query(ConceptoFijoRecibo).filter(ConceptoFijoRecibo.id == id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Concepto no encontrado")
    for k, v in data.model_dump().items():
        setattr(f, k, v)
    db.commit()
    return {"id": f.id}


@router.delete("/fijos/{id}", status_code=204)
def eliminar_fijo(id: int, db: Session = Depends(get_db)):
    f = db.query(ConceptoFijoRecibo).filter(ConceptoFijoRecibo.id == id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Concepto no encontrado")
    db.delete(f)
    db.commit()


@router.post("/extras", status_code=201)
def crear_extra(data: ExtraIn, db: Session = Depends(get_db)):
    e = GastoExtraRecibo(**data.model_dump())
    db.add(e)
    db.commit()
    db.refresh(e)
    return {"id": e.id}


@router.delete("/extras/{id}", status_code=204)
def eliminar_extra(id: int, db: Session = Depends(get_db)):
    e = db.query(GastoExtraRecibo).filter(GastoExtraRecibo.id == id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    db.delete(e)
    db.commit()
