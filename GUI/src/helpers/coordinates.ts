interface Points {
    x: number;
    y: number;
}

// * Calculate and return the Euclidean distance between two points.

function getDistanceBetweenPoints(points: Points[]): number {
    if (points.length === 2) {
        return Number(Math.sqrt(Math.pow(points[1].x - points[0].x, 2) + Math.pow(points[1].y - points[0].y, 2)).toFixed(4));
    }
    return 0;
}


// * Compute the pixel size based on the real world coordinates and the pixel coordinates.
// * Return the size of a pixel in the real world units.

function computePixelSize(pixelPoints: Points[], rwPoints: Points[]): number {
    const pixelDistance = getDistanceBetweenPoints(pixelPoints);
    const rwDistance = getDistanceBetweenPoints(rwPoints);

    return Number((rwDistance / pixelDistance).toFixed(4));
}



// * SOLO PARA EL JSON. PROVISIONAL

function pixel_to_real_world(x_pix, y_pix, transformation_matrix) {
    // Crear el vector de píxeles
    const pixel_vector = [x_pix, y_pix, 1];
  
    // Realizar la multiplicación de la matriz por el vector
    let real_world_vector = [0, 0, 0];
    for (let i = 0; i < transformation_matrix.length; i++) {
      for (let j = 0; j < pixel_vector.length; j++) {
        real_world_vector[i] += transformation_matrix[i][j] * pixel_vector[j];
      }
    }
  
    // Retornar las primeras dos coordenadas
    return real_world_vector.slice(0, 2);
  }


  function invertMatrix(matrix: number[][]): number[][] {
    // Esta es una implementación simplificada y solo funciona correctamente para matrices 3x3.
    // Para matrices de mayor tamaño o uso más general, considera usar una biblioteca matemática.
    const det = matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[2][1] * matrix[1][2]) -
                matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) +
                matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]);
  
    const invDet = 1 / det;
  
    return [
      [
        invDet * (matrix[1][1] * matrix[2][2] - matrix[2][1] * matrix[1][2]),
        invDet * (matrix[0][2] * matrix[2][1] - matrix[0][1] * matrix[2][2]),
        invDet * (matrix[0][1] * matrix[1][2] - matrix[0][2] * matrix[1][1])
      ],
      [
        invDet * (matrix[1][2] * matrix[2][0] - matrix[1][0] * matrix[2][2]),
        invDet * (matrix[0][0] * matrix[2][2] - matrix[0][2] * matrix[2][0]),
        invDet * (matrix[1][0] * matrix[0][2] - matrix[0][0] * matrix[1][2])
      ],
      [
        invDet * (matrix[1][0] * matrix[2][1] - matrix[2][0] * matrix[1][1]),
        invDet * (matrix[2][0] * matrix[0][1] - matrix[0][0] * matrix[2][1]),
        invDet * (matrix[0][0] * matrix[1][1] - matrix[1][0] * matrix[0][1])
      ]
    ];
  }
  
  function real_world_to_pixel(x_rw: number, y_rw: number, transformation_matrix: number[][]): number[] {
    const inv_transformation_matrix = invertMatrix(transformation_matrix);
    const real_world_vector = [x_rw, y_rw, 1];
  
    let pixel_vector = [0, 0, 0];
    for (let i = 0; i < inv_transformation_matrix.length; i++) {
      for (let j = 0; j < real_world_vector.length; j++) {
        pixel_vector[i] += inv_transformation_matrix[i][j] * real_world_vector[j];
      }
    }
  
    return pixel_vector.slice(0, 2);
  }





export { getDistanceBetweenPoints, computePixelSize, pixel_to_real_world, real_world_to_pixel }