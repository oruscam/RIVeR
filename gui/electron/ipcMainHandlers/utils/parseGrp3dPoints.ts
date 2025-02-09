function parseGrp3dPoints(data: string) {
    let grp_3d_points = JSON.parse(data);

    const points = new Array(grp_3d_points.X.length + grp_3d_points.not_selected_X.length);

    grp_3d_points.X.forEach((_, index) => {
        const [label, originalIndex] = grp_3d_points.label[index];
        let wasEstablished = false
        let image = undefined
        if ( grp_3d_points.x[index] !== 0 && grp_3d_points.y[index] !== 0 ){
            wasEstablished = true
        }

        if (grp_3d_points.image[index] !== undefined){
            image = grp_3d_points.image[index]
        }

        points[originalIndex] = {
            X: grp_3d_points.X[index],
            Y: grp_3d_points.Y[index],
            Z: grp_3d_points.Z[index],
            x: grp_3d_points.x[index],
            y: grp_3d_points.y[index],
            image: image,
            label: label,
            selected: true,
            wasEstablished: wasEstablished
        };
    });

    grp_3d_points.not_selected_X.forEach((_, index) => {
        const [label, originalIndex] = grp_3d_points.not_selected_label[index];
        let wasEstablished = false
        if ( grp_3d_points.not_selected_x[index] !== 0 && grp_3d_points.not_selected_y[index] !== 0 ){
            wasEstablished = true
        }
        let image = undefined
        if (grp_3d_points.not_selected_image[index] !== null){
            image = grp_3d_points.image[index]
        }

        points[originalIndex] = {
            X: grp_3d_points.not_selected_X[index],
            Y: grp_3d_points.not_selected_Y[index],
            Z: grp_3d_points.not_selected_Z[index],
            x: grp_3d_points.not_selected_x[index],
            y: grp_3d_points.not_selected_y[index],
            image: image,
            label: label,
            selected: false,
            wasEstablished: wasEstablished
        };
    });

    return { 
        points,
        mode: grp_3d_points.solution
    };
}

export { parseGrp3dPoints }