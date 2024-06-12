import numpy as np
from scipy.optimize import minimize


def dist2coord(d12, d23, d34, d41, d13, d24):
    # distances
    distances = np.array([d12, d23, d34, d41, d13, d24])
    # fixed points
    p1 = np.array([0, 0])
    p2 = np.array([d12, 0])

    def error_function(coords):
        p3, p4 = coords.reshape(2, 2)
        calculated_distances = np.array([
            np.linalg.norm(p2 - p1),
            np.linalg.norm(p3 - p2),
            np.linalg.norm(p4 - p3),
            np.linalg.norm(p1 - p4),
            np.linalg.norm(p3 - p1),
            np.linalg.norm(p4 - p2)
        ])
        return np.sum((calculated_distances - distances) ** 2)

    # initial guess for points 3 and 4
    initial_coords = np.array([[d13, 0], [d41, 0]])

    # perform optimization
    result = minimize(error_function, initial_coords.flatten(), method='BFGS')

    # extract optimized coordinates
    optimized_coords = result.x.reshape(2, 2)
    p3, p4 = optimized_coords

    return p1, p2, p3, p4
