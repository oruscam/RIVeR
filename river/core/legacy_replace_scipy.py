# scipy.interpolate.interp1d
import numpy as np
def interp1d_extrapolate(x, y, new_x):
    # Interpolate for values within the range of x
    y_interp = np.interp(new_x, x, y)

    # Extrapolate for values outside the range of x
    slope_start = (y[1] - y[0]) / (x[1] - x[0])
    slope_end = (y[-1] - y[-2]) / (x[-1] - x[-2])
    y_interp[new_x < x[0]] = y[0] + slope_start * (new_x[new_x < x[0]] - x[0])
    y_interp[new_x > x[-1]] = y[-1] + slope_end * (new_x[new_x > x[-1]] - x[-1])

    return y_interp


# scipy.interpolate.griddata
def griddata(points, values, xi, method='linear'):
    from math import sqrt
    if method == 'linear':
        # For each point in xi, find the nearest points in 'points' and perform linear interpolation
        new_values = []
        for new_point in xi:
            distances = [sqrt((p[0]-new_point[0])**2 + (p[1]-new_point[1])**2) for p in points]
            # Get the indices of the two closest points
            idx1, idx2 = np.argsort(distances)[:2]
            # Linearly interpolate between these two points
            weight = distances[idx1] / (distances[idx1] + distances[idx2])
            new_value = weight * values[idx1] + (1 - weight) * values[idx2]
            new_values.append(new_value)
        return np.array(new_values)
    else:
        raise ValueError("Method not supported")

# scipy.interpolate.RectBivariateSpline
import numpy as np
def bilinear_interpolation(x, y, z, new_x, new_y):
    x_indices = np.searchsorted(x, new_x) - 1
    y_indices = np.searchsorted(y, new_y) - 1

    x1 = x[x_indices]
    x2 = x[x_indices + 1]
    y1 = y[y_indices]
    y2 = y[y_indices + 1]

    z11 = z[x_indices, y_indices]
    z12 = z[x_indices, y_indices + 1]
    z21 = z[x_indices + 1, y_indices]
    z22 = z[x_indices + 1, y_indices + 1]

    inter_z = (z11 * (x2 - new_x) * (y2 - new_y) +
               z21 * (new_x - x1) * (y2 - new_y) +
               z12 * (x2 - new_x) * (new_y - y1) +
               z22 * (new_x - x1) * (new_y - y1)) / ((x2 - x1) * (y2 - y1))

    return inter_z

# scipy.sparse.coo_matrix
import numpy as np
class SparseCOOMatrix:
    def __init__(self, rows, cols, data):
        self.rows = np.array(rows)
        self.cols = np.array(cols)
        self.data = np.array(data)

    def to_dense(self):
        max_row = self.rows.max() + 1
        max_col = self.cols.max() + 1
        dense_matrix = np.zeros((max_row, max_col))
        dense_matrix[self.rows, self.cols] = self.data
        return dense_matrix
