import { UNITS } from "../constants/constants";

export const getUnit = ( sistem: string, field: string ) : string => {
    if (sistem === 'si') {
        switch (field) {
            case 'longitude':
                return UNITS.SI.LONGITUDE;
            case 'area':
                return UNITS.SI.AREA;
            case 'velocity':
                return UNITS.SI.VELOCITY;
            case 'flow':
                return UNITS.SI.FLOW;
            default: 
                return '';
        }
    } else if (sistem === 'imperial') {
        switch (field) {
            case 'longitude':
                return UNITS.IMPERIAL.LONGITUDE;
            case 'area':
                return UNITS.IMPERIAL.AREA;
            case 'velocity':
                return UNITS.IMPERIAL.VELOCITY;
            case 'flow':
                return UNITS.IMPERIAL.FLOW;
            default: 
                return '';
        }
    }
    return '';
}
