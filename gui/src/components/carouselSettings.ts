import { SetStateAction } from "react"


interface CarouselSettings {
    className: string;
    centerMode: boolean;
    slidesToShow: number;
    slidesToScroll: number;
    speed: number;
    focusOnSelect: boolean;
    lazyLoad: boolean;
    initialSlide: number;
    infinite: boolean;
    swipeToSlide: boolean;
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
    setSlideIndex: React.Dispatch<SetStateAction<number>>
): CarouselSettings => {
    return {
        className: "center",
        centerMode: true,
        slidesToShow: 4.25,
        slidesToScroll: 1,
        speed: 200,
        focusOnSelect: true,
        lazyLoad: true,
        initialSlide: 0,
        infinite:true,
        swipeToSlide: true,
        afterChange: () => setUpdateCount(updateCount + 1),
        beforeChange: (_current, next) => setSlideIndex(next),
        responsive: [
                {
                    breakpoint: 1180,
                    settings: {
                        slidesToShow: 1.75,
                        slidesToScroll: 1,
                    }
                },
                {
                    breakpoint: 1230,
                    settings: {
                        slidesToShow: 2,
                        slidesToScroll: 1,
                    }
                },
                {
                    breakpoint: 1315,
                    settings: {
                        slidesToShow: 2.25,
                        slidesToScroll: 1,
                    }
                },
                {
                    breakpoint: 1390,
                    settings: {
                        slidesToShow: 2.5,
                        slidesToScroll: 1,
                    }
                },
                {
                    breakpoint: 1500,
                    settings: {
                    slidesToShow: 2.75,
                    slidesToScroll: 1
                    }
                },
                {
                breakpoint: 1570,
                settings: {
                    slidesToShow: 3,
                    slidesToScroll: 1,
                }
                },
                {
                    breakpoint: 1630,
                    settings: {
                    slidesToShow: 3.25,
                    slidesToScroll: 1
                    }
                },
                {
                breakpoint: 1715,
                settings: {
                    slidesToShow: 3.5,
                    slidesToScroll: 1
                }
                },
                {
                    breakpoint: 1810,
                    settings: {
                    slidesToShow: 3.75,
                    slidesToScroll: 1
                    }
                },

                {
                    breakpoint: 1900,
                    settings: {
                    slidesToShow: 4,
                    slidesToScroll: 1
                    }
                }
        ]
    }
}


    // const settings = {
    //     className: 'center',
    //     centerMode: true,
    //     slidesToShow: 4.25,
    //     slidesToScroll: 1,
    //     speed: 200,
    //     focusOnSelect: true,
    //     lazyLoad: true,
    //     infinite:true,
    //     afterChange: () => setUpdateCount(updateCount + 1),
    //     beforeChange: (_current, next) => setSlideIndex(next),
    //     initialSlide: 0,
    //     responsive: [
    //         {
    //             breakpoint: 1180,
    //             settings: {
    //                 slidesToShow: 1.75,
    //                 slidesToScroll: 1,
    //             }
    //         },
    //         {
    //             breakpoint: 1230,
    //             settings: {
    //                 slidesToShow: 2,
    //                 slidesToScroll: 1,
    //             }
    //         },
    //         {
    //             breakpoint: 1315,
    //             settings: {
    //                 slidesToShow: 2.25,
    //                 slidesToScroll: 1,
    //             }
    //         },
    //         {
    //             breakpoint: 1390,
    //             settings: {
    //                 slidesToShow: 2.5,
    //                 slidesToScroll: 1,
    //             }
    //         },
    //         {
    //             breakpoint: 1500,
    //             settings: {
    //               slidesToShow: 2.75,
    //               slidesToScroll: 1
    //             }
    //         },
    //         {
    //           breakpoint: 1570,
    //           settings: {
    //             slidesToShow: 3,
    //             slidesToScroll: 1,
    //           }
    //         },
    //         {
    //             breakpoint: 1630,
    //             settings: {
    //               slidesToShow: 3.25,
    //               slidesToScroll: 1
    //             }
    //         },
    //         {
    //           breakpoint: 1715,
    //           settings: {
    //             slidesToShow: 3.5,
    //             slidesToScroll: 1
    //           }
    //         },
    //         {
    //             breakpoint: 1810,
    //             settings: {
    //               slidesToShow: 3.75,
    //               slidesToScroll: 1
    //             }
    //         },

    //         {
    //             breakpoint: 1900,
    //             settings: {
    //               slidesToShow: 4,
    //               slidesToScroll: 1
    //             }
    //           }
    //       ]        
    // }
