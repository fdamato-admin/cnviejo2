from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.sql import func
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from ..database import get_db, Base
from ..auth import get_current_user, require_permiso
from ..models import Usuario, NivelPermiso

class MovimientoCaja(Base):
    __tablename__ = "caja_chica"
    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String(30), nullable=False)
    fecha = Column(DateTime(timezone=True), nullable=True)
    monto_usd = Column(Float, nullable=True)
    monto_bs = Column(Float, nullable=True)
    tasa = Column(Float, nullable=True)
    descripcion = Column(String(200), nullable=True)
    nota = Column(Text, nullable=True)
    saldo_usd = Column(Float, nullable=False)
    creado_por = Column(String(100), nullable=True)

class MovimientoIn(BaseModel):
    tipo: str
    fecha: Optional[str] = None
    monto_usd: Optional[float] = None
    monto_bs: Optional[float] = None
    tasa: Optional[float] = None
    descripcion: Optional[str] = None
    nota: Optional[str] = None

class MovimientoOut(BaseModel):
    id: int
    tipo: str
    fecha: Optional[str] = None
    monto_usd: Optional[float] = None
    monto_bs: Optional[float] = None
    tasa: Optional[float] = None
    descripcion: Optional[str] = None
    nota: Optional[str] = None
    saldo_usd: float
    creado_por: Optional[str] = None
    class Config:
        from_attributes = True

router = APIRouter(prefix="/caja", tags=["caja"])

def _ultimo_saldo(db: Session) -> float:
    ultimo = db.query(MovimientoCaja).order_by(MovimientoCaja.id.desc()).first()
    return ultimo.saldo_usd if ultimo else 0.0

@router.get("/", response_model=List[MovimientoOut])
def listar_movimientos(db: Session = Depends(get_db), _=Depends(require_permiso("*", NivelPermiso.admin))):
    movs = db.query(MovimientoCaja).order_by(MovimientoCaja.id.desc()).all()
    result = []
    for m in movs:
        d = {
            "id": m.id, "tipo": m.tipo,
            "fecha": m.fecha.isoformat() if m.fecha else None,
            "monto_usd": m.monto_usd, "monto_bs": m.monto_bs, "tasa": m.tasa,
            "descripcion": m.descripcion, "nota": m.nota,
            "saldo_usd": m.saldo_usd, "creado_por": m.creado_por,
        }
        result.append(d)
    return result

@router.get("/saldo")
def obtener_saldo(db: Session = Depends(get_db), _=Depends(require_permiso("*", NivelPermiso.admin))):
    return {"saldo_usd": _ultimo_saldo(db)}

@router.post("/", status_code=201)
def registrar_movimiento(data: MovimientoIn, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user), _=Depends(require_permiso("*", NivelPermiso.admin))):
    saldo = _ultimo_saldo(db)
    if data.tipo == "saldo_inicial":
        if data.monto_usd is None: raise HTTPException(400, "monto_usd requerido")
        nuevo_saldo = data.monto_usd
    elif data.tipo == "entrada_usd":
        if data.monto_usd is None: raise HTTPException(400, "monto_usd requerido")
        nuevo_saldo = saldo + data.monto_usd
    elif data.tipo == "compra_usd":
        if data.monto_bs is None or data.tasa is None: raise HTTPException(400, "monto_bs y tasa requeridos")
        data.monto_usd = round(data.monto_bs / data.tasa, 2)
        nuevo_saldo = saldo + data.monto_usd
    elif data.tipo == "gasto_usd":
        if data.monto_usd is None: raise HTTPException(400, "monto_usd requerido")
        if data.monto_usd > saldo: raise HTTPException(400, "Saldo insuficiente")
        nuevo_saldo = saldo - data.monto_usd
    elif data.tipo == "venta_usd":
        if data.monto_usd is None or data.tasa is None: raise HTTPException(400, "monto_usd y tasa requeridos")
        if data.monto_usd > saldo: raise HTTPException(400, "Saldo insuficiente")
        data.monto_bs = round(data.monto_usd * data.tasa, 2)
        nuevo_saldo = saldo - data.monto_usd
    else:
        raise HTTPException(400, f"Tipo desconocido: {data.tipo}")
    fecha_dt = None
    if data.fecha:
        for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f"):
            try:
                fecha_dt = datetime.strptime(data.fecha[:19], fmt[:len(data.fecha[:19])])
                break
            except Exception:
                continue
    if fecha_dt is None and data.fecha:
        try:
            fecha_dt = datetime.fromisoformat(data.fecha.replace("Z",""))
        except Exception:
            fecha_dt = None
    mov = MovimientoCaja(
        tipo=data.tipo, fecha=fecha_dt,
        monto_usd=data.monto_usd, monto_bs=data.monto_bs, tasa=data.tasa,
        descripcion=data.descripcion, nota=data.nota,
        saldo_usd=round(nuevo_saldo, 2),
        creado_por=usuario.nombre if usuario else "Sistema",
    )
    db.add(mov)
    db.commit()
    db.refresh(mov)
    return {
        "id": mov.id, "tipo": mov.tipo,
        "fecha": mov.fecha.isoformat() if mov.fecha else None,
        "monto_usd": mov.monto_usd, "monto_bs": mov.monto_bs, "tasa": mov.tasa,
        "descripcion": mov.descripcion, "nota": mov.nota,
        "saldo_usd": mov.saldo_usd, "creado_por": mov.creado_por,
    }

@router.delete("/{mov_id}", status_code=204)
def eliminar_movimiento(mov_id: int, db: Session = Depends(get_db), _=Depends(require_permiso("*", NivelPermiso.admin))):
    mov = db.query(MovimientoCaja).filter(MovimientoCaja.id == mov_id).first()
    if not mov: raise HTTPException(404, "Movimiento no encontrado")
    posteriores = db.query(MovimientoCaja).filter(MovimientoCaja.id > mov_id).order_by(MovimientoCaja.id).all()
    db.delete(mov)
    db.flush()
    anterior = db.query(MovimientoCaja).filter(MovimientoCaja.id < mov_id).order_by(MovimientoCaja.id.desc()).first()
    saldo_base = anterior.saldo_usd if anterior else 0.0
    for p in posteriores:
        if p.tipo in ("saldo_inicial", "entrada_usd", "compra_usd"):
            saldo_base = saldo_base + (p.monto_usd or 0)
        elif p.tipo in ("gasto_usd", "venta_usd"):
            saldo_base = saldo_base - (p.monto_usd or 0)
        p.saldo_usd = round(saldo_base, 2)
    db.commit()
