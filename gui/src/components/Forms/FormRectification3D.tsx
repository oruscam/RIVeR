import { useMatrixSlice, useUiSlice } from "../../hooks"
import { IpcamGrid } from "../index";
import { PointsMap } from "../Graphs/index";

export const FormRectification3D = () => {
    const { onGetPoints, onGetImages, onCalculate3dRectification } = useMatrixSlice();
    const { onSetErrorMessage } = useUiSlice();

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

        onCalculate3dRectification(id)
    }


    return (
        <>
            <h1 className="form-title"> Control Points </h1>
            <form id="form-control-points" className="form-scroll">
                <div className="form-base-2">
                    <div className="input-container-2">
                        <button className="wizard-button me-1 button-rectification-3d" id="import-points" type="button" onClick={handleOnClickImport} > Import Points </button>
                        <button className="wizard-button button-rectification-3d" id="import-images" type="button" onClick={handleOnClickImport}> Import Images </button>
                    </div>
                
                    <IpcamGrid/>
                    <PointsMap/>

                    <div className="input-container-2 mt-1">
                        <button className="wizard-button me-1 button-rectification-3d" id="direct-solve" type="button" onClick={handleOnClickAction}> Direct Solve </button>
                        <button className="wizard-button button-rectification-3d" id="optimize" type="button" onClick={handleOnClickAction}> Optimize </button>
                    </div>

                    <div className="form-video-extra-info mt-1">
                        <div className="form-video-extra-info-row">
                            <p> Reprojection Error:  </p>
                            <p> 18.47 px</p>
                        </div>
                        <div className="form-video-extra-info-row">
                            <p> Number Of Points:  </p>
                            <p> 17 </p>
                        </div>
                        <div className="form-video-extra-info-row mb-2">
                            <p> Camera Height:  </p>
                            <p> 123.4 </p>
                        </div>
                    </div>

                    {/* <Rectification3DFormImage/> */}
                </div>
            </form>
        </>
    )
}