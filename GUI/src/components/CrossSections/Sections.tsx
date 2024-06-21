import { useEffect } from "react"
import { FieldValues, useForm } from "react-hook-form"
import { useUiSlice } from "../../hooks"

export const Sections = () => {
    const { register, handleSubmit } = useForm()
    const { onSetActiveSection, sections, activeSection, onAddSection, onDeleteSection, onChangeNameSection } = useUiSlice()


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
            onAddSection()
        }
        if ( event.currentTarget.id === "delete"){
            onDeleteSection()
        }
    }

    const handleDoubleClick = ( event: React.MouseEvent<HTMLInputElement> ) => {
        const inputElement = event.target as HTMLInputElement;
        inputElement.readOnly = false;
    }

    
    const handleInputSubmit = (data: FieldValues, index:number) => {
        const input = document.getElementById(`${sections[index].name}-input`) as HTMLInputElement
        if(input !== null){
            input.readOnly = true
        }
        const nextElement = document.getElementById(`${sections[index].name}-DRAW_LINE`)
        nextElement?.focus()
        onChangeNameSection(data[`${sections[index].name}-input`])
    }
        
    useEffect(() => {
        if(activeSection === 0){
            onSetActiveSection(1)
        }
        const element = document.getElementById("scroll-right")
        element?.scrollIntoView({behavior: "smooth"})
    }, [ , sections.length])
        

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
                                        <form onSubmit={handleSubmit((data) => handleInputSubmit(data, index))}>
                                            <input
                                                type="text" 
                                                className="input-section"
                                                defaultValue={section.name}
                                                id={`${section.name}-input`}
                                                {...register(`${section.name}-input`, { required: true })}
                                                readOnly
                                                onDoubleClick={handleDoubleClick}
                                            />
    
                                        </form>
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
