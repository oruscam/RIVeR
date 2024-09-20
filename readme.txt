05/31/2021
RIVeR desktop has been developed in Python 3.7.7

1. Instalar Node 18.18.00 o superior
  1.1 - Instalar nvm, manejador de versiones node
  1.2 - nvm install 18.18.00
  1.3 - nvm use 18.18.00

2 - Instalar yarn
  1 - Si tienes npm, simple, npm install yarn
  2 - Si no tienes npm, via curl se puede.

3 - Es necesesario tener ffmpeg

4 - cd RIVeR/gui

5 - Ejecutar -> yarn

6 -> Crear archivo .env en la raiz de gui, RIVeR/gui/.env siguiendo el .env.example.

6 - Al finalizar, -> yarn dev

Listo, app corriendo.

# CAMBIOS
 - update-xsections, ahora los resultados corresponden al analisis. (ver como funciona)
 - Elimine la ventana emergente para las ultimas configuraciones y cree un paso nuevo
 - responsive -> ahora todos los graficos y formularios se adaptan mejor al ancho de la pantalla
 - Stop Button, solo se puede activar si el backend esta funcionando
 - Agregue una validacion al crear un proyecto que ya fue creado, pregunto al usuario si desea sobreescribir
 - en Results -> tabla
   - si check == false e interpolate == false, no se muestran los valores, ni los vectores
   - Provisoriamente agregue un button al final, para actualizar el grafico dependiendo los valores (ver que hacer)
  
 - Arreglos : 
    - botones de modulo video
    - Right Bank, siempre se calcula, solo que hay veces que queda fuera del grafico si tiene valores muy altos. (hay que ver que hacer)
    - Deshabilito import bath hasta que el valor de cs_lenght llegue, asi no hay conflicto de eventos.
    - Deshabilito botones next y back si se esta analizando
    - Empeze a corregir errores y elementos graficos en general!