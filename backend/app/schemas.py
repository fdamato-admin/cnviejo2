from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from .models import TipoProveedor, EstadoProveedor

class ProveedorBase(BaseModel):
    nombre: str
    empresa: Optional[str] = None
    tipo: TipoProveedor
    categoria: str
    telefono: Optional[str] = None
    telefono_alt: Optional[str] = None
    email: Optional[str] = None
    ubicacion: Optional[str] = None
    rif: Optional[str] = None
    direccion: Optional[str] = None
    estado: EstadoProveedor = EstadoProveedor.activo
    referido_por: Optional[str] = None
    notas: Optional[str] = None

class ProveedorCreate(ProveedorBase):
    pass

class ProveedorUpdate(ProveedorBase):
    nombre: Optional[str] = None
    tipo: Optional[TipoProveedor] = None
    categoria: Optional[str] = None

class ProveedorOut(ProveedorBase):
    id: int
    creado_en: datetime
    actualizado_en: Optional[datetime] = None

    class Config:
        from_attributes = True
