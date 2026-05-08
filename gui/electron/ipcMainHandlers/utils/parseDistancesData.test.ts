import { smartParseFloat, normalizeDistanceKey, parseDistancesData } from './parseDistancesData';

const EXPECTED = { d12: 19.97, d23: 36.84, d34: 29.30, d41: 19.73, d13: 44.36, d24: 27.14 };                                                                                          
                                                                                                                                                                                    
// ─── smartParseFloat ──────────────────────────────────────────────────────────                                                                                                     
                
describe('smartParseFloat', () => {                                                                                                                                                   
it('passes through a number directly', () => {
    expect(smartParseFloat(19.97)).toBe(19.97);
});                                                                                                                                                                                 
it('parses a standard float string', () => {
    expect(smartParseFloat('19.97')).toBe(19.97);                                                                                                                                     
});           
it('parses a comma-decimal string (EU)', () => {                                                                                                                                    
    expect(smartParseFloat('19,97')).toBe(19.97);                                                                                                                                     
});
it('parses EU thousands + decimal: 1.234,56', () => {                                                                                                                               
    expect(smartParseFloat('1.234,56')).toBe(1234.56);                                                                                                                                
});
it('parses US thousands + decimal: 1,234.56', () => {                                                                                                                               
    expect(smartParseFloat('1,234.56')).toBe(1234.56);
});                                                                                                                                                                                 
it('parses an integer string', () => {
    expect(smartParseFloat('30')).toBe(30);                                                                                                                                           
});                                                                                                                                                                                 
it('returns NaN for a non-numeric string', () => {
    expect(smartParseFloat('abc')).toBeNaN();                                                                                                                                         
});           
it('returns NaN for an empty string', () => {                                                                                                                                       
    expect(smartParseFloat('')).toBeNaN();
});                                                                                                                                                                                 
it('returns NaN for null', () => {
    expect(smartParseFloat(null)).toBeNaN();
});                                                                                                                                                                                 
});
                                                                                                                                                                                    
// ─── normalizeDistanceKey ─────────────────────────────────────────────────────

describe('normalizeDistanceKey', () => {
it.each([
    ['d12', 'd12'], ['D12', 'd12'], ['12', 'd12'],                                                                                                                                    
    ['1-2', 'd12'], ['1_2', 'd12'], ['1 2', 'd12'],
    ['1,2', 'd12'], ['1;2', 'd12'],                                                                                                                                                   
])('normalizes "%s" → "%s"', (input, expected) => {
    expect(normalizeDistanceKey(input)).toBe(expected);                                                                                                                               
});           
                                                                                                                                                                                    
it.each([     
    ['d41', 'd41'], ['d14', 'd41'],
    ['4-1', 'd41'], ['1-4', 'd41'], ['4,1', 'd41'],                                                                                                                                   
])('handles d41 special case: "%s" → "d41"', (input) => {
    expect(normalizeDistanceKey(input)).toBe('d41');                                                                                                                                  
});                                                                                                                                                                                 
});                                                                                                                                                                                   
                                                                                                                                                                                    
// ─── parseDistancesData ───────────────────────────────────────────────────────

