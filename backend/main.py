from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app import models
from app.api import proveedores, trabajos, cotizaciones, auth

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="CN Pueblo Viejo 2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(proveedores.router, prefix="/api")
app.include_router(trabajos.router, prefix="/api")
app.include_router(cotizaciones.router, prefix="/api")
app.include_router(auth.router, prefix="/api")

@app.get("/")
def root():
    return {"status": "ok"}
