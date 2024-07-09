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
          validate: (value: string | boolean) => {
            let currentValue;
            if (typeof value !== 'string') return false
            currentValue = parseFloat(value)
      
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
            validate: (value : string | boolean) => {
              const start = parseFloat(getValues('start'))
              let currentValue;
              
              if (typeof value !== 'string') return false
                
              currentValue = parseFloat(value)
      
              if( currentValue > parseFloat(duration)){
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
