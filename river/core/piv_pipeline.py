import multiprocessing
import time
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from tqdm import tqdm

import river.core.image_preprocessing as impp
from river.core.exceptions import ImageReadError
from river.core.piv_fftmulti import piv_fftmulti
from river.core.piv_loop import piv_loop

def run_single_pair(args):
    from river.core.piv_loop import piv_loop
    return piv_loop(*args)

def run_test(
    image_1: Path,
    image_2: Path,
    mask: np.ndarray = None,
    bbox: list = None,
    interrogation_area_1: int = 128,
    interrogation_area_2: int = None,
    mask_auto: bool = True,
    multipass: bool = True,
    standard_filter: bool = True,
    standard_threshold: int = 4,
    median_test_filter: bool = True,
    epsilon: float = 0.02,
    threshold: int = 2,
    step: int = None,
    filter_grayscale: bool = True,
    filter_clahe: bool = True,
    clip_limit_clahe: int = 5,
    filter_sub_background: bool = False,
    save_background: bool = True,
    workdir: Path = None,
):
    background = None

    if filter_sub_background:
        filter_grayscale = True
        background_path = (workdir or image_1.parent).joinpath("background.jpg")

        if background_path.exists():
            background = cv2.imread(str(background_path), cv2.IMREAD_GRAYSCALE)
        else:
            background = impp.calculate_average(image_1.parent)
            if save_background and background is not None:
                save_path = background_path
                save_path.parent.mkdir(parents=True, exist_ok=True)
                cv2.imwrite(str(save_path), background)

    image_1 = impp.preprocess_image(
        image_1, filter_grayscale, filter_clahe, clip_limit_clahe, filter_sub_background, background
    )
    image_2 = impp.preprocess_image(
        image_2, filter_grayscale, filter_clahe, clip_limit_clahe, filter_sub_background, background
    )

    if mask is None:
        mask = np.ones(image_1.shape, dtype=np.uint8)

    mask_piv = np.ones(image_1.shape, dtype=np.uint8)

    if bbox is None:
        height, width = image_1.shape[:2]
        bbox = [0, 0, width, height]

    xtable, ytable, utable, vtable, typevector, _ = piv_fftmulti(
        image_1,
        image_2,
        mask=mask_piv,
        bbox=bbox,
        interrogation_area_1=interrogation_area_1,
        interrogation_area_2=interrogation_area_2,
        mask_auto=mask_auto,
        multipass=multipass,
        standard_filter=standard_filter,
        standard_threshold=standard_threshold,
        median_test_filter=median_test_filter,
        epsilon=epsilon,
        threshold=threshold,
        step=step,
    )

    x_indices = np.clip(xtable.astype(int), 0, mask.shape[1] - 1)
    y_indices = np.clip(ytable.astype(int), 0, mask.shape[0] - 1)
    in_mask = mask[y_indices, x_indices] > 0

    utable[~in_mask] = np.nan
    vtable[~in_mask] = np.nan

    return {
        "shape": xtable.shape,
        "x": xtable.flatten().tolist(),
        "y": ytable.flatten().tolist(),
        "u": utable.flatten().tolist(),
        "v": vtable.flatten().tolist(),
    }

