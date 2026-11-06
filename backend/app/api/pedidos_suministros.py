from fastapi import APIRouter, Depends, HTTPException
from datetime import date
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import PedidoSuministro
from ..schemas import PedidoSuministroCreate, PedidoSuministroUpdate, PedidoSuministroOut

router = APIRouter(prefix="/pedidos-suministros", tags=["Pedidos de suministros"])


@router.get("/", response_model=List[PedidoSuministroOut])
def listar_pedidos(estado: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(PedidoSuministro)
    if estado:
        q = q.filter(PedidoSuministro.estado == estado)
    return q.order_by(PedidoSuministro.id.desc()).all()


@router.post("/", response_model=PedidoSuministroOut, status_code=201)
def crear_pedido(data: PedidoSuministroCreate, db: Session = Depends(get_db)):
    if data.cantidad <= 0:
        raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a cero")
    p = PedidoSuministro(**data.model_dump())
    if not p.fecha_pedido:
        p.fecha_pedido = date.today()
    if not p.estado:
        p.estado = "Pendiente"
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.put("/{id}", response_model=PedidoSuministroOut)
def actualizar_pedido(id: int, data: PedidoSuministroUpdate, db: Session = Depends(get_db)):
    p = db.query(PedidoSuministro).filter(PedidoSuministro.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/{id}", status_code=204)
def eliminar_pedido(id: int, db: Session = Depends(get_db)):
    p = db.query(PedidoSuministro).filter(PedidoSuministro.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    db.delete(p)
    db.commit()