import { FieldValues } from "react-hook-form";

/**
 * Convierte los datos de entrada
 * {
    "CS_default_1_CS_LENGTH": "0",
    "CS_default_1_CS_BATHIMETRY": {
        "0": {}
    },
    "CS_default_1_LEFT_BANK" : "15"
    "CS_default_1_EAST_Left": "0",
    "CS_default_1_NORTH_Left": "0",
    "CS_default_1_EAST_Right": "0",
    "CS_default_1_NORTH_Right": "0",
    "CS_default_1_X_Left": 1342.8,
    "CS_default_1_Y_Left": 386.86,
    "CS_default_1_X_Right": 402,
    "CS_default_1_Y_Right": 403.47
}
    * en un objeto con la siguiente estructura:
    * {
        "CS_default_1": {
            "rw_length": 0,
            "bath": "/path/to/file",
            "left_station": 15
            "east_l": 0,
            "north_l": 0,
            "east_r": 0,
            "north_r": 0,
            "xl": 1342.8,
            "yl": 386.86,
            "xr": 402,
            "yr": 403.47
        }
    }
    * @param data Datos de entrada
    * @param csNames Nombres de las secciones
    * @returns result Objeto con los datos convertidos
*/

export function convertInputData(data: FieldValues, csNames: string[], bathsPath: string[]){
    const result: { [key: string]: any } = {};
    
    csNames.forEach((csName, index) => {
        result[csName] = {
            bath: bathsPath[index],
        }; // Inicializa cada CS en el resultado
    });
    
    Object.keys(data).forEach(key => {
        const match = key.match(/(CS_default_\d+)_(.+)/);
        if (match) {
            const csName = match[1];
            let fieldName = match[2].toLowerCase(); // Mantener en minúsculas para empezar
            
            // Mapeo de nombres de campo a los deseados
            const fieldMap = {
                "cs_length": "rw_length",
                "cs_bathimetry": "bath",
                "level": "level", // Asumiendo que "level" se mapea directamente
                "east_left": "east_l",
                "north_left": "north_l",
                "east_right": "east_r",
                "north_right": "north_r",
                "x_left": "xl",
                "y_left": "yl",
                "x_right": "xr",
                "y_right": "yr",
                "num_stations": "num_stations",
                "left_bank": "left_station",
                "alpha": "alpha"
            };
    
            fieldName = fieldMap[fieldName] || fieldName; // Usar el mapeo si está disponible
    
            // Casos especiales
            if (fieldName !== "bath") {
                /** Asigno los valores como numeros */
                const value = isNaN(Number(data[key])) ? data[key] : Number(data[key]);
                result[csName][fieldName] = value;
            } 
        }
    });
    
    return result;
}
