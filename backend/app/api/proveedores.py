from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from ..database import get_db
from ..models import Proveedor, TipoProveedor, EstadoProveedor
from ..schemas import ProveedorCreate, ProveedorUpdate, ProveedorOut

router = APIRouter(prefix="/proveedores", tags=["Proveedores"])

@router.get("/", response_model=List[ProveedorOut])
def listar_proveedores(
    tipo: Optional[TipoProveedor] = None,
    categoria: Optional[str] = None,
    estado: Optional[EstadoProveedor] = None,
    buscar: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(Proveedor)
    if tipo:
        q = q.filter(Proveedor.tipo == tipo)
    if categoria:
        q = q.filter(Proveedor.categoria == categoria)
    if estado:
        q = q.filter(Proveedor.estado == estado)
    if buscar:
        q = q.filter(or_(
            Proveedor.nombre.ilike(f"%{buscar}%"),
            Proveedor.empresa.ilike(f"%{buscar}%"),
            Proveedor.categoria.ilike(f"%{buscar}%")
        ))
    return q.order_by(Proveedor.nombre).all()

@router.get("/categorias", response_model=List[str])
def listar_categorias(db: Session = Depends(get_db)):
    rows = db.query(Proveedor.categoria).distinct().order_by(Proveedor.categoria).all()
    return [r[0] for r in rows]

@router.get("/{id}", response_model=ProveedorOut)
def obtener_proveedor(id: int, db: Session = Depends(get_db)):
    p = db.query(Proveedor).filter(Proveedor.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return p

@router.post("/", response_model=ProveedorOut, status_code=201)
def crear_proveedor(data: ProveedorCreate, db: Session = Depends(get_db)):
    p = Proveedor(**data.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p

@router.put("/{id}", response_model=ProveedorOut)
def actualizar_proveedor(id: int, data: ProveedorUpdate, db: Session = Depends(get_db)):
    p = db.query(Proveedor).filter(Proveedor.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p

@router.delete("/{id}", status_code=204)
def eliminar_proveedor(id: int, db: Session = Depends(get_db)):
    p = db.query(Proveedor).filter(Proveedor.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    db.delete(p)
    db.commit()
