import React, { useEffect } from "react"
import {  useForm } from "react-hook-form"
import { useDataSlice } from "../../hooks"

export const Sections = ({ setDeletedSections }: { setDeletedSections: React.Dispatch<React.SetStateAction<any>> }) => {
    const { register} = useForm()
    const { onSetActiveSection, sections, activeSection, onAddSection, onDeleteSection, onUpdateSection } = useDataSlice()
    const [sectionNumber, setSectionNumber] = React.useState(2)

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
        if( index !== 0){
            onSetActiveSection(index)
        }
    }

    const onClickButtonSection = ( event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        if (event.currentTarget.id === "add"){
            onAddSection(sectionNumber)
            setSectionNumber(sectionNumber + 1)
        }
        if ( event.currentTarget.id === "delete"){
            setDeletedSections(sections[activeSection].name)
            onDeleteSection()
        }
    }

    const handleDoubleClick = ( event: React.MouseEvent<HTMLInputElement> ) => {
        const inputElement = event.target as HTMLInputElement;
        inputElement.readOnly = false;
    }

    
    const handleInputNameSection = ( event: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>, index: number ) => {
        if ((event as React.KeyboardEvent<HTMLInputElement>).key === "Enter" || event.type === "blur"){
            const input = event.currentTarget
            const value = input.value
            if( value === "" ){
                input.value = sections[index].name
                input.readOnly = true
            }else if ( value !== sections[index].name ){
                input.readOnly = true
                onUpdateSection({sectionName: value})
            }
    
            const nextElement = document.getElementById(`${sections[index].name}-DRAW_LINE`)
            nextElement?.focus()
                    
        }       
    }

        
    useEffect(() => {
        if(activeSection === 0){
            onSetActiveSection(1)
        }
        const element = document.getElementById("scroll-right")
        element?.scrollIntoView({behavior: "smooth"})
    }, [sections.length])
        

  return (
    <div className="sections">
        <div className="sections-layer">
            <span className="section"/>
                    {
                        sections.map((section, index: number) => {
                            if (index >= 1){
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
    

                                        <button 
                                            className="section-button1" 
                                            id="delete" 
                                            onClick={onClickButtonSection}
                                            disabled={!(activeSection === index ) || sections.length === 2}
                                        >x</button>
                                    </div>
                                )
                            }
                        })
                    }
            
            <div className="section section-add">
                <button className="section-button2"
                        id="add"
                        onClick={onClickButtonSection}
                        > + </button>
                {/* <p> Add New </p> */}
            </div>
            <span id="scroll-right"></span>
        </div>
    </div>
  )
}
