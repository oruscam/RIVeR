# Plan de Compilación Local RIVeR (GUI)

Este plan detalla los pasos para compilar la aplicación localmente e integrar los cambios hechos en la GUI, generando instaladores para Windows, macOS y Linux.

## Consideraciones Iniciales Importantes (Cross-Compilation)
El proyecto utiliza un backend en Python compilado con `pyinstaller` y un frontend empaquetado con `electron-builder`. 
- **⚠️ PyInstaller no soporta cross-compilation de manera oficial:** Esto significa que para crear un ejecutable de Windows (`.exe`), debes ejecutar la compilación en Windows. Para macOS (`.dmg`), debes hacerlo en macOS. Para Linux (`.deb`), en Linux.
- **FFmpeg:** `electron-builder.json5` requiere que exista una carpeta `gui/ffmpeg/bin/` con los binarios de FFmpeg correspondientes al sistema operativo desde el que estás compilando.
- **Rutas de Salida:** Los instaladores finales se depositarán en `gui/release/3.4.0/`.

## Requisitos Previos (Para todos los SO)
1. **Node.js**: Instalado (versión recomendada: 18 o la que use tu entorno local).
2. **Python**: Instalado (versiones probadas: 3.9 a 3.12).
3. **Módulo Vite/Electron**: `npm install` ejecutado dentro de la carpeta `gui/`.

---

## 💻 1. Paso a Paso en Windows
*(Ejecutar todo esto en una máquina o máquina virtual corriendo Windows)*

1. **Instalar dependencias de Python (en consola desde root del proyecto)**:
   ```cmd
   pip install -r requirements.txt
   ```
2. **Preparar dependencias de desarrollo y compilar la CLI (en consola desde `/gui`)**:
   ```cmd
   npm install
   npm run install-pyinstaller
   npm run build-cli
   ```
3. **Asegurarse de tener FFmpeg (Windows)**:
   Descarga `ffmpeg.exe` y `ffprobe.exe` para Windows y colócalos en `gui/ffmpeg/`.
4. **Construir el Frontend (React/Vite) y Empaquetar Electron**:
   ```cmd
   npm run build
   npm run build-win
   ```
   **Resultado:** Archivo setup instalador `.exe` (NSIS) en la carpeta `gui/release/3.4.0/`.

---

## 🍏 2. Paso a Paso en macOS
*(Ejecutar todo esto en un entorno macOS)*

1. **Instalar dependencias de Python**:
   ```bash
   pip install -r requirements.txt
   ```
2. **Preparar y compilar CLI (desde `/gui`)**:
   ```bash
   npm install
   npm run install-pyinstaller
   npm run build-cli
   ```
3. **Asegurarse de tener FFmpeg (macOS)**:
   Descarga `ffmpeg` y `ffprobe` para macOS y colócalos en `gui/ffmpeg/`.
4. **Construir el Frontend y Empaquetar Electron**:
   ```bash
   npm run build
   npm run build-mac
   ```
   **Resultado:** Archivo dmg instalador `.dmg` en la carpeta `gui/release/3.4.0/`.

---

## 🐧 3. Paso a Paso en Linux
*(Ejecutar todo esto en un entorno Linux, como Ubuntu o Debian)*

1. **Instalar dependencias de Python**:
   ```bash
   pip install -r requirements.txt
   ```
2. **Preparar y compilar CLI (desde `/gui`)**:
   ```bash
   npm install
   npm run install-pyinstaller
   npm run build-cli
   ```
3. **Asegurarse de tener FFmpeg (Linux)**:
   Puedes colocar los binarios de `ffmpeg` y `ffprobe` (obtenidos estáticamente o vía `apt`) en la carpeta `gui/ffmpeg/`.
4. **Construir el Frontend y Empaquetar Electron**:
   ```bash
   npm run build
   npm run build-linux
   ```
   **Resultado:** Archivo Debian instalador `.deb` en la carpeta `gui/release/3.4.0/`.
