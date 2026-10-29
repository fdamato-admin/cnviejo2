from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from .models import NivelPermiso

class PermisoIn(BaseModel):
    modulo: str
    nivel: NivelPermiso

class PermisoOut(BaseModel):
    id: int
    modulo: str
    nivel: NivelPermiso
    class Config: from_attributes = True

class UsuarioCreate(BaseModel):
    nombre: str
    email: str
    password: str
    activo: bool = True
    permisos: List[PermisoIn] = []

class UsuarioUpdate(BaseModel):
    nombre: str
    email: str
    password: Optional[str] = None
    activo: bool = True
    permisos: List[PermisoIn] = []

class UsuarioOut(BaseModel):
    id: int
    nombre: str
    email: str
    activo: bool
    permisos: List[PermisoOut] = []
    class Config: from_attributes = True

class TokenOut(BaseModel):
    access_token: str
    token_type: str
    usuario: UsuarioOut

class ProveedorBase(BaseModel):
    nombre: str
    rif: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    especialidad: Optional[str] = None
    activo: bool = True

class ProveedorCreate(ProveedorBase): pass
class ProveedorUpdate(ProveedorBase): pass
class ProveedorOut(ProveedorBase):
    id: int
    creado_en: Optional[datetime] = None
    class Config: from_attributes = True

class TrabajoBase(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    proveedor_id: Optional[int] = None
    estado: str = "pendiente"
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    monto: Optional[str] = None

class TrabajoCreate(TrabajoBase): pass
class TrabajoUpdate(TrabajoBase): pass
class TrabajoOut(TrabajoBase):
    id: int
    creado_en: Optional[datetime] = None
    class Config: from_attributes = True

class CotizacionBase(BaseModel):
    titulo: str
    proveedor_id: Optional[int] = None
    monto: Optional[str] = None
    estado: str = "pendiente"
    descripcion: Optional[str] = None

class CotizacionCreate(CotizacionBase): pass
class CotizacionUpdate(CotizacionBase): pass
class CotizacionOut(CotizacionBase):
    id: int
    creado_en: Optional[datetime] = None
    class Config: from_attributes = True
