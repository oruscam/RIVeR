type TFunction = (key: string) => string;
type GetValuesFunction = (field: string) => any;

interface ValidationRules {
  [key: string]: {
    required?: string;
    pattern?: {
      value: RegExp;
      message: string;
    };
    validate?: (value: string) => string | boolean;
  };
}


export const getValidationRules = (t: TFunction, getValues: GetValuesFunction, duration: number): ValidationRules => {
    const rules = {
        start : {
            required: t("Step3.Errors.required"),
            pattern: {
            value: /^-?[0-9]+(\.[0-9]+)?$/,
            message: t("Step3.Errors.formatInput")
          },
          validate: (value: string | number) => {
            const currentValue = typeof value === 'string' ? parseFloat(value) : value
      
            if ( currentValue < 0){
              return t('Step3.Errors.start1')
            }
            return true
            }
          },
          end: {
            required: t("Step3.Errors.required"),
            pattern: {
              value: /^-?[0-9]+(\.[0-9]+)?$/,
              message: t("Step3.Errors.formatInput")
            },
            validate: (value : string | number) => {
              const start = parseFloat(getValues('start'))
                            
              const currentValue = typeof value === 'string' ? parseFloat(value) : value
      
              if( currentValue > duration){
                return t("Step3.Errors.end1")
              }
  
              if (currentValue <= 0){
                return t("Step3.Errors.end2")
              }
              if ( currentValue <= start){
                return t("Step3.Errors.end3")
              }
              return true
            }
          },
          step: {
            required: t("Step3.Errors.required"),
            pattern: {
              value: /^[1-9]\d*$/,
              message: t("Step3.Errors.step")
            }
          }
    }
    
    return rules
  }
