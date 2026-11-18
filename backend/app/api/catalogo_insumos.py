from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from ..database import get_db
from ..models import CatalogoInsumo

router = APIRouter(prefix="/catalogo-insumos", tags=["Catálogo de Insumos"])

PREFIJOS_CATEGORIA = {
    'Químicos de piscina':        'QUI',
    'Equipos de piscina':         'EQP',
    'Jardinería y áreas verdes':  'JAR',
    'Electricidad':               'ELE',
    'Plomería / Fontanería':      'PLO',
    'Planta eléctrica':           'PLA',
    'Seguridad / Vigilancia':     'SEG',
    'Pintura e impermeabilización':'PIN',
    'Ferretería y materiales':    'FER',
    'Limpieza':                   'LIM',
    'Aire acondicionado':         'AIR',
    'Informática y tecnología':   'INF',
    'Otro':                       'OTR',
}

def _generar_codigo(categoria: str, db: Session) -> str:
    prefijo = PREFIJOS_CATEGORIA.get(categoria, 'OTR')
    ultimo = db.query(CatalogoInsumo)\
        .filter(CatalogoInsumo.codigo.like(f"{prefijo}-%"))\
        .order_by(CatalogoInsumo.codigo.desc())\
        .first()
    if ultimo and ultimo.codigo:
        try:
            num = int(ultimo.codigo.split('-')[1]) + 1
        except (IndexError, ValueError):
            num = 1
    else:
        num = 1
    return f"{prefijo}-{str(num).zfill(4)}"


class CatalogoInsumoIn(BaseModel):
    nombre: str
    marca: Optional[str] = None
    categoria: str
    unidad: Optional[str] = None
    proveedor_habitual: Optional[str] = None
    ultimo_precio: Optional[float] = None
    notas: Optional[str] = None

class CatalogoInsumoOut(BaseModel):
    id: int
    codigo: str
    nombre: str
    marca: Optional[str]
    categoria: str
    unidad: Optional[str]
    proveedor_habitual: Optional[str]
    ultimo_precio: Optional[float]
    ultima_fecha_compra: Optional[str]
    notas: Optional[str]
    creado_en: Optional[object] = None
    class Config:
        from_attributes = True
        json_encoders = {object: str}


@router.get("/", response_model=List[CatalogoInsumoOut])
def listar(categoria: Optional[str] = None, q: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(CatalogoInsumo)
    if categoria:
        query = query.filter(CatalogoInsumo.categoria == categoria)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(
            CatalogoInsumo.nombre.ilike(like),
            CatalogoInsumo.codigo.ilike(like),
            CatalogoInsumo.marca.ilike(like),
        ))
    return query.order_by(CatalogoInsumo.nombre).all()


@router.post("/", response_model=CatalogoInsumoOut, status_code=201)
def crear(data: CatalogoInsumoIn, db: Session = Depends(get_db)):
    codigo = _generar_codigo(data.categoria, db)
    item = CatalogoInsumo(
        codigo=codigo,
        nombre=data.nombre.upper().strip(),
        marca=data.marca.upper().strip() if data.marca else None,
        categoria=data.categoria,
        unidad=data.unidad,
        proveedor_habitual=data.proveedor_habitual,
        ultimo_precio=data.ultimo_precio,
        notas=data.notas,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{id}", response_model=CatalogoInsumoOut)
def actualizar(id: int, data: CatalogoInsumoIn, db: Session = Depends(get_db)):
    item = db.query(CatalogoInsumo).filter(CatalogoInsumo.id == id).first()
    if not item:
        raise HTTPException(404, "No encontrado")
    item.nombre = data.nombre.upper().strip()
    item.marca = data.marca.upper().strip() if data.marca else None
    item.categoria = data.categoria
    item.unidad = data.unidad
    item.proveedor_habitual = data.proveedor_habitual
    item.ultimo_precio = data.ultimo_precio
    item.notas = data.notas
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{id}")
def eliminar(id: int, db: Session = Depends(get_db)):
    item = db.query(CatalogoInsumo).filter(CatalogoInsumo.id == id).first()
    if not item:
        raise HTTPException(404, "No encontrado")
    db.delete(item)
    db.commit()
    return {"ok": True}
