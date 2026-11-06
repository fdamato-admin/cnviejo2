from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from ..database import get_db
from ..models import Suministro, Configuracion
from ..schemas import SuministroCreate, SuministroUpdate, SuministroOut

router = APIRouter(prefix="/suministros", tags=["Suministros"])

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
