import { FormCrossSections } from "../Forms"
import { FieldValues, FormProvider, useForm} from "react-hook-form"
import { Sections } from "./Sections"
import './crossSections.css'
import { useUiSlice } from "../../hooks"
import { useState } from "react"
import { EyeBall } from "./EyeBall"

export const CrossSections = () => {
    const {sections, activeSection, onSetSeeAll, seeAll}= useUiSlice() // Wrap the sections variable inside an array
    const methods = useForm()
    const [lidClass, setLidClass] = useState('');
    const [pupilClass, setPupilClass] = useState('');

    const handleOnClickSeeAll = () => {
        if (lidClass === 'lid--open') {
            setLidClass('lid--close');
            setPupilClass('pupil--close');
          } else if (lidClass === 'lid--close') {
            setLidClass('lid--open');
            setPupilClass('pupil--open');
          } else {
            setLidClass('lid--close');
            setPupilClass('pupil--close');
          }
        onSetSeeAll()
    }

    const onSubmit = ( data: FieldValues ) => {
        console.log("On Submit")
        // PROVISIONAL
        Object.entries(data).forEach(([key, value]) => {
            for (const section of sections){
                if( key.includes(section.name)){
                    console.log(key, ':', value)
                }
            }
        })
    }

    return (
        <>
            <div className="cross-section-header">        
                <EyeBall></EyeBall>              
                <h2 className="cross-sections-title"> Cross Sections</h2>
                <span></span>
            </div>
            <Sections></Sections>
            <FormProvider {...methods}>
            {
                sections.map((section, index: number) => {
                    if (activeSection === (index) && index >= 1) {
                        return (
                            <FormCrossSections key={section.name} display={true} onSubmit={methods.handleSubmit(onSubmit)} name={section.name}/>
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
