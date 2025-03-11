import { FieldValues, FormProvider, useForm } from "react-hook-form";
import { useDataSlice, useSectionSlice, useUiSlice } from "../hooks";
import { Sections } from "./CrossSections";
import { SectionsHeader } from "./SectionsHeader"
import { FormResults } from "./Forms";
import { Section } from "../store/section/types";
import { useEffect } from "react";
import { useWizard } from "react-use-wizard";
import { useTranslation } from "react-i18next";

const createInitialState = (sections: Section[]) => {
    let defaultValues = {};

    sections.forEach((section, index) => {
            if( section.data ){
                const baseKey = section.name;
                const { alpha, numStations, interpolated, artificialSeeding } = section;
                const { showPercentile, showVelocityStd } = section.data;
                defaultValues = {
                    ...defaultValues,
                    [`${baseKey}_ALPHA`]: alpha,
                    [`${baseKey}_STATIONS_NUMBER`]: numStations,
                    [`${baseKey}_SHOW_VELOCITY_STD`]: showVelocityStd ? ['on'] : ['off'],
                    [`${baseKey}_SHOW_PERCENTILE`]: showPercentile ? ['on'] : ['off'],
                    [`${baseKey}_INTERPOLATED_PROFILE`]: interpolated ? ['on'] : ['off'],
                    [`${baseKey}_ARTIFICIAL_SEEDING`]: artificialSeeding,
                };
            }
    })  

    return defaultValues
}

export const Results = () => {
    const { sections, activeSection } = useSectionSlice();
    const methods = useForm({ defaultValues: createInitialState(sections) });
    const { t } = useTranslation();
    const { isBackendWorking, onGetResultData } = useDataSlice();
    const { onSetErrorMessage } = useUiSlice();

    const { nextStep } = useWizard();

    const onSubmit = ( _data: FieldValues ) => {
        nextStep();
    }

    const handleOnClickApplyChanges = () => {
        onGetResultData('single').catch( error => onSetErrorMessage(error.message) );
    }
    
    useEffect(() => {
        methods.reset(createInitialState(sections))
    }, [sections[activeSection]])

    return (
        <>
            <SectionsHeader title={t('Results.title')}/>
            <Sections canEdit={false}/>
            <FormProvider {...methods}>
                {
                    sections.map((section, index: number) => {

                        return (
                            <FormResults key={section.name} index={index} onSubmit={methods.handleSubmit(onSubmit)}></FormResults>
                        )
                    })
                }
            </FormProvider>
            <button 
                className={`wizard-button form-button mt-1 ${isBackendWorking ? 'wizard-button-active' : ''}`}
                onClick={handleOnClickApplyChanges}
                id="apply-changes"
                type="button"
                > {t('Results.applyChanges')}
            </button>
        </>
  )
}
