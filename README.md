# Auditoría Laboral Backend

Backend desarrollado con **NestJS**, **TypeORM** y **PostgreSQL**, destinado a gestionar postulaciones laborales, usuarios, empresas y métricas de auditoría laboral.  

Este proyecto permite registrar usuarios, ofertas laborales, postulaciones, y calcular scores de alineación laboral según distintos criterios.

---

## 🏗 Tecnologías

- **NestJS** – Framework Node.js para construir aplicaciones escalables.
- **TypeORM** – ORM para bases de datos SQL.
- **PostgreSQL** – Base de datos relacional.
- **Class-validator / Class-transformer** – Validación y transformación de DTOs.
- **Jest** – Pruebas unitarias y e2e.

---

## 📁 Estructura del proyecto

src/
├─ common/ # Enumeraciones, constantes, utils
├─ users/ # Entidad User, DTOs, services, controllers
├─ companies/ # Entidad Company, DTOs, services, controllers
├─ job-offers/ # Entidad JobOffer, DTOs, services, controllers
├─ job-applications/ # Entidad JobApplication, DTOs, services, controllers
├─ app.module.ts # Módulo raíz


---

## ⚡ Funcionalidades principales

- Registro y gestión de **usuarios**.
- Registro y gestión de **empresas**.
- Creación y gestión de **ofertas laborales**.
- Postulación de usuarios a ofertas (`JobApplication`) con:
  - Estado (`status`)  
  - Nivel de compatibilidad (`matchLevel`)  
  - Modo de trabajo (`remote`, `onsite`, `hybrid`)  
  - Fecha de postulación (`appliedAt`)
- Soft delete y auditoría (`createdAt`, `updatedAt`, `deletedAt`) en entidades clave.
- Consultas optimizadas con relaciones bidireccionales y índices.

---
