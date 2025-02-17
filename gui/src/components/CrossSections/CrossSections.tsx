import { FormCrossSections } from "../Forms"
import { FieldValues, FormProvider, useForm} from "react-hook-form"
import { Sections } from "./Sections"
import './crossSections.css'
import { useDataSlice, useProjectSlice, useSectionSlice, useUiSlice } from "../../hooks"
import { useWizard } from "react-use-wizard"
import { useEffect, useState } from "react"
import { Section } from "../../store/section/types"
import { SectionsHeader } from "../SectionsHeader"
import { ButtonLock } from "../ButtonLock"
import { useTranslation } from "react-i18next"
import { formatNumberTo2Decimals } from "../../helpers"



const createInitialState = (sections: Section[]) => {
    let defaultValues = {};
  
    sections.forEach((section, index) => {
        if ( index !== 0){
            const {name, dirPoints, rwPoints, bathimetry, numStations, alpha} = section
            const baseKey = name;
            defaultValues = {
                ...defaultValues,
                [`${baseKey}_CS_LENGTH`]: formatNumberTo2Decimals(bathimetry.width),
                [`${baseKey}_CS_BATHIMETRY`]: bathimetry.path,
                [`${baseKey}_LEVEL`]: bathimetry.level,
                [`${baseKey}_LEFT_BANK`]: bathimetry.leftBank,
                [`${baseKey}_EAST_Left`]: rwPoints[0].x.toFixed(2),
                [`${baseKey}_NORTH_Left`]: rwPoints[0].y.toFixed(2),
                [`${baseKey}_EAST_Right`]: rwPoints[1].x.toFixed(2),
                [`${baseKey}_NORTH_Right`]: rwPoints[1].y.toFixed(2),
                [`${baseKey}_X_Left`]: dirPoints.length === 0 ? 0 : dirPoints[0].x.toFixed(1),
                [`${baseKey}_Y_Left`]: dirPoints.length === 0 ? 0 : dirPoints[0].y.toFixed(1),
                [`${baseKey}_X_Right`]: dirPoints.length === 0 ? 0 : dirPoints[1].x.toFixed(1),
                [`${baseKey}_Y_Right`]: dirPoints.length === 0 ? 0 : dirPoints[1].y.toFixed(1),
                [`${baseKey}_NUM_STATIONS`]: numStations,
                [`${baseKey}_ALPHA`]: alpha,
            };

        }
    });
  
    return defaultValues;
  };

export const CrossSections = () => {
    const { sections, activeSection, onSetSections }= useSectionSlice() // Wrap the sections variable inside an array
    const { onSetErrorMessage } = useUiSlice();
    const [ deletedSections, setDeletedSections] = useState('')
    const methods = useForm({defaultValues: createInitialState(sections)})
    const { nextStep } = useWizard()
    const { t } = useTranslation()
    const { type } = useProjectSlice()

    const { images } = useDataSlice()

    const unregisterFieldsStartingWith = (prefix: string) => {
        const allValues = methods.getValues(); // Obtiene todos los campos registrados y sus valores
        const fieldNames = Object.keys(allValues); // Obtiene los nombres de todos los campos
    
        // Filtra los nombres de los campos que comienzan con el prefijo deseado
        const fieldsToUnregister = fieldNames.filter(fieldName => fieldName.startsWith(prefix));
    
        // Desregistra cada campo que coincide
        fieldsToUnregister.forEach(fieldName => methods.unregister(fieldName));
      };

    const onSubmit = ( data: FieldValues ) => {
        if ( images.paths.length === 0 ){
            onSetErrorMessage('We are wating for the frames to be loaded')
            return 
        }
        onSetSections(data, type)
        nextStep()
    }

    const onError = ( errors: any ) => {
        console.log(errors)
        onSetErrorMessage(errors)
    }

    // * Desregistra las secciones eliminadas
    useEffect(() => {
        if( deletedSections !== '' ){
            unregisterFieldsStartingWith(deletedSections)
        }
        setDeletedSections('')

    }, [deletedSections])

    // * Actualiza el formulario
    
    useEffect(() => {
        methods.reset(createInitialState(sections))
    }, [sections[activeSection]])


    return (
        <>
            <SectionsHeader title={t('CrossSections.title')}/>
            <Sections setDeletedSections={setDeletedSections} canEdit={true}/>
            <FormProvider {...methods}>
            {
                sections.map((section, index: number) => {
                    if ( index === 0 ) return null
                     
                    return (
                        <FormCrossSections key={section.name} onSubmit={methods.handleSubmit(onSubmit, onError)} name={section.name} index={index}/>
                    )

                })
            }
            </FormProvider>
            <ButtonLock disabled={sections[activeSection].bathimetry.width === undefined} footerElementID="form-cross-section-footer" headerElementID="form-cross-section-header"/>
        </>
    )
}