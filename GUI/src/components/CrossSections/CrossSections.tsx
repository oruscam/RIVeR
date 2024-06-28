import { FormCrossSections } from "../Forms"
import { FieldValues, FormProvider, useForm} from "react-hook-form"
import { Sections } from "./Sections"
import './crossSections.css'
import { useDataSlice } from "../../hooks"
import { EyeBall } from "./EyeBall"

export const CrossSections = ({ factor } : {x: number, y: number}) => {
    const { sections, activeSection }= useDataSlice() // Wrap the sections variable inside an array
    const methods = useForm()


    const onSubmit = ( data: FieldValues ) => {
        console.log("On Submit")
        // PROVISIONAL
        console.log(data)
    }


    return (
        <>
            <div className="cross-section-header">        
                <EyeBall></EyeBall>              
                <h2 className="cross-sections-title"> Cross Sections </h2>
                <span></span>
            </div>
            <Sections></Sections>
            <FormProvider {...methods}>
            {
                sections.map((section, index: number) => {
                    if (activeSection === (index) && index >= 1) {
                        return (
                            <FormCrossSections key={section.name} onSubmit={methods.handleSubmit(onSubmit)} name={section.name} factor={factor}/>
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
