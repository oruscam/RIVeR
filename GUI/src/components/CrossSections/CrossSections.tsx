import { FormCrossSections } from "../Forms"
import { FieldValues, FormProvider, useForm} from "react-hook-form"
import { Sections } from "./Sections"
import './crossSections.css'
import { useDataSlice, useUiSlice } from "../../hooks"
import { EyeBall } from "./EyeBall"
import { useWizard } from "react-use-wizard"
import { useEffect, useState } from "react"

export const CrossSections = () => {
    const { sections, activeSection, onSetSections }= useDataSlice() // Wrap the sections variable inside an array
    const { onSetErrorMessage } = useUiSlice();
    const [ deletedSections, setDeletedSections] = useState('')
    const methods = useForm()
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
        // PROVISIONAL
        onSetSections(data)
        // nextStep()
    }

    const onError = ( errors: any ) => {
        onSetErrorMessage(errors)
    }

    useEffect(() => {
        if( deletedSections !== '' ){
            unregisterFieldsStartingWith(deletedSections)
        }
        setDeletedSections('')

    }, [deletedSections])

    return (
        <>
            <div className="cross-section-header">        
                <EyeBall></EyeBall>              
                <h2 className="cross-sections-title"> Cross Sections </h2>
                <span></span>
            </div>
            <Sections setDeletedSections={setDeletedSections} deletedSections={deletedSections}></Sections>
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
