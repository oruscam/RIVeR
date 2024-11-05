
export const getUnit = ( sistem: string, field: string ) : string => {
    if (sistem === 'si') {
        switch (field) {
            case 'distance':
                
                return 'm';
            case 'area':
                return 'm²';
            case 'Vs':
                return 'm/s';
            case 'mean-v':
                return 'm/s';
            case 'Q':
                return 'm³/s';
            case 'average-vs':
                return 'm/s';
            case 'max-d':
                return 'm';
            case 'mean-d':
                return 'm';
            default:
                return '';
        }
    } else if (sistem === 'imperial') {
        switch (field) {
            case 'distance':
                return 'ft';
            case 'area':
                return 'ft²';
            case 'Vs':
                return 'ft/s';
            case 'mean-v':
                return 'ft/s';
            case 'Q':
                return 'ft³/s';
            case 'average-vs':
                return 'ft/s';
            case 'max-d':
                return 'ft';
            case 'mean-d':
                return 'ft';
            default:
                return '';
        }
    }
    return '';
}
