import { FormCrossSections } from "../Forms"
import { FieldValues, FormProvider, useForm} from "react-hook-form"
import { Sections } from "./Sections"
import './crossSections.css'
import { useSectionSlice, useUiSlice } from "../../hooks"
import { EyeBall } from "./EyeBall"
import { useWizard } from "react-use-wizard"
import { useEffect, useState } from "react"


interface Section {
    name: string;
    drawLine: boolean;
    points: Point[];
    bathimetry: Bathimetry
    pixelSize: PixelSize
    realWorld: Point[];
}

const createInitialState = (sections: Section[]) => {
    let defaultValues = {};
  
    sections.forEach((section) => {
        if ( section.name !== 'pixel_size'){
            const {name, points, realWorld, pixelSize, bathimetry} = section
            const baseKey = name;
            defaultValues = {
                ...defaultValues,
                [`${baseKey}_CS_LENGTH`]: pixelSize.rw_length,
                [`${baseKey}_CS_BATHIMETRY`]: { "blob": bathimetry.blob, "path": bathimetry.path, "name": bathimetry.name},
                [`${baseKey}_LEVEL`]: bathimetry.level,
                [`${baseKey}_EAST_Left`]: realWorld[0].x.toFixed(2),
                [`${baseKey}_NORTH_Left`]: realWorld[0].y.toFixed(2),
                [`${baseKey}_EAST_Right`]: realWorld[1].x.toFixed(2),
                [`${baseKey}_NORTH_Right`]: realWorld[1].y.toFixed(2),
                [`${baseKey}_X_Left`]: points.length === 0 ? 0 : points[0].x.toFixed(1),
                [`${baseKey}_Y_Left`]: points.length === 0 ? 0 : points[0].y.toFixed(1),
                [`${baseKey}_X_Right`]: points.length === 0 ? 0 : points[1].x.toFixed(1),
                [`${baseKey}_Y_Right`]: points.length === 0 ? 0 : points[1].y.toFixed(1),
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


    const unregisterFieldsStartingWith = (prefix: string) => {
        const allValues = methods.getValues(); // Obtiene todos los campos registrados y sus valores
        const fieldNames = Object.keys(allValues); // Obtiene los nombres de todos los campos
    
        // Filtra los nombres de los campos que comienzan con el prefijo deseado
        const fieldsToUnregister = fieldNames.filter(fieldName => fieldName.startsWith(prefix));
    
        // Desregistra cada campo que coincide
        fieldsToUnregister.forEach(fieldName => methods.unregister(fieldName));
      };

    const onSubmit = ( data: FieldValues ) => {
        onSetSections(data)
        nextStep()
    }

    const onError = ( errors: any ) => {
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
            <div className="cross-section-header">        
                <EyeBall></EyeBall>              
                <h2 className="cross-sections-title"> Cross Sections </h2>
                <span></span>
            </div>
            <Sections setDeletedSections={setDeletedSections} canEdit={true} ></Sections>
            <FormProvider {...methods}>
            {
                sections.map((section, index: number) => {
                    if (activeSection === (index) && index >= 1) {
                        return (
                            <FormCrossSections key={section.name} onSubmit={methods.handleSubmit(onSubmit, onError)} name={section.name}/>
                        )
                    } else {
                        return null;
                    }
                })
            }
            </FormProvider>
        </>
    )
}
