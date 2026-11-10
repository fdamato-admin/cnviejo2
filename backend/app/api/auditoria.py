from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from typing import List, Optional
from ..database import get_db, Base
from ..auth import get_current_user, require_permiso
from ..models import Usuario, NivelPermiso

class LogAuditoria(Base):
    __tablename__ = "auditoria"
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, nullable=True)
    usuario_nombre = Column(String(100), nullable=True)
    usuario_email = Column(String(120), nullable=True)
    accion = Column(String(50), nullable=False)
    modulo = Column(String(50), nullable=False)
    objeto_id = Column(Integer, nullable=True)
    detalle = Column(Text, nullable=True)
    fecha = Column(DateTime(timezone=True), server_default=func.now())

def registrar(db: Session, usuario: Optional[Usuario], accion: str, modulo: str, objeto_id: int = None, detalle: str = None):
    log = LogAuditoria(
        usuario_id=usuario.id if usuario else None,
        usuario_nombre=usuario.nombre if usuario else "Sistema",
        usuario_email=usuario.email if usuario else None,
        accion=accion, modulo=modulo, objeto_id=objeto_id, detalle=detalle,
    )
    db.add(log)

router = APIRouter(prefix="/auditoria", tags=["auditoria"])

@router.get("/")
def listar_logs(
    modulo: Optional[str] = None,
    usuario_id: Optional[int] = None,
    limit: int = 200,
    db: Session = Depends(get_db),
    _=Depends(require_permiso("*", NivelPermiso.admin)),
):
    q = db.query(LogAuditoria)
    if modulo:
        q = q.filter(LogAuditoria.modulo == modulo)
    if usuario_id:
        q = q.filter(LogAuditoria.usuario_id == usuario_id)
    return q.order_by(LogAuditoria.fecha.desc()).limit(limit).all()
