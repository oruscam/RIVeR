import { ProjectConfig } from "../interfaces";

async function saveProjectMetadata(
    projectDetails: {
        riverName: string;
        site: string;
    },
    json: any,
    meditionDate: string
){    
    const { site, riverName } = projectDetails;
    
    // SET DEFAULT VALUES
    const INSTRUMENT_TYPE = 'LSPIV';
    const OBSERVATION_TYPE = 'discharge';
    const DATA_QUALITY = 'provisional';
    const LICENSE = "CC-BY 4.0"

    // Read the existing settings file

    // Obtain the creation_date and video info from the settings file
    const { video } = json;

    // aux  
    let aux = toCompactDateTime(meditionDate);



    // Create identifier
    const identifier = `${riverName.toLowerCase()}-${site.toLowerCase()}-${OBSERVATION_TYPE}-${aux}`;

    // Create start and end dates

    const startDate = parseStringDateToUTC(aux);
    const duration = video.total_length || 0
    const endDate = new Date(startDate.getTime() + duration * 1000); 

    // Get system time zone and offset 
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offsetMinutes = startDate.getTimezoneOffset(); // e.g., 180 = 3h behind UTC
    const sign = offsetMinutes > 0 ? '-' : '+';
    const offsetHours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, '0');
    const offsetStr = `${sign}${offsetHours}:00`;  // e.g., "-03:00"

    // Create metadata object
    const temporal = {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        local_timestamp: startDate.toLocaleString(),
        time_zone: timeZone,
        utc_offset: offsetStr,
    }

    // Append metadata to the JSON object
    json.metadata = {
        identifier: identifier,
        temporal: temporal,
        instrument_type: INSTRUMENT_TYPE,
        observation_type: OBSERVATION_TYPE,
        data_quality: DATA_QUALITY,
        license: LICENSE,
    }
}

function toCompactDateTime( str: string){
    // str: 25/01/2022 12:00
    const [date, time] = str.split(' ');
    const [day, month, year] = date.split('/');
    const [hour, minute] = time.split(':');

    return `${year}${month}${day}T${hour}${minute}`;
}

// Function to parse a date string in the format YYYYMMDDTHHMM to a UTC Date object
function parseStringDateToUTC(dateString: string): Date {
    // Parse creation_date string (format: YYYYMMDDTHHMM)
    const year = parseInt(dateString.slice(0, 4), 10);
    const month = parseInt(dateString.slice(4, 6), 10) - 1; // JS months are 0-based
    const day = parseInt(dateString.slice(6, 8), 10);
    const hour = parseInt(dateString.slice(9, 11), 10);
    const minute = parseInt(dateString.slice(11, 13), 10);
    return new Date(Date.UTC(year, month, day, hour, minute, 0));
}   

export { saveProjectMetadata };