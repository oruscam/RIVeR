import { FieldValues, FormProvider, useForm } from "react-hook-form";
import { useProjectSlice, useSectionSlice } from "../hooks";
import { Sections } from "./CrossSections";
import { SectionsHeader } from "./SectionsHeader"
import { FormResults } from "./Forms";
import { Section } from "../store/section/types";
import { useEffect } from "react";
import { useWizard } from "react-use-wizard";

const createInitialState = (sections: Section[]) => {
    let defaultValues = {};

    sections.forEach((section, index) => {
        if ( index !== 0){
            if( section.data ){
                const baseKey = section.name;
                const { alpha, num_stations } = section.data;
                defaultValues = {
                    ...defaultValues,
                    [`${baseKey}_ALPHA`]: alpha,
                    [`${baseKey}_STATIONS_NUMBER`]: num_stations,
                    [`${baseKey}_SHOW_VELOCITY_STD`]: ['on'],
                    [`${baseKey}_SHOW_95_PERCENTILE`]: ['on'],
                    [`${baseKey}_SHOW_INTERPOLATE_PROFILE`]: ['on'],
                };
            }
        }
    })  

    return defaultValues
}


export const Results = () => {
    const { sections, activeSection } = useSectionSlice();
    const methods = useForm({ defaultValues: createInitialState(sections) });
    const { onClickFinish } = useProjectSlice();

    const { nextStep } = useWizard();

    const onSubmit = ( data: FieldValues ) => {
        // Aca debo enviar la data y actualizar en sections! 
        console.log(data)
        
        onClickFinish(nextStep);
    }
    
    const onError = ( error ) => {
        console.log(error)
    }

    useEffect(() => {
        methods.reset(createInitialState(sections))
    }, [sections[activeSection]])


    return (
        <>
            <SectionsHeader title="Results"/>
            <Sections canEdit={false}/>
            <FormProvider {...methods}>
                {
                    sections.map((section, index: number) => {
                        if ( index === 0) return null;

                        return (
                            <FormResults key={section.name} index={index} onSubmit={methods.handleSubmit(onSubmit)}></FormResults>
                        )
                    })
                }
            </FormProvider>
        </>
  )
}