describe('parseDistancesData', () => {

describe('1-column format', () => {                                                                                                                                                 
    it('parses 6 numeric rows, no header', () => {
    const grid = [[19.97], [36.84], [29.30], [19.73], [44.36], [27.14]];                                                                                                            
    expect(parseDistancesData(grid)).toEqual(EXPECTED);                                                                                                                             
    });
                                                                                                                                                                                    
    it('parses 7 rows, first row is a string header', () => {                                                                                                                         
    const grid = [['distance'], [19.97], [36.84], [29.30], [19.73], [44.36], [27.14]];
    expect(parseDistancesData(grid)).toEqual(EXPECTED);                                                                                                                             
    });         
                                                                                                                                                                                    
    it('strips blank rows before counting', () => {                                                                                                                                   
    const grid = [[''], [19.97], [36.84], [29.30], [19.73], [44.36], [27.14]];
    expect(parseDistancesData(grid)).toEqual(EXPECTED);                                                                                                                             
    });         
});                                                                                                                                                                                 
                
describe('2-column format', () => {
    it('parses ordered rows with dXY labels', () => {
    const grid = [                                                                                                                                                                  
        ['d12', 19.97], ['d23', 36.84], ['d34', 29.30],
        ['d41', 19.73], ['d13', 44.36], ['d24', 27.14],                                                                                                                               
    ];        
    expect(parseDistancesData(grid)).toEqual(EXPECTED);                                                                                                                             
    });                                                                                                                                                                               

    it('parses shuffled rows', () => {                                                                                                                                                
    const grid = [
        ['d13', 44.36], ['d24', 27.14], ['d12', 19.97],
        ['d34', 29.30], ['d23', 36.84], ['d41', 19.73],                                                                                                                               
    ];
    expect(parseDistancesData(grid)).toEqual(EXPECTED);                                                                                                                             
    });                                                                                                                                                                               

    it('parses mixed label styles in any order', () => {                                                                                                                              
    const grid = [
        ['1;3', 44.36], ['2 4', 27.14], ['d12', 19.97],                                                                                                                               
        ['3-4', 29.30], ['2,3', 36.84], ['4_1', 19.73],                                                                                                                               
    ];                                                                                                                                                                              
    expect(parseDistancesData(grid)).toEqual(EXPECTED);                                                                                                                             
    });                                                                                                                                                                               
                
    it('parses comma-decimal values (regional format)', () => {                                                                                                                       
    const grid = [
        ['d12', '19,97'], ['d23', '36,84'], ['d34', '29,30'],                                                                                                                         
        ['d41', '19,73'], ['d13', '44,36'], ['d24', '27,14'],                                                                                                                         
    ];
    expect(parseDistancesData(grid)).toEqual(EXPECTED);                                                                                                                             
    });                                                                                                                                                                               

    it('ignores header row when 7 rows present', () => {                                                                                                                              
    const grid = [
        ['Label', 'Value'],                                                                                                                                                           
        ['d12', 19.97], ['d23', 36.84], ['d34', 29.30],
        ['d41', 19.73], ['d13', 44.36], ['d24', 27.14],                                                                                                                               
    ];                                                                                                                                                                              
    expect(parseDistancesData(grid)).toEqual(EXPECTED);
    });
    it('handles XLSX date serials produced when "1-2" labels are auto-converted by Excel', () => {
    const grid = [                                                                                                                                                                      
      [46054, '19.97'], // 46054 = Feb 1 → month=2, day=1 → "2-1" → d12
      [46083, '36.84'], // → d23                                                                                                                                                        
      [46115, '29.30'], // → d34                                                                                                                                                      
      [46026, '19.73'], // → d41                                                                                                                                                        
      [46082, '44.36'], // → d13                                                                                                                                                        
      [46114, '27.14'], // → d24                                                                                                                                                        
    ];                                                                                                                                                                                
    expect(parseDistancesData(grid)).toEqual(EXPECTED);                                                                                                                                 
    });                                                                                                                                                                                    
});           

describe('error cases', () => {
    it('throws invalidDistancesFileFormat for more than 7 rows', () => {
    const grid = new Array(8).fill([10]);                                                                                                                                           
    expect(() => parseDistancesData(grid)).toThrow('invalidDistancesFileFormat');                                                                                                   
    });                                                                                                                                                                               
                                                                                                                                                                                    
    it('throws invalidDistancesFileFormat for fewer than 6 data rows', () => {
    const grid = [[10], [20], [30], [40], [50]];
    expect(() => parseDistancesData(grid)).toThrow('invalidDistancesFileFormat');                                                                                                   
    });
                                                                                                                                                                                    
    it('throws invalidDistancesNegativeValue for a negative number', () => {                                                                                                          
    const grid = [[-1], [20], [30], [40], [50], [60]];
    expect(() => parseDistancesData(grid)).toThrow('invalidDistancesNegativeValue');                                                                                                
    });         
                                                                                                                                                                                    
    it('throws invalidDistancesFileFormat when a required key is missing', () => {                                                                                                    
    const grid = [
        ['d12', 10], ['d23', 20], ['d34', 30],                                                                                                                                        
        ['d41', 40], ['d13', 50], ['XXX', 60],                                                                                                                                        
    ];
    expect(() => parseDistancesData(grid)).toThrow('invalidDistancesFileFormat');                                                                                                   
    });                                                                                                                                                                               

    it('throws invalidDistancesFileFormat for an unrecognizable value in 2-col', () => {
    const grid = [['d12', 'notanumber'], ['d23', 20], ['d34', 30], ['d41', 40], ['d13', 50], ['d24', 60]];
    expect(() => parseDistancesData(grid)).toThrow('invalidDistancesFileFormat');
    });                                                                                                                                                                               
});                                                                                                                                                                                 
});          