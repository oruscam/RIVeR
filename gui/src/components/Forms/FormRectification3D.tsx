import { useMatrixSlice, useUiSlice } from "../../hooks"
import { IpcamGrid } from "../index";
import { PointsMap } from "../Graphs/index";
import { useState } from "react";

export const FormRectification3D = () => {
    const [ mode, setMode ] = useState('')
    const { onGetPoints, onGetImages, onGetCameraSolution, ipcam, onChangeHemisphere } = useMatrixSlice();
    const { onSetErrorMessage } = useUiSlice();

    const { cameraSolution, isCalculating, hemisphere } = ipcam

    console.log('camera solution', cameraSolution)

    const handleOnClickImport = async ( event: React.MouseEvent<HTMLButtonElement> ) => {
        const id = (event.target as HTMLButtonElement).id;
        if ( id === 'import-points'){
            onGetPoints();
        } else {
            onGetImages(undefined).catch( error => onSetErrorMessage(error.message) );
        }
    }
        
    const handleOnClickAction = ( event: React.MouseEvent<HTMLButtonElement> ) => {
        const id = (event.target as HTMLButtonElement).id;
        setMode(id);
        onGetCameraSolution(id).catch( error => {
            onSetErrorMessage(error.message)
        }).finally(() => {
            setMode('')
        })
    }

    const handleOnChangeSwitch = ( event: React.ChangeEvent<HTMLInputElement> ) => {
        const isChecked = event.target.checked

        if ( isChecked ){
            onChangeHemisphere('southern-hemisphere')
        } else {
            onChangeHemisphere('northern-hemisphere')
        }
    }

    return (
        <>
            <h1 className="form-title"> Control Points </h1>
            <form id="form-control-points" className={`form-scroll ${isCalculating ? 'disabled' : ''}`}>
                <div className="form-base-2">
                    <div className="input-container-2">
                        <button className={`wizard-button me-1 button-rectification-3d ${ipcam.importedPoints !== undefined ? "wizard-button-active" : ""}`} id="import-points" type="button" onClick={handleOnClickImport} > Import Points </button>
                        <button className={`wizard-button button-rectification-3d ${ipcam.imagesPath !== undefined ? "wizard-button-active" : ""}`} id="import-images" type="button" onClick={handleOnClickImport}> Import Images </button>
                    </div>

                    <div style={{width: '100%'}}>
                        <IpcamGrid/>
                    </div>
                    <PointsMap/>

                    <div className={`switch-container-2 ${cameraSolution === undefined ? 'mt-1' : 'mt'}`}>
                        <h3 className="field-title"> Northern | Southern </h3>
                        <label className="switch">
                            <input type="checkbox" defaultChecked={ hemisphere === 'southern-hemisphere' } id="northern-southern-switch" onChange={handleOnChangeSwitch}/>
                            <span className="slider"></span>
                        </label>
                    </div>

                    <div className="input-container-2 mt-1">
                        <button 
                            className={`wizard-button me-1 button-rectification-3d ${cameraSolution?.mode === 'direct-solve' || mode === 'direct-solve' ? 'wizard-button-active' : '' }`} 
                            id="direct-solve" 
                            type="button" 
                            onClick={handleOnClickAction}
                            disabled={ipcam.importedPoints === undefined}
                            > Direct Solve </button>
                        <button 
                            className={`wizard-button button-rectification-3d ${cameraSolution === undefined ? 'mb-2' : ''} ${cameraSolution?.mode === 'optimize-solution' || mode === 'optimize-solution' ? 'wizard-button-active' : '' }`} 
                            id="optimize-solution" 
                            type="button" 
                            onClick={handleOnClickAction}
                            disabled={ipcam.importedPoints === undefined}
                            > Optimize </button>
                    </div>
                    
                    {
                        cameraSolution && (
                            <div className="form-video-extra-info mt-1 mb-2">
                                <div className="form-video-extra-info-row">
                                    <p> Reprojection Error:  </p>
                                    <p> {cameraSolution.meanError.toFixed(2)}px</p>
                                </div>
                                <div className="form-video-extra-info-row">
                                    <p> Number Of Points:  </p>
                                    <p> {cameraSolution.numPoints} </p>
                                </div>
                                <div className="form-video-extra-info-row mb-2">
                                    <p> Camera Height:  </p>
                                    <p> {cameraSolution.cameraPosition[2].toFixed(2)} </p>
                                </div>
                            </div>
                        )
                    }
                    

                </div>
            </form>
        </>
    )
}