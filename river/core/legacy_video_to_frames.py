import cv2
import os
import time
import cv2

def video_to_frames(input_loc, output_loc, start_frame_number, end_frame_number, frame_skip_index):
    """Function to extract frames from input video file
           and save them as separate frames in an output directory.

           Args:
               input_loc: Input video file.
               output_loc: Output directory to save the frames.
               start_frame_number: starting frame (zero-based indexing!)
               end_frame_number: ending frame (zero-based indexing!)
               frame_skip_index: number of frames to skip in extraction step
           Returns:
               None
           """
    try:
        os.mkdir(output_loc)
    except OSError:
        pass
    # Log the time
    time_start = time.time()
    # Start capturing the feed
    cap = cv2.VideoCapture(input_loc)
    # Find the number of frames
    num_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    # num_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) - 1
    frame_rate = cap.get(cv2.CAP_PROP_FPS)
    video_time = num_frames / frame_rate
    video_delta_time = (1 / frame_rate) * 1000

    if end_frame_number <= 0 or end_frame_number > num_frames:
        end_frame_number = num_frames
        new_num_frames = num_frames
    else:
        new_num_frames = end_frame_number
    if start_frame_number < 0:
        start_frame_number = 0
    elif start_frame_number >= end_frame_number:
        start_frame_number = end_frame_number - 1

    new_video_delta_time = video_delta_time * frame_skip_index
    new_frame_rate = 1000 / new_video_delta_time
    sample_num_frames = int((new_num_frames + 1 - start_frame_number) / frame_skip_index)
    count = start_frame_number

    print("Extracting frames from video...\n")
    # Start converting the video
    cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame_number)
    while cap.isOpened():
        # Extract the frame
        ret, frame = cap.read()
        # Write the results back to output location.
        cv2.imwrite(output_loc + "/%#05d.jpg" % (count + 1), frame)
        count = count + frame_skip_index
        cap.set(cv2.CAP_PROP_POS_FRAMES, count)

        # If there are no more frames left
        if (count > (new_num_frames - 1)):
            # Log the time again
            time_end = time.time()
            # Release the feed
            cap.release()
            # Print stats
            sample_num_frames = int((count - start_frame_number) / frame_skip_index)
            break
    return start_frame_number, end_frame_number, num_frames, frame_rate, video_time, video_delta_time, \
           new_frame_rate, new_video_delta_time, sample_num_frames
