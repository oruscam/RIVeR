import { useState, useEffect } from 'react'
import Papa from 'papaparse'
import { Line } from 'react-chartjs-2'
import './components.css'
import annotationPlugin from 'chartjs-plugin-annotation';

import { Chart as ChartJS,
        CategoryScale, 
        LinearScale, 
        PointElement, 
        LineElement, 
        Title, 
        Tooltip, 
        Legend, 
        Filler
    } from 'chart.js';
import { useDataSlice } from '../hooks';
import options from './bathimetry.options';
import getBathimetryLimits from '../helpers/getBathimetryLimits';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, annotationPlugin);

type Bathimetry = {
    blob: Blob | string,
    path: string
    level: number;
};


export const Bathimetry = ({ setBathimetryLimits }: { setBathimetryLimits: (limits: { min: number, max: number }) => void }) => {
    const {sections, activeSection} = useDataSlice()
    const { blob, level } = sections[activeSection].bathimetry as Bathimetry;
    
    const [chartData, setChartData] = useState({
        labels: [] as number[],
        datasets: [
            {
                data: [] as number[], // Provide an initial value of number[] type
                borderColor: 'rgba(255,255,255,0.9)',
                borderWidth: 1,
                pointRadius: 0,
                fill: {
                    above: "transparent",
                    below: "rgba(70, 70, 70,1)",
                    value: level
                },
            },
        ],
    });

    useEffect(() => {
        if( blob !== ''){
            Papa.parse(blob, {
                download: true,
                header: true,
                complete: function(results: any) {
                const data = getBathimetryLimits(results.data)
                setBathimetryLimits({min: data.min, max: data.max})
                setChartData({
                    labels: data.stations,
                    datasets: [
                    {
                        ...chartData.datasets[0],
                        data: data.stages,
                        fill: {
                            above: "transparent",
                            below: "rgba(70, 70, 70,1)",
                            value: data.max
                        },  
                    },
                    ],
                });
                },
            });            
        }

    }, [blob]);

    // * Cuando cambia el level, debe crear el mismo grafico pero con el nuevo level
    useEffect(() => {
        if( chartData.labels.length !== 0){
        setChartData({...chartData, datasets: [{...chartData.datasets[0], fill: {...chartData.datasets[0].fill, value: level}}]})
    }
    }, [level])

  return (
    <div className='chart-cross-sections-container'>
        {
            blob !== '' ? (
                <Line data={chartData} options={options}/>
            ) : null
        }
    </div>
  )
}
