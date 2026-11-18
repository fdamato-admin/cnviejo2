from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from ..database import get_db
from ..models import PedidoCotizacion, PedidoCotizacionItem

router = APIRouter(prefix="/pedidos-cotizacion", tags=["Pedidos de Cotización"])

class ItemPedidoIn(BaseModel):
    descripcion: str
    cantidad: Optional[str] = None
    unidad: Optional[str] = None

class PedidoCotizacionIn(BaseModel):
    nro_solicitud: str
    obra: str
    fecha_requerida: Optional[str] = None
    observaciones: Optional[str] = None
    items: List[ItemPedidoIn] = []

class ItemPedidoOut(ItemPedidoIn):
    id: int
    class Config: from_attributes = True

class PedidoCotizacionOut(BaseModel):
    id: int
    nro_solicitud: str
    obra: str
    fecha_requerida: Optional[str] = None
    observaciones: Optional[str] = None
    creado_en: Optional[object] = None
    items: List[ItemPedidoOut] = []
    class Config:
        from_attributes = True
        json_encoders = {object: str}

@router.post("/", response_model=PedidoCotizacionOut, status_code=201)
def crear_pedido(data: PedidoCotizacionIn, db: Session = Depends(get_db)):
    existente = db.query(PedidoCotizacion).filter(PedidoCotizacion.nro_solicitud == data.nro_solicitud).first()
    if existente:
        raise HTTPException(409, "Ya existe un pedido con ese número de solicitud")
    p = PedidoCotizacion(
        nro_solicitud=data.nro_solicitud,
        obra=data.obra,
        fecha_requerida=data.fecha_requerida,
        observaciones=data.observaciones,
    )
    db.add(p)
    db.flush()
    for it in data.items:
        db.add(PedidoCotizacionItem(pedido_id=p.id, descripcion=it.descripcion, cantidad=it.cantidad, unidad=it.unidad))
    db.commit()
    db.refresh(p)
    return p

@router.get("/", response_model=List[PedidoCotizacionOut])
def listar_pedidos(db: Session = Depends(get_db)):
    return db.query(PedidoCotizacion).order_by(PedidoCotizacion.creado_en.desc()).all()

@router.get("/{id}", response_model=PedidoCotizacionOut)
def obtener_pedido(id: int, db: Session = Depends(get_db)):
    p = db.query(PedidoCotizacion).filter(PedidoCotizacion.id == id).first()
    if not p: raise HTTPException(404, "No encontrado")
    return p

@router.put("/{id}", response_model=PedidoCotizacionOut)
def actualizar_pedido(id: int, data: PedidoCotizacionIn, db: Session = Depends(get_db)):
    p = db.query(PedidoCotizacion).filter(PedidoCotizacion.id == id).first()
    if not p: raise HTTPException(404, "No encontrado")
    p.obra = data.obra
    p.fecha_requerida = data.fecha_requerida
    p.observaciones = data.observaciones
    # Reemplazar items
    for it in p.items:
        db.delete(it)
    db.flush()
    for it in data.items:
        db.add(PedidoCotizacionItem(pedido_id=p.id, descripcion=it.descripcion, cantidad=it.cantidad, unidad=it.unidad))
    db.commit()
    db.refresh(p)
    return p

@router.delete("/{id}")
def eliminar_pedido(id: int, db: Session = Depends(get_db)):
    p = db.query(PedidoCotizacion).filter(PedidoCotizacion.id == id).first()
    if not p: raise HTTPException(404, "No encontrado")
    db.delete(p)
    db.commit()
    return {"ok": True}
