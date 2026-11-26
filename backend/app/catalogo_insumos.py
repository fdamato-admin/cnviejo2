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
    uni_bulto: Optional[str] = None
    cantidad: Optional[float] = None
    color: Optional[str] = None
    concentracion: Optional[str] = None
    proveedor_habitual: Optional[str] = None
    notas: Optional[str] = None

class CatalogoInsumoOut(BaseModel):
    id: int
    codigo: str
    nombre: str
    marca: Optional[str]
    categoria: str
    unidad: Optional[str]
    uni_bulto: Optional[str] = None
    cantidad: Optional[float] = None
    color: Optional[str] = None
    concentracion: Optional[str] = None
    proveedor_habitual: Optional[str]
    ultimo_proveedor: Optional[str] = None
    ultimo_precio: Optional[float]
    ultimo_precio_bs: Optional[float] = None
    tasa_cambio: Optional[float] = None
    ultima_fecha_compra: Optional[str]
    notas: Optional[str]
    creado_en: Optional[object] = None
    class Config:
        from_attributes = True
        json_encoders = {object: str}


def _sync_catalogo(db: Session, nombre: str, categoria: str = None,
                   unidad: str = None, proveedor: str = None, precio: float = None,
                   fecha_compra=None):
    """Auto-agrega al catálogo si el producto no existe. Actualiza precio/fecha si ya existe."""
    if not nombre or not nombre.strip():
        return
    nombre_up = nombre.strip().upper()
    existente = db.query(CatalogoInsumo).filter(
        CatalogoInsumo.nombre.ilike(nombre_up)
    ).first()
    if existente:
        # Actualizar campos si tienen valor nuevo
        if precio is not None:
            existente.ultimo_precio = precio
        if fecha_compra:
            existente.ultima_fecha_compra = str(fecha_compra)
        if unidad and not existente.unidad:
            existente.unidad = unidad
        if proveedor and not existente.proveedor_habitual:
            existente.proveedor_habitual = proveedor
    else:
        cat_efectiva = categoria or 'Otro'
        nuevo = CatalogoInsumo(
            codigo=_generar_codigo(cat_efectiva, db),
            nombre=nombre_up,
            categoria=cat_efectiva,
            unidad=unidad or None,
            proveedor_habitual=proveedor or None,
            ultimo_precio=precio or None,
            ultima_fecha_compra=str(fecha_compra) if fecha_compra else None,
        )
        db.add(nuevo)


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
        uni_bulto=data.uni_bulto,
        cantidad=data.cantidad,
        color=data.color.upper().strip() if data.color else None,
        concentracion=data.concentracion.upper().strip() if data.concentracion else None,
        proveedor_habitual=data.proveedor_habitual,
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
    item.uni_bulto = data.uni_bulto
    item.cantidad = data.cantidad
    item.color = data.color.upper().strip() if data.color else None
    item.concentracion = data.concentracion.upper().strip() if data.concentracion else None
    item.proveedor_habitual = data.proveedor_habitual
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