def run_analyze_all(
    images_location: Path,
    mask: Optional[np.ndarray] = None,
    bbox: Optional[list] = None,
    interrogation_area_1: int = 128,
    interrogation_area_2: Optional[int] = None,
    mask_auto: bool = True,
    multipass: bool = True,
    standard_filter: bool = True,
    standard_threshold: int = 4,
    median_test_filter: bool = True,
    epsilon: float = 0.02,
    threshold: int = 2,
    step: Optional[int] = None,
    filter_grayscale: bool = True,
    filter_clahe: bool = True,
    clip_limit_clahe: int = 5,
    filter_sub_background: bool = False,
    save_background: bool = True,
    workdir: Optional[Path] = None,
) -> dict:
    background = None
    images = sorted([str(f) for f in images_location.glob("*.jpg")])
    total_frames = len(images)

    if total_frames == 0:
        raise ImageReadError(f"No JPG images found in {images_location}")

    print(f"Processing {total_frames} frames...")

    max_workers = min(8, multiprocessing.cpu_count())

    first_image = cv2.imread(images[0], cv2.IMREAD_GRAYSCALE)
    if first_image is None:
        raise ImageReadError(f"Could not read first image: {images[0]}")

    if mask is None:
        mask = np.ones(first_image.shape, dtype=np.uint8)

    if bbox is None:
        height, width = first_image.shape[:2]
        bbox = [0, 0, width, height]

    if filter_sub_background:
        filter_grayscale = True
        background_path = (workdir or images_location).joinpath("background.jpg")
        if background_path.exists():
            background = cv2.imread(str(background_path), cv2.IMREAD_GRAYSCALE)
        else:
            background = impp.calculate_average(images_location)
            if save_background and background is not None:
                cv2.imwrite(str(background_path), background)

    test_result = piv_loop(
        images, mask, bbox, interrogation_area_1, interrogation_area_2,
        mask_auto, multipass, standard_filter, standard_threshold, median_test_filter,
        epsilon, threshold, step, filter_grayscale, filter_clahe, clip_limit_clahe,
        filter_sub_background, background, 0, 1
    )

    expected_size = len(test_result["u"])
    xtable = np.array(test_result["x"])
    ytable = np.array(test_result["y"])
    shape = xtable.shape

    chunk_pairs = [(i, i + 1) for i in range(len(images) - 1)]
    arg_list = [
        (
            images, mask, bbox, interrogation_area_1, interrogation_area_2,
            mask_auto, multipass, standard_filter, standard_threshold, median_test_filter,
            epsilon, threshold, step, filter_grayscale, filter_clahe, clip_limit_clahe,
            filter_sub_background, background, i, j
        )
        for i, j in chunk_pairs
    ]

    dict_cumul = {
        "u": np.zeros((expected_size, 0)),
        "v": np.zeros((expected_size, 0)),
        "typevector": np.zeros((expected_size, 0)),
        "gradient": np.zeros((expected_size, 0)),
    }

    successful_pairs = []
    failed_pairs = []
    pbar = tqdm(total=len(chunk_pairs), desc="Processing image pairs")
    start_time = time.time()

    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        futures = executor.map(run_single_pair, arg_list)
        for f, result in enumerate(futures):
            img1 = Path(images[chunk_pairs[f][0]]).name
            img2 = Path(images[chunk_pairs[f][1]]).name
            try:
                if not isinstance(result, dict) or "u" not in result or len(result["u"]) != expected_size:
                    failed_pairs.append((img1, img2))
                    continue

                dict_cumul["u"] = np.hstack((dict_cumul["u"], result["u"]))
                dict_cumul["v"] = np.hstack((dict_cumul["v"], result["v"]))
                dict_cumul["typevector"] = np.hstack((dict_cumul["typevector"], result.get("typevector", np.full((expected_size, 1), np.nan))))
                dict_cumul["gradient"] = np.hstack((dict_cumul["gradient"], result.get("gradient", np.full((expected_size, 1), np.nan))))

                successful_pairs.append((img1, img2))
                pbar.update(1)
                elapsed = time.time() - start_time
                eta = (elapsed / (f + 1)) * (len(chunk_pairs) - (f + 1))
                pbar.set_postfix(ETA=f"{eta:.1f}s")

            except Exception:
                failed_pairs.append((img1, img2))

    pbar.close()

    u_median = np.nanmedian(dict_cumul["u"], axis=1)
    v_median = np.nanmedian(dict_cumul["v"], axis=1)

    return {
        "shape": shape,
        "x": xtable.tolist(),
        "y": ytable.tolist(),
        "u_median": u_median.tolist(),
        "v_median": v_median.tolist(),
        "u": dict_cumul["u"].T.tolist(),
        "v": dict_cumul["v"].T.tolist(),
        "gradient": dict_cumul["gradient"].T.tolist(),
    }
