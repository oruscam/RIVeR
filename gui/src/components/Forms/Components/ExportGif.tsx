import { useState } from "react";
import { useDataSlice, useProjectSlice } from "../../../hooks"

export const ExportGif = ({ disabled }: {disabled: boolean}) => {
    const { onExportGif, isBackendWorking } = useDataSlice();
    const { video } = useProjectSlice();
    const { width, height, fps } = video.data;
    const { factor, step } = video.parameters;

    const [path, setPath] = useState('')
    const [time, setTime] = useState('')
    const [isCreatingGif, setIsCreatingGif] = useState<boolean>(false);

    const originalWidth = width * factor;
    const originalHeight = height * factor;

    const onClickExportGif = () => {
        if (isCreatingGif) return;
        const resolution = document.getElementById('resolution-gif') as HTMLSelectElement;

        setIsCreatingGif(true);

        onExportGif({
            image: {
                width: originalWidth,
                height: originalHeight,
            },
            factor: parseFloat(resolution.value),
            fps: fps / step,
        }).then(({time, path}) => {
            setPath(path)
            setTime(time)
            setIsCreatingGif(false);
        }).catch((error) => {
            console.error('Error creating gif:', error);
            setIsCreatingGif(false);
        })   
    }

    return (
        <div className={disabled || isBackendWorking ? 'disabled' : ''}>
            <h2 className='form-subtitle only-one-item mt-2'>Export Gif</h2>
            <div className='input-container-2 mt-2'>
                <label className="read-only me-1" htmlFor="">
                    {' '}
                    Resolution
                </label>
                <select
                    className="input-field input-field-select"
                    id="resolution-gif"
                    // onChange={handleOnChangeSelect}
                >
                    <option value="1">{originalWidth}x{originalHeight}</option>
                    <option value="0.75">{originalWidth * 0.75}x{originalHeight * 0.75}</option>
                    <option value="0.50" selected>{originalWidth * 0.5}x{originalHeight * 0.5}</option>
                    <option value="0.25">{originalWidth * 0.25}x{originalHeight * 0.25}</option>
                </select>
            </div>

            <p className="mt-2">PROVISIONAL</p>
            <p>Path: {path}</p>
            <p>Time: {time} ms</p>

            <div className='input-container-2 mt-2'>
                <button
                    className={`button-with-loader form-button me-1 ${isCreatingGif ? 'button-with-loader-active' : ''}`}
                    onClick={onClickExportGif}
                >
                  <p className="button-name"> Create Gif </p>
                  {isCreatingGif && <span className="loader-little"></span>}
                </button>
            </div>
        </div>
    )
}