import {useState, useEffect, act} from 'react'
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
import { useUiSlice } from '../hooks';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler,annotationPlugin);

export const ChartCrossSection = () => {
    const {sections, activeSection} = useUiSlice()
    const { bathimetryFile, level } = sections[activeSection].bathimetry
    const [chartData, setChartData] = useState({
        labels: [],
        datasets: [
            {
                data: [],
                borderColor: 'rgba(255,255,255,0.9)',
                borderWidth: 1,
                pointRadius: 0,
                fill: {
                    above: "transparent",
                    below: "rgba(70, 70, 70,1)",
                    value: level
                }
            },
        ],
    });
                    
    const options = {
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            annotation: {
                annotations: {
                    line1: { // Puedes nombrar tu anotación como desees
                        type: 'line',
                        yMin: level,
                        yMax: level,
                        borderColor: 'rgba(255,255,255,0.9)', // Color del relleno
                        borderWidth: 2,
                    }
                }
            }
        },
        scales: {
            x:{
                title: {
                    display: true,
                    text: 'Station',
                    color: 'rgba(255,255,255, 0.9)'

                },
                ticks: {
                    maxTicksLimit: 6,
                },
                grid: {
                    display: true,
                    color: 'rgba(255,255,255,0.1)'
                }, 
                
            },
            y:{
                title: {
                    display: true,
                    text: 'Level',
                    color: 'rgba(255,255,255, 0.9)'
                },
                ticks: {
                    maxTicksLimit: 6,
                },
                grid: {
                    display: true,
                    color: 'rgba(255,255,255,0.1)'
                }
            },
            },
            elements: {
                line: {
                    fill: 'end', // O 'end', dependiendo de la dirección del relleno
                }
            }
        }

    useEffect(() => {
        if(bathimetryFile){
            Papa.parse(bathimetryFile, {
                download: true,
                header: true,
                complete: function(results: any) {
                const data = results.data.filter((d: {station: string, stage: string}) => parseFloat(d.stage));  
                setChartData({
                    labels: data.map((d: {station: string, stage: string}) => parseFloat(d.station).toFixed()),
                    datasets: [
                    {
                        ...chartData.datasets[0],
                        data: data.map((d: {station: string, stage: string}) => d.stage),
                        fill: {
                            above: "transparent",
                            below: "rgba(70, 70, 70,1)",
                            value: level
                        }
                    },
                    ],
                });
                },
            });

        }
    }, [bathimetryFile, level]);

  return (
    <div className='chart-cross-sections-container'>
        {
            bathimetryFile? (
                <Line data={chartData} options={options}/>
            ) : (
                <div></div>
            )
        }
    </div>
  )
}
