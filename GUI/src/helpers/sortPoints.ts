function sortPointsByX(points: { x: number; y: number }[]): { x: number; y: number }[] {
    if (points.length !== 2) {
      console.error("La función espera un array de exactamente 2 puntos.");
      return points;
    }
  
    if (points[0].x > points[1].x) {
      // Si el primer punto está más a la derecha que el segundo, intercambiarlos
      return [points[1], points[0]];
    }
  
    // Si el primer punto ya está más a la izquierda, retornar el array sin cambios
    return points;
  }


export default sortPointsByX;