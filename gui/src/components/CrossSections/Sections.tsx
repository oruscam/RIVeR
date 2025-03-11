import React, { useEffect } from "react"
import {  useForm } from "react-hook-form"
import { useSectionSlice, useUiSlice } from "../../hooks"
import { isValidString } from "../../helpers/regex";
import { EyeBall } from "./index";

interface Sections {
    setDeletedSections?: React.Dispatch<React.SetStateAction<any>>;
    canEdit: boolean;
}

export const Sections = ({ setDeletedSections, canEdit }: Sections) => {
    const { register} = useForm()
    const { onSetActiveSection, sections, activeSection, onAddSection, onDeleteSection, onUpdateSection } = useSectionSlice()
    const { onSetErrorMessage } = useUiSlice()

    // Set the active section, and logic for scrolling to the next section
    const onClickSection = ( index: number ) => {
        if(index > activeSection){
            const section = document.getElementById(sections[index + 1]?.name)
            if(section === null){
                const element = document.getElementById("scroll-right")
                element?.scrollIntoView({behavior: "smooth"})
            }
            section?.scrollIntoView({behavior: "smooth"})
        }else{
            const section = document.getElementById(sections[index - 1]?.name)
            if ( section !== null){
                section?.scrollIntoView({behavior: "smooth"})
            }
        }
        onSetActiveSection(index)
    }

    const onClickButtonSection = ( event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        if (event.currentTarget.id === "add"){
            onAddSection(sections.length)
        }
        if ( event.currentTarget.id === "delete" && setDeletedSections){
            setDeletedSections(sections[activeSection].name)
            onDeleteSection()
        }
    }

    const handleDoubleClick = ( event: React.MouseEvent<HTMLInputElement> ) => {
        const inputElement = event.target as HTMLInputElement;
        inputElement.readOnly = false;
    }

    
    const handleInputNameSection = ( event: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>, index: number ) => {
        const inputElement = event.target as HTMLInputElement;
        if (((event as React.KeyboardEvent<HTMLInputElement>).key === "Enter" || event.type === "blur") && inputElement.readOnly === false){
            const input = event.currentTarget
            const value = input.value
            if( value === ""){
                input.value = sections[index].name
                input.readOnly = true
                onSetErrorMessage({
                    message: 'Section name can not be empty',
                })
            } else if( !isValidString(value) ){
                input.value = sections[index].name
                input.readOnly = true
                onSetErrorMessage({
                    message: 'Section name can only contain letters, numbers, and under scores',
                })
            } else if ( sections.map(section => section.name).includes(value) ){
                input.value = sections[index].name
                input.readOnly = true
                onSetErrorMessage({
                    message: 'Section name already exists',
                })
            } else {
                input.readOnly = true
                onUpdateSection({sectionName: value}, undefined)
            }
            input.readOnly = true
            const nextElement = document.getElementById(`${sections[index].name}-DRAW_LINE`)
            nextElement?.focus()    
        }       
    }

        
    useEffect(() => {
        const element = document.getElementById("scroll-right")
        element?.scrollIntoView({behavior: "smooth"})
    }, [sections.length])
        

  return (
    <div className="sections mt-2">
        <div className="sections-layer">
            <EyeBall/>  
            <span className="section"/>
                    {
                        sections.map((section, index: number) => {
                                return (
                                    <div key={index} 
                                         className={`section ${activeSection === ( index ) ? "active" : ""}`} 
                                         id={section.name} 
                                         onClick={() => onClickSection(index)}
                                         >

                                            <input
                                                type="text" 
                                                className="input-section"
                                                defaultValue={section.name}
                                                id={`${section.name}-input`}
                                                {...register(`${section.name}-input`, { required: true })}
                                                readOnly
                                                onDoubleClick={handleDoubleClick}
                                                onKeyDown={(event) => handleInputNameSection(event, index)}
                                                onBlur={(event) => handleInputNameSection(event, index)}
                                            />
    
                                        {
                                            canEdit && (
                                                <button 
                                                    className="section-button1" 
                                                    id="delete" 
                                                    onClick={onClickButtonSection}
                                                    disabled={!(activeSection === index ) || sections.length === 2}
                                                >x</button>
                                            )
                                        }
                                    </div>
                                )
                        })
                    }
            
            {
                canEdit && (<div className="section section-add">
                    <button className="section-button2"
                            id="add"
                            onClick={onClickButtonSection}
                            > + </button>
                </div>)
            }
            <span id="scroll-right"></span>
        </div>
    </div>
  )
}
