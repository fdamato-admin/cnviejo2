from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from ..database import get_db
from ..models import Suministro, Configuracion, CompraSuministro
from ..schemas import SuministroCreate, SuministroUpdate, SuministroOut

router = APIRouter(prefix="/suministros", tags=["Suministros"])

def _monto_usd(s):
    m = s.moneda_pago or "Bs"
    if m == "Bs":
        if s.monto_total_bs is not None and s.tasa_cambio:
            return s.monto_total_bs / s.tasa_cambio
        return None
    if m == "Euros":
        return None
    return s.monto_total_divisa


def _registrar_compra(db, s):
    if not s.ultima_fecha_compra:
        return
    existe = db.query(CompraSuministro).filter(
        CompraSuministro.suministro_id == s.id,
        CompraSuministro.fecha_compra == s.ultima_fecha_compra,
    ).first()
    if existe:
        existe.cantidad = s.cantidad
        existe.monto_usd = _monto_usd(s)
        existe.nombre = s.nombre
    else:
        db.add(CompraSuministro(suministro_id=s.id, fecha_compra=s.ultima_fecha_compra, cantidad=s.cantidad, monto_usd=_monto_usd(s), nombre=s.nombre))


@router.get("/", response_model=List[SuministroOut])
def listar_suministros(
    categoria: Optional[str] = None,
    buscar: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(Suministro)
    if categoria:
        q = q.filter(Suministro.categoria == categoria)
    if buscar:
        q = q.filter(or_(
            Suministro.nombre.ilike(f"%{buscar}%"),
            Suministro.categoria.ilike(f"%{buscar}%"),
            Suministro.proveedor.ilike(f"%{buscar}%")
        ))
    return q.order_by(Suministro.nombre).all()

@router.get("/{id}", response_model=SuministroOut)
def obtener_suministro(id: int, db: Session = Depends(get_db)):
    s = db.query(Suministro).filter(Suministro.id == id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Suministro no encontrado")
    return s

@router.post("/", response_model=SuministroOut, status_code=201)
def crear_suministro(data: SuministroCreate, db: Session = Depends(get_db)):
    s = Suministro(**data.model_dump())
    db.add(s)
    db.flush()
    _registrar_compra(db, s)
    db.commit()
    db.refresh(s)
    return s

@router.put("/{id}", response_model=SuministroOut)
def actualizar_suministro(id: int, data: SuministroUpdate, db: Session = Depends(get_db)):
    s = db.query(Suministro).filter(Suministro.id == id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Suministro no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    db.flush()
    if "ultima_fecha_compra" in data.model_fields_set:
        _registrar_compra(db, s)
    db.commit()
    db.refresh(s)
    return s

@router.delete("/{id}", status_code=204)
def eliminar_suministro(id: int, db: Session = Depends(get_db)):
    s = db.query(Suministro).filter(Suministro.id == id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Suministro no encontrado")
    db.delete(s)
    db.commit()


@router.get("/config/iva")
def obtener_iva(db: Session = Depends(get_db)):
    c = db.query(Configuracion).filter(Configuracion.clave == "iva_porcentaje").first()
    return {"iva_porcentaje": float(c.valor) if c else 16.0}


@router.put("/config/iva")
def guardar_iva(data: dict, db: Session = Depends(get_db)):
    try:
        valor = float(data.get("iva_porcentaje"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="IVA invalido")
    if valor < 0 or valor > 100:
        raise HTTPException(status_code=400, detail="IVA fuera de rango")
    c = db.query(Configuracion).filter(Configuracion.clave == "iva_porcentaje").first()
    if c:
        c.valor = str(valor)
    else:
        db.add(Configuracion(clave="iva_porcentaje", valor=str(valor)))
    db.commit()
    return {"iva_porcentaje": valor}


@router.get("/config/frecuencias")
def frecuencias_compra(db: Session = Depends(get_db)):
    historial = {}
    for c in db.query(CompraSuministro).all():
        historial.setdefault(c.suministro_id, set()).add(c.fecha_compra)
    salida = []
    for s in db.query(Suministro).all():
        fechas = set(historial.get(s.id, set()))
        if s.ultima_fecha_compra:
            fechas.add(s.ultima_fecha_compra)
        fechas = sorted(fechas)
        promedio = None
        if len(fechas) >= 2:
            promedio = (fechas[-1] - fechas[0]).days / (len(fechas) - 1)
        salida.append({
            "nombre": (s.nombre or "").strip().upper(),
            "promedio_dias": promedio,
            "compras": len(fechas),
        })
    return salida
