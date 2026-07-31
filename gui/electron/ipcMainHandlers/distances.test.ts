import { getDistances } from './getDistances'; // Ajustá el nombre si tu archivo original se llama distinto
import { ipcMain } from 'electron';
import { utils } from 'xlsx';
import { validateFile } from './utils/validateFile';

// --- MOCKS ---
jest.mock('electron', () => {
  let registeredHandler: (event: any, args: any) => any;
  return {
    ipcMain: {
      handle: jest.fn((channel, handler) => {
        if (channel === 'import-distances') registeredHandler = handler;
      }),
      _triggerImportDistances: async (event: any, args: any) => {
        return registeredHandler(event, args);
      },
    },
    dialog: {
      showOpenDialog: jest.fn().mockResolvedValue({ filePaths: ['mocked/path.xlsx'] }),
    },
  };
});

jest.mock('xlsx', () => ({
  readFile: jest.fn(() => ({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } })),
  utils: { sheet_to_json: jest.fn() },
  set_fs: jest.fn(),
}));

jest.mock('fs', () => ({}));

// Ajustá esta ruta dependiendo de dónde esté validateFile respecto a tu test
jest.mock('./utils/validateFile', () => ({
  validateFile: jest.fn(),
  EXTENSIONS: ['xlsx', 'csv'],
}));

jest.mock('../main', () => ({
  PROJECT_CONFIG: { defaultFilesPath: '/default/path' },
}));

// --- SUITE DE PRUEBAS ---
describe('getDistances IPC Handler', () => {
  beforeAll(() => {
    // Apagamos los console.error de tu código para mantener la terminal limpia
    jest.spyOn(console, 'error').mockImplementation(() => {});
    //jest.spyOn(console, 'log').mockImplementation(() => { });
    getDistances();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  const triggerIPC = async (path: string | undefined = undefined) => {
    // @ts-expect-error — test-only helper added to the electron mock
    return await ipcMain._triggerImportDistances({}, { path });
  };

  describe('Validación de Issue: Parseo Inteligente y Formatos', () => {
    beforeEach(() => {
      (validateFile as jest.Mock).mockReturnValue(true);
    });

    // 1. REQUISITO: Formato de 1 columna
    it('debería parsear correctamente un formato de 1 columna (valores en orden exacto)', async () => {
      (utils.sheet_to_json as jest.Mock).mockReturnValue([[19.97], [36.84], [29.3], [19.73], [44.36], [27.14]]);
      const response = await triggerIPC('valid.xlsx');
      expect(response.distances).toEqual({
        d12: 19.97,
        d23: 36.84,
        d34: 29.3,
        d41: 19.73,
        d13: 44.36,
        d24: 27.14,
      });
    });

    // 2. REQUISITO: Formato de 2 columnas desordenadas y labels varios
    it('debería parsear formato de 2 columnas independientemente del orden y del formato del label', async () => {
      (utils.sheet_to_json as jest.Mock).mockReturnValue([
        ['d13', 44.36],
        ['D24', 27.14],
        ['12', 19.97],
        ['3-4', 29.3],
        ['2 3', 36.84],
        ['4;1', 19.73],
      ]);
      const response = await triggerIPC('valid.xlsx');
      expect(response.distances).toEqual({
        d12: 19.97,
        d23: 36.84,
        d34: 29.3,
        d41: 19.73,
        d13: 44.36,
        d24: 27.14,
      });
    });

    // 3. REQUISITO: Ignorar fila de Headers (máximo 7 filas)
    it('debería ignorar la primera fila si hay exactamente 7 filas en total (headers)', async () => {
      (utils.sheet_to_json as jest.Mock).mockReturnValue([
        ['Label', 'Value'], // Header
        ['d12', 10],
        ['d23', 20],
        ['d34', 30],
        ['d41', 40],
        ['d13', 50],
        ['d24', 60],
      ]);
      const response = await triggerIPC('valid.xlsx');
      expect(response.distances).toEqual({ d12: 10, d23: 20, d34: 30, d41: 40, d13: 50, d24: 60 });
    });

    // 4. REQUISITO: Límite estricto de filas
    it('debería arrojar error si el archivo tiene más de 7 filas', async () => {
      (utils.sheet_to_json as jest.Mock).mockReturnValue(new Array(8).fill([10]));
      const response = await triggerIPC('valid.xlsx');
      expect(response.error.message).toBe('invalidDistancesFileFormat');
    });

    // 5. REQUISITO: Valores no negativos
    it('debería arrojar error si contiene valores negativos', async () => {
      (utils.sheet_to_json as jest.Mock).mockReturnValue([[10], [-20], [30], [40], [50], [60]]);
      const response = await triggerIPC('valid.xlsx');
      expect(response.error.message).toBe('invalidDistancesNegativeValue');
    });

    // 6. REQUISITO: Error claro si falta una clave obligatoria (ej. un label que no se reconoce)
    it('debería arrojar error si faltan claves obligatorias o no reconoce un label', async () => {
      (utils.sheet_to_json as jest.Mock).mockReturnValue([
        ['d12', 10],
        ['d23', 20],
        ['d34', 30],
        ['d41', 40],
        ['d13', 50],
        ['XXX', 60],
      ]);
      const response = await triggerIPC('valid.xlsx');
      expect(response.error.message).toBe('invalidDistancesFileFormat');
    });

    // 7. EL PROBLEMA DE LAS FECHAS: Interpretar strings como "1-2"
    it('debería interpretar labels tipo "fecha" correctamente (requiere raw: true en producción)', async () => {
      (utils.sheet_to_json as jest.Mock).mockReturnValue([
        ['1-2', 19.97],
        ['2-3', 36.84],
        ['3-4', 29.3],
        ['4-1', 19.73],
        ['1-3', 44.36],
        ['2-4', 27.14],
      ]);
      const response = await triggerIPC('valid.xlsx');
      expect(response.distances).toEqual({
        d12: 19.97,
        d23: 36.84,
        d34: 29.3,
        d41: 19.73,
        d13: 44.36,
        d24: 27.14,
      });
    });

    // 8. EL FRONT INTELIGENTE (ESTE DEBERÍA FALLAR CON TU CÓDIGO VIEJO)
    it('debería convertir automáticamente las comas a puntos en los valores numéricos', async () => {
      (utils.sheet_to_json as jest.Mock).mockReturnValue([
        ['d12', '19,97'],
        ['d23', '36,84'],
        ['d34', '29,30'],
        ['d41', '19,73'],
        ['d13', '44,36'],
        ['d24', '27,14'],
      ]);
      const response = await triggerIPC('valid.xlsx');

      expect(response.error).toBeUndefined(); // Con el código viejo, esto va a fallar porque devuelve un error
      expect(response.distances).toEqual({
        d12: 19.97,
        d23: 36.84,
        d34: 29.3,
        d41: 19.73,
        d13: 44.36,
        d24: 27.14,
      });
    });
  });
});
