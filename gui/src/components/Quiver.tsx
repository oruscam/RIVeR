import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import './components.css'


export const Quiver = ({ width, height, factor }) => {
  const svgRef = useRef(null)
  const [tables, setTables] = useState(null)

  // useEffect(() => {
  //   if (!data.xtable || !data.ytable || !data.utable || !data.vtable || !data.typevector) return;
  //   const svg = d3.select(svgRef.current);
  //   svg.selectAll("*").remove(); // Limpiar el SVG antes de dibujar

  //   const width = 100;
  //   const height = 100;

  //   svg.attr("width", width)
  //      .attr("height", height)
  //      .style("background-color", "transparent");

  //   // Asumiendo que typevector es un vector lineal y necesitas adaptarlo, este paso podría cambiar

  // // Aplanar las matrices para el filtrado y dibujo, si es necesario
  // // Esto depende de cómo necesites tratar typevector con las matrices
  // const flatUTable = data.utable; // [counter]
  // const flatVTable = data.vtable; // [counter]
  // const validVectors = data.typevector // [0]
  // const flatXTable = data.xtable.map((d, i) => validVectors[i] === 1 ? d : -101); // xtable.flat().map
  // const flatYTable = data.ytable.map((d, _i) => {return d}); // ytable.flat().map
  
  // svg.selectAll("line")
  // .data(flatXTable) // Usar xtable como referencia para la cantidad de líneas a dibujar
  // .enter()
  // .append("line")
  //   .attr("x1", (d, i) => flatXTable[i] )
  //   .attr("y1", (d, i) => flatYTable[i]  )
  //   .attr("x2", (d, i) => flatXTable[i]  + flatUTable[i]* 30)
  //   .attr("y2", (d, i) => flatYTable[i] + flatVTable[i]* 30) // Invertir v para la dirección correcta
  //   .attr("stroke", "black")
  //   .attr("stroke-width", 2)
  //   .attr("marker-end", "url(#arrow)")
  //   .filter((_, i) => {
  //     // Filtrar los vectores que no son válidos
  //     return validVectors[i] === 1;
  //   }); // Aplicar el filtro después de definir los atributos

  //   // Definir la forma de la flecha
  //   svg.append("defs").append("marker")
  //       .attr("id", "arrow")
  //       .attr("viewBox", "0 -5 10 10")
  //       .attr("refX", 1)
  //       .attr("refY", 0)
  //       .attr("markerWidth", 6)
  //       .attr("markerHeight", 6)
  //       .attr("orient", "auto-start-reverse")
  //     .append("path")
  //       .attr("d", "M0,-5L10,0L0,5")
  //       .attr("fill", "black");
    
  // }, [])

  useEffect(() => {
    try {
      window.ipcRenderer.invoke('get-quiver-test').then((data) => {
        setTables(data)
      })
      
    } catch (error) {
      console.log(error)
    }
  }, [])

  if(tables !== null){
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Limpiar el SVG antes de dibujar

    svg.attr("width", width)
       .attr("height", height)
       .style("background-color", "transparent");

    const flatXTable = tables.x.flat().map((d, i) => tables.typevector[i] === 1 ? d : -10000); 
    const flatYTable = tables.y.flat().map((d, _i) => {return d});
    const uTable = tables.u[0]; // [counter]
    const vTable = tables.v[0]; // [counter]

    console.log(uTable)

    svg.selectAll('line')
      .data(flatXTable)
      .enter()
      .append('line')
        .attr('x1', (_d, i) => flatXTable[i] / factor.x)
        .attr('y1', (_d, i) => flatYTable[i] / factor.y)
        .attr('x2', (_d, i) => flatXTable[i] / factor.x + uTable[i] * 20)
        .attr('y2', (_d, i) => flatYTable[i] / factor.y + vTable[i] * 20)
        .attr('stroke', 'black')
        .attr('stroke-width', 1.8)
        .attr('marker-end', 'url(#arrow)')


    // Definir la forma de la flecha
    svg.append("defs").append("marker")
        .attr("id", "arrow")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 1)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto-start-reverse")
      .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "black");
  }

  return (
    <svg ref={svgRef} className='quiver' style={{width: `${width}`, height: `${height}`}}></svg>
  )
}
