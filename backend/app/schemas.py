from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from .models import TipoProveedor, EstadoProveedor, TipoTrabajo, PrioridadTrabajo, EstadoTrabajo, EstadoCotizacion, NivelPermiso

class PermisoIn(BaseModel):
    modulo: str
    nivel: NivelPermiso

class PermisoOut(PermisoIn):
    id: int
    class Config: from_attributes = True

class UsuarioCreate(BaseModel):
    nombre: str
    email: str
    password: str
    activo: bool = True
    permisos: List[PermisoIn] = []

class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    activo: Optional[bool] = None
    permisos: Optional[List[PermisoIn]] = None

class UsuarioOut(BaseModel):
    id: int
    nombre: str
    email: str
    activo: bool
    permisos: List[PermisoOut] = []
    class Config: from_attributes = True

class LoginIn(BaseModel):
    email: str
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioOut

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

class ProveedorCreate(ProveedorBase): pass
class ProveedorUpdate(ProveedorBase):
    nombre: Optional[str] = None
    tipo: Optional[TipoProveedor] = None
    categoria: Optional[str] = None

class ProveedorOut(ProveedorBase):
    id: int
    creado_en: datetime
    actualizado_en: Optional[datetime] = None
    class Config: from_attributes = True

class TrabajoBase(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    categoria: str
    tipo: TipoTrabajo
    prioridad: PrioridadTrabajo = PrioridadTrabajo.normal
    ubicacion: Optional[str] = None
    notas: Optional[str] = None

class TrabajoCreate(TrabajoBase): pass
class TrabajoUpdate(TrabajoBase):
    titulo: Optional[str] = None
    categoria: Optional[str] = None
    tipo: Optional[TipoTrabajo] = None
    estado: Optional[EstadoTrabajo] = None

class TrabajoOut(TrabajoBase):
    id: int
    estado: EstadoTrabajo
    creado_en: datetime
    actualizado_en: Optional[datetime] = None
    class Config: from_attributes = True

class CotizacionBase(BaseModel):
    trabajo_id: int
    proveedor_id: Optional[int] = None
    proveedor_nombre: Optional[str] = None
    tipo: TipoTrabajo
    monto: Optional[Decimal] = None
    moneda: str = "USD"
    descripcion: Optional[str] = None
    es_manual: bool = True
    email_enviado_a: Optional[str] = None
    notas: Optional[str] = None

class CotizacionCreate(CotizacionBase): pass
class CotizacionUpdate(BaseModel):
    estado: Optional[EstadoCotizacion] = None
    monto: Optional[Decimal] = None
    moneda: Optional[str] = None
    descripcion: Optional[str] = None
    notas: Optional[str] = None

class CotizacionOut(CotizacionBase):
    id: int
    estado: EstadoCotizacion
    creado_en: datetime
    actualizado_en: Optional[datetime] = None
    class Config: from_attributes = True
