from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Enum, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum

class NivelPermiso(str, enum.Enum):
    admin = "admin"
    operador = "operador"
    consulta = "consulta"

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(String(200), nullable=False)
    activo = Column(Boolean, default=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    permisos = relationship("Permiso", back_populates="usuario", cascade="all, delete-orphan")

class Permiso(Base):
    __tablename__ = "permisos"
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    modulo = Column(String(50), nullable=False)
    nivel = Column(Enum(NivelPermiso), nullable=False)
    usuario = relationship("Usuario", back_populates="permisos")

class TipoProveedor(str, enum.Enum):
    servicio = "servicio"
    insumo = "insumo"
    ambos = "ambos"

class EstadoProveedor(str, enum.Enum):
    activo = "activo"
    inactivo = "inactivo"
    en_evaluacion = "en_evaluacion"

class Proveedor(Base):
    __tablename__ = "proveedores"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    empresa = Column(String(150), nullable=True)
    tipo = Column(Enum(TipoProveedor), nullable=False)
    categoria = Column(String(100), nullable=False)
    telefono = Column(String(30), nullable=True)
    telefono_alt = Column(String(30), nullable=True)
    email = Column(String(120), nullable=True)
    ubicacion = Column(String(150), nullable=True)
    estado = Column(Enum(EstadoProveedor), default=EstadoProveedor.activo)
    rif = Column(String(30), nullable=True)
    direccion = Column(String(250), nullable=True)
    referido_por = Column(String(150), nullable=True)
    notas = Column(Text, nullable=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
    cotizaciones = relationship("Cotizacion", back_populates="proveedor")

class TipoTrabajo(str, enum.Enum):
    servicio = "servicio"
    insumo = "insumo"
    ambos = "ambos"

class PrioridadTrabajo(str, enum.Enum):
    urgente = "urgente"
    normal = "normal"
    puede_esperar = "puede_esperar"

class EstadoTrabajo(str, enum.Enum):
    pendiente_cotizacion = "pendiente_cotizacion"
    cotizaciones_recibidas = "cotizaciones_recibidas"
    aprobado = "aprobado"
    en_ejecucion = "en_ejecucion"
    completado = "completado"
    cancelado = "cancelado"

class Trabajo(Base):
    __tablename__ = "trabajos"
    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    categoria = Column(String(100), nullable=False)
    tipo = Column(Enum(TipoTrabajo), nullable=False)
    prioridad = Column(Enum(PrioridadTrabajo), default=PrioridadTrabajo.normal)
    estado = Column(Enum(EstadoTrabajo), default=EstadoTrabajo.pendiente_cotizacion)
    ubicacion = Column(String(150), nullable=True)
    notas = Column(Text, nullable=True)
    foto1 = Column(String(500), nullable=True)
    foto2 = Column(String(500), nullable=True)
    foto3 = Column(String(500), nullable=True)
    foto4 = Column(String(500), nullable=True)
    foto5 = Column(String(500), nullable=True)
    foto6 = Column(String(500), nullable=True)
    video1 = Column(String(500), nullable=True)
    video2 = Column(String(500), nullable=True)
    video3 = Column(String(500), nullable=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
    cotizaciones = relationship("Cotizacion", back_populates="trabajo")

class EstadoCotizacion(str, enum.Enum):
    pendiente = "pendiente"
    recibida = "recibida"
    aprobada = "aprobada"
    rechazada = "rechazada"

class Cotizacion(Base):
    __tablename__ = "cotizaciones"
    id = Column(Integer, primary_key=True, index=True)
    trabajo_id = Column(Integer, ForeignKey("trabajos.id"), nullable=False)
    proveedor_id = Column(Integer, ForeignKey("proveedores.id"), nullable=True)
    proveedor_nombre = Column(String(150), nullable=True)
    tipo = Column(Enum(TipoTrabajo), nullable=False)
    estado = Column(Enum(EstadoCotizacion), default=EstadoCotizacion.pendiente)
    monto = Column(Numeric(12, 2), nullable=True)
    moneda = Column(String(10), default="USD")
    descripcion = Column(Text, nullable=True)
    es_manual = Column(Boolean, default=True)
    email_enviado_a = Column(String(120), nullable=True)
    documento_url = Column(String(500), nullable=True)
    notas = Column(Text, nullable=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
    trabajo = relationship("Trabajo", back_populates="cotizaciones")
    proveedor = relationship("Proveedor", back_populates="cotizaciones")


from sqlalchemy import Float, Date

class Suministro(Base):
    __tablename__ = "suministros"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    categoria = Column(String(100), nullable=False)
    unidad = Column(String(50), nullable=True)
    frecuencia_compra = Column(String(50), nullable=True)
    proveedor = Column(String(150), nullable=True)
    ultima_fecha_compra = Column(Date, nullable=True)
    ultimo_precio = Column(Float, nullable=True)
    precio_bs = Column(Float, nullable=True)
    tasa_cambio = Column(Float, nullable=True)
    tipo_documento = Column(String(30), nullable=True)
    documento_otro = Column(String(150), nullable=True)
    numero_documento = Column(String(100), nullable=True)
    iva_bs = Column(Float, nullable=True)
    monto_total_bs = Column(Float, nullable=True)
    moneda_pago = Column(String(10), nullable=True)
    iva_porcentaje = Column(Float, nullable=True)
    iva_divisa = Column(Float, nullable=True)
    monto_total_divisa = Column(Float, nullable=True)
    cantidad = Column(Float, nullable=True)
    estado_recepcion = Column(String(20), nullable=True)
    notas = Column(Text, nullable=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())


class Configuracion(Base):
    __tablename__ = "configuracion"
    clave = Column(String(50), primary_key=True)
    valor = Column(String(100), nullable=False)


import datetime as _dt
from sqlalchemy import Integer as _Int, Text as _Text, String as _Str, Date as _Date, Float as _Flt, Column as _Col


class PedidoSuministro(Base):
    __tablename__ = "pedidos_suministros"
    id = _Col(_Int, primary_key=True, index=True)
    nombre = _Col(_Str(200), nullable=False)
    cantidad = _Col(_Flt, nullable=False)
    unidad = _Col(_Str(50), nullable=True)
    nota = _Col(_Text, nullable=True)
    estado = _Col(_Str(20), nullable=False, default="Pendiente")
    fecha_pedido = _Col(_Date, default=_dt.date.today)


class CompraSuministro(Base):
    __tablename__ = "compras_suministros"
    id = _Col(_Int, primary_key=True, index=True)
    suministro_id = _Col(_Int, nullable=False, index=True)
    fecha_compra = _Col(_Date, nullable=False)
    cantidad = _Col(_Flt, nullable=True)
    monto_usd = _Col(_Flt, nullable=True)
    nombre = _Col(_Str(200), nullable=True)

# AGREGAR AL FINAL DE models.py

import enum as _enum

class EstadoSolicitudInsumos(str, _enum.Enum):
    pendiente = "pendiente"
    cotizada = "cotizada"
    aprobada = "aprobada"
    convertida = "convertida"
    cancelada = "cancelada"

class SolicitudInsumos(Base):
    __tablename__ = "solicitudes_insumos"
    id = Column(Integer, primary_key=True, index=True)
    obra = Column(String(300), nullable=False)
    fecha_requerida = Column(String(20), nullable=True)
    observaciones = Column(Text, nullable=True)
    # Proveedor que cotizó
    proveedor_id = Column(Integer, ForeignKey("proveedores.id"), nullable=True)
    proveedor_nombre = Column(String(150), nullable=True)
    proveedor_telefono = Column(String(30), nullable=True)
    # Condiciones
    validez = Column(String(100), nullable=True)
    tiempo_entrega = Column(String(100), nullable=True)
    condicion_pago = Column(String(50), nullable=True)
    # Totales
    subtotal_usd = Column(Numeric(12,2), nullable=True)
    iva_usd = Column(Numeric(12,2), nullable=True)
    total_usd = Column(Numeric(12,2), nullable=True)
    # Datos bancarios
    banco = Column(String(100), nullable=True)
    titular = Column(String(150), nullable=True)
    cuenta = Column(String(50), nullable=True)
    tipo_cuenta = Column(String(20), nullable=True)
    rif = Column(String(30), nullable=True)
    observaciones_prov = Column(Text, nullable=True)
    # Número de solicitud para agrupar cotizaciones del mismo pedido
    nro_solicitud = Column(String(10), nullable=True, index=True)
    # Estado
    estado = Column(Enum(EstadoSolicitudInsumos), default=EstadoSolicitudInsumos.pendiente)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
    # Relaciones
    items = relationship("SolicitudInsumoItem", back_populates="solicitud", cascade="all, delete-orphan")
    proveedor = relationship("Proveedor", foreign_keys=[proveedor_id])

class SolicitudInsumoItem(Base):
    __tablename__ = "solicitud_insumo_items"
    id = Column(Integer, primary_key=True, index=True)
    solicitud_id = Column(Integer, ForeignKey("solicitudes_insumos.id"), nullable=False)
    descripcion = Column(String(300), nullable=False)
    cantidad = Column(String(20), nullable=True)
    unidad = Column(String(30), nullable=True)
    alternativa = Column(String(200), nullable=True)
    precio_usd = Column(Numeric(12,2), nullable=True)
    tasa_bs = Column(Numeric(12,2), nullable=True)
    subtotal_usd = Column(Numeric(12,2), nullable=True)
    aprobado = Column(Boolean, default=True)  # para seleccionar qué comprar
    solicitud = relationship("SolicitudInsumos", back_populates="items")
