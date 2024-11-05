import { SetStateAction } from "react"


interface CarouselSettings {
    className: string;
    centerMode: boolean;
    slidesToShow: number;
    slidesToScroll: number;
    speed: number;
    focusOnSelect: boolean;
    initialSlide: number;
    infinite: boolean;
    afterChange: () => void;
    beforeChange: (current: number, next: number) => void;
    responsive: ResponsiveSetting[];
}

interface ResponsiveSetting {
    breakpoint: number;
    settings: {
        slidesToShow: number;
        slidesToScroll: number;
    };
}

export const carouselSettings = (
    updateCount: number,
    setUpdateCount: React.Dispatch<SetStateAction<number>>,
    setSlideIndex: React.Dispatch<SetStateAction<number>>,
): CarouselSettings => {
    const settings = {
        className: "center",
        slidesToShow: 4.25,
        slidesToScroll: 10,
        speed: 200,
        focusOnSelect: true,
        initialSlide: 1,
        infinite: true,
        afterChange: () => setUpdateCount(updateCount + 1),
        beforeChange: (_current, next) => setSlideIndex(next),
        responsive: [
            {
                breakpoint: 1180,
                settings: {
                    slidesToShow: 1.75,
                    slidesToScroll: 5,
                }
            },
            {
                breakpoint: 1230,
                settings: {
                    slidesToShow: 2,
                    slidesToScroll: 5,
                }
            },
            {
                breakpoint: 1315,
                settings: {
                    slidesToShow: 2.25,
                    slidesToScroll: 5,
                }
            },
            {
                breakpoint: 1390,
                settings: {
                    slidesToShow: 2.5,
                    slidesToScroll: 5,
                }
            },
            {
                breakpoint: 1500,
                settings: {
                    slidesToShow: 2.75,
                    slidesToScroll: 5
                }
            },
            {
                breakpoint: 1570,
                settings: {
                    slidesToShow: 3,
                    slidesToScroll: 10,
                }
            },
            {
                breakpoint: 1630,
                settings: {
                    slidesToShow: 3.25,
                    slidesToScroll: 10
                }
            },
            {
                breakpoint: 1715,
                settings: {
                    slidesToShow: 3.5,
                    slidesToScroll: 10
                }
            },
            {
                breakpoint: 1810,
                settings: {
                    slidesToShow: 3.75,
                    slidesToScroll: 10
                }
            },
            {
                breakpoint: 1900,
                settings: {
                    slidesToShow: 4,
                    slidesToScroll: 10
                }
            }
        ]
    };

    return settings;
};