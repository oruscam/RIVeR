function parsedCameraSolution(data: string){
    const camera_solution = JSON.parse(data)

    return {
        orthoImagePath: camera_solution.ortho_image_path,
        orthoExtent: camera_solution.ortho_extent,
        cameraPosition: camera_solution.camera_position,
        reprojectionErrors: camera_solution.reprojection_errors,
        projectedPoints: camera_solution.projected_points,
        meanError: camera_solution.error,
        uncertaintyEllipses: camera_solution.uncertainty_ellipses,
        cameraMatrix: camera_solution.camera_matrix,
        numPoints: camera_solution.num_points,
        pointIndices: camera_solution.point_indices,
    }
}

export { parsedCameraSolution }