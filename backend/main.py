from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.api import proveedores

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CN Pueblo Viejo 2 · Gestión",
    version="1.0.0",
    description="Sistema de gestión del Condominio Complejo Náutico Pueblo Viejo II"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(proveedores.router, prefix="/api")

@app.get("/")
def root():
    return {"app": "CN Pueblo Viejo 2 · Gestión", "status": "ok"}
